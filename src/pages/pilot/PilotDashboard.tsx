import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Star, Ship, History, Users, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoogleMapView from '@/components/GoogleMapView';
import RideRequestCard from '@/components/RideRequestCard';
import NotificationPermissionBanner from '@/components/NotificationPermissionBanner';
import PilotDrawer from '@/components/layout/PilotDrawer';
import ProfileIncompleteModal from '@/components/ProfileIncompleteModal';
import { useApp } from '@/contexts/AppContext';
import { useNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { usePilotStats } from '@/hooks/usePilotStats';
import { usePilotGPS } from '@/hooks/usePilotGPS';
import { supabase } from '@/integrations/supabase/client';
import { DbRide, Ride } from '@/types';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { validatePilotProfile } from '@/utils/profileValidation';
import { getFriendlyErrorMessage } from '@/utils/retryOperation';
import { BOAT_CAPACITY } from '@/data/mockData';
import SimplixFooter from '@/components/SimplixFooter';
import Logo from '@/components/Logo';

const PilotDashboard = () => {
  const navigate = useNavigate();
  const { isPilotOnline, setIsPilotOnline } = useApp();
  const { pilotProfile, user } = useAuthContext();
  const [rides, setRides] = useState<Ride[]>([]);
  const [ridesLoading, setRidesLoading] = useState(true);
  // Pool: all active rides currently on the boat
  const [activeRides, setActiveRides] = useState<DbRide[]>([]);
  const [currentPassengers, setCurrentPassengers] = useState(0);
  const [showNotificationBanner, setShowNotificationBanner] = useState(() => {
    try { return localStorage.getItem('gamma_notif_banner_dismissed') !== '1'; } catch { return true; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const activeRidesRef = useRef<typeof activeRides>([]);
  const { permission, requestPermission, notifyNewRideRequest } = useNotifications();
  const { playNewRideSound } = useNotificationSound();
  // Stable refs so the realtime channel effect never re-subscribes due to these callbacks updating
  const playNewRideSoundRef = useRef(playNewRideSound);
  const notifyNewRideRequestRef = useRef(notifyNewRideRequest);
  useEffect(() => { playNewRideSoundRef.current = playNewRideSound; }, [playNewRideSound]);
  useEffect(() => { notifyNewRideRequestRef.current = notifyNewRideRequest; }, [notifyNewRideRequest]);
  const { stats, loading: statsLoading, pilotId } = usePilotStats();

  usePushNotifications(user?.id);

  const boatCapacity: number = Math.max(1, pilotProfile?.boat_capacity ?? BOAT_CAPACITY);
  const availableSeats = boatCapacity - currentPassengers;

  // GPS always active while online (pool: barco em movimento constante)
  usePilotGPS({ rideId: undefined, pilotId: pilotId || undefined, isActive: isPilotOnline });

  const dbRideToRide = useCallback((dbRide: DbRide): Ride => ({
    id: dbRide.id,
    passengerId: dbRide.passenger_device_id,
    passengerName: dbRide.passenger_name || 'Passageiro',
    passengerPhoto: '',
    pilotId: dbRide.pilot_id || undefined,
    origin: {
      id: dbRide.origin_pier_id || 'origin',
      name: dbRide.origin_name,
      address: dbRide.origin_address || '',
      coordinates: (dbRide.origin_lng != null && dbRide.origin_lat != null)
        ? [dbRide.origin_lng, dbRide.origin_lat]
        : [0, 0],
    },
    destination: {
      id: dbRide.destination_pier_id || 'destination',
      name: dbRide.destination_name || 'Destino',
      address: dbRide.destination_address || '',
      coordinates: (dbRide.destination_lng != null && dbRide.destination_lat != null)
        ? [dbRide.destination_lng, dbRide.destination_lat]
        : [0, 0],
    },
    status: dbRide.status,
    price: dbRide.price,
    estimatedTime: dbRide.estimated_time || 0,
    distance: 0,
    createdAt: new Date(dbRide.created_at),
    passengerCount: dbRide.passenger_count ?? 1,
    originPierId: dbRide.origin_pier_id || undefined,
    destinationPierId: dbRide.destination_pier_id || undefined,
  }), []);

  const fetchPendingRides = useCallback(async () => {
    setRidesLoading(true);
    // Only show rides created in the last 15 minutes to avoid stale requests
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('rides')
      .select('id, status, passenger_device_id, passenger_name, passenger_count, pilot_id, origin_name, origin_address, origin_lat, origin_lng, origin_pier_id, destination_name, destination_address, destination_lat, destination_lng, destination_pier_id, price, estimated_time, created_at')
      .eq('status', 'pending')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rides:', error);
      toast.error('Erro ao carregar corridas. Verifique sua conexão.');
      setRidesLoading(false);
      return;
    }

    if (data) {
      setRides(data.map((r) => dbRideToRide(r as DbRide)));
    }
    setRidesLoading(false);
  }, [dbRideToRide]);

  const fetchActiveRides = useCallback(async () => {
    if (!pilotId) return;
    const { data } = await supabase
      .from('rides')
      .select('id, status, passenger_name, passenger_count, origin_name, destination_name, accepted_at')
      .eq('pilot_id', pilotId)
      .in('status', ['accepted', 'pilot_arriving', 'in_progress'])
      .order('accepted_at', { ascending: true });

    if (data) {
      const dbRides = data as DbRide[];
      setActiveRides(dbRides);
      const total = dbRides.reduce((sum, r) => sum + (r.passenger_count ?? 1), 0);
      setCurrentPassengers(total);
    }
  }, [pilotId]);

  useEffect(() => {
    activeRidesRef.current = activeRides;
  }, [activeRides]);

  useEffect(() => {
    if (!pilotId) return;
    fetchActiveRides();
  }, [pilotId, fetchActiveRides]);

  useEffect(() => {
    if (!isPilotOnline) {
      setRides([]);
      return;
    }

    fetchPendingRides();

    const channel = supabase
      .channel(`pilot-rides-${pilotId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rides', filter: 'status=eq.pending' },
        (payload) => {
          const newRide = dbRideToRide(payload.new as DbRide);
          setRides((prev) => [newRide, ...prev]);
          playNewRideSoundRef.current();
          notifyNewRideRequestRef.current(newRide.passengerName, newRide.origin.name, newRide.price);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides' },
        (payload) => {
          const updatedRide = payload.new as DbRide;
          if (updatedRide.status !== 'pending') {
            setRides((prev) => prev.filter((r) => r.id !== updatedRide.id));
          }
          if (updatedRide.pilot_id === pilotId) {
            fetchActiveRides();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isPilotOnline, fetchPendingRides, dbRideToRide, pilotId, fetchActiveRides]);

  useEffect(() => {
    if (isPilotOnline && permission === 'default') {
      requestPermission();
    }
  }, [isPilotOnline, permission, requestPermission]);

  // Go offline when component unmounts only if no active rides
  // (prevents going offline while navigating to an active ride)
  useEffect(() => {
    return () => {
      if (activeRidesRef.current.length === 0) {
        setIsPilotOnline(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawerStats = useMemo(() => ({
    ridestoday: stats.ridesToday,
    earnings: stats.earnings,
    rating: stats.rating,
  }), [stats.ridesToday, stats.earnings, stats.rating]);

  const handleAcceptRide = async (rideId: string) => {
    if (acceptingRideId || !pilotId) {
      if (!pilotId) toast.error('Erro: ID do piloto não disponível');
      return;
    }

    const validation = validatePilotProfile(pilotProfile);
    if (!validation.isValid) {
      setMissingFields(validation.missingFields);
      setShowProfileModal(true);
      return;
    }

    // Client-side capacity guard (server enforces atomically too)
    const rideToAccept = rides.find((r) => r.id === rideId);
    const groupSize = rideToAccept?.passengerCount ?? 1;
    if (groupSize > availableSeats) {
      toast.error(`Sem espaço: ${availableSeats} lugar(es) disponível(is), grupo precisa de ${groupSize}`);
      return;
    }

    setAcceptingRideId(rideId);
    try {
      const { data, error } = await supabase.rpc('accept_pool_ride', {
        p_ride_id: rideId,
        p_pilot_id: pilotId,
        p_pilot_user_id: user?.id ?? null,
        p_pilot_name: pilotProfile?.full_name || 'Piloto',
        p_pilot_phone: pilotProfile?.phone || null,
      });

      if (error) {
        console.error('accept_pool_ride error:', error);
        toast.error(getFriendlyErrorMessage(error));
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        toast.error(result?.message || 'Corrida já foi aceita por outro piloto');
        setRides((prev) => prev.filter((r) => r.id !== rideId));
        return;
      }

      toast.success('Passageiro adicionado ao barco!');
      await fetchActiveRides();
      navigate(`/pilot/ride/${rideId}`);
    } catch (error) {
      console.error('Error accepting ride:', error);
      toast.error(getFriendlyErrorMessage(error));
    } finally {
      setAcceptingRideId(null);
    }
  };

  const handleRejectRide = (rideId: string) => {
    setRides((prev) => prev.filter((r) => r.id !== rideId));
    toast('Corrida recusada');
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      <PilotDrawer open={drawerOpen} onOpenChange={setDrawerOpen} stats={drawerStats} />

      {/* Header */}
      <header className="bg-primary text-primary-foreground safe-area-top">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="text-primary-foreground hover:bg-primary-foreground/10"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <button
            onClick={() => setIsPilotOnline(!isPilotOnline)}
            aria-label={isPilotOnline ? 'Ficar offline' : 'Ficar online'}
            aria-pressed={isPilotOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors cursor-pointer active:scale-95 ${
              isPilotOnline ? 'bg-success text-success-foreground' : 'bg-primary-foreground/20'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isPilotOnline ? 'bg-success-foreground animate-pulse' : 'bg-primary-foreground/50'}`} />
            <span className="text-sm font-semibold">{isPilotOnline ? 'Online' : 'Offline'}</span>
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/pilot/history')}
            className="text-primary-foreground hover:bg-primary-foreground/10"
            aria-label="Ver histórico"
          >
            <History className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex justify-center pb-2">
          <Logo size="sm" variant="white" />
        </div>

        <div className="flex items-center justify-around pb-4 px-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{statsLoading ? '-' : stats.ridesToday}</p>
            <p className="text-xs opacity-70">Corridas</p>
          </div>
          <div className="w-px h-8 bg-primary-foreground/20" />
          <div className="text-center">
            <p className="text-2xl font-bold">R${statsLoading ? '-' : stats.earnings.toFixed(0)}</p>
            <p className="text-xs opacity-70">Ganhos</p>
          </div>
          <div className="w-px h-8 bg-primary-foreground/20" />
          <div className="text-center flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <p className="text-2xl font-bold">{statsLoading ? '-' : stats.rating}</p>
          </div>
          {isPilotOnline && (
            <>
              <div className="w-px h-8 bg-primary-foreground/20" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="w-4 h-4" />
                  <p className="text-2xl font-bold">{currentPassengers}/{boatCapacity}</p>
                </div>
                <p className="text-xs opacity-70">No barco</p>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Approval status banner */}
      {pilotProfile && pilotProfile.approval_status !== 'approved' && (
        <div
          className={`px-4 py-3 flex items-center gap-3 cursor-pointer
            ${ pilotProfile.approval_status === 'under_review'
                ? 'bg-blue-500/10 border-b border-blue-500/20'
                : 'bg-orange-500/10 border-b border-orange-500/20'}`}
          onClick={() => navigate('/pilot/documents')}
        >
          { pilotProfile.approval_status === 'under_review'
            ? <Clock className="w-5 h-5 text-blue-500 shrink-0" />
            : <FileText className="w-5 h-5 text-orange-500 shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${ pilotProfile.approval_status === 'under_review' ? 'text-blue-600' : 'text-orange-600'}`}>
              { pilotProfile.approval_status === 'under_review'
                  ? 'Documentos em análise (até 24h)'
                  : pilotProfile.approval_status === 'rejected'
                    ? 'Cadastro reprovado — verifique os documentos'
                    : 'Complete seu cadastro enviando os documentos'}
            </p>
            <p className="text-xs text-muted-foreground">Toque para ver detalhes</p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-48 relative">
        <GoogleMapView showBoats={isPilotOnline} zoom={16} />
        {!isPilotOnline && (
          <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center">
            <Ship className="w-12 h-12 text-muted mb-2" />
            <p className="text-sm font-medium text-muted">Fique online para receber corridas</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pb-safe">
        {/* Active pool rides panel */}
        {activeRides.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">Passageiros no barco</h3>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {currentPassengers}/{boatCapacity} lugares
              </span>
            </div>
            <div className="space-y-2">
              {activeRides.map((ar) => (
                <button
                  key={ar.id}
                  onClick={() => navigate(`/pilot/ride/${ar.id}`)}
                  className="w-full bg-card border border-border rounded-xl p-3 flex items-center justify-between text-left active:bg-muted/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{ar.passenger_name || 'Passageiro'}</p>
                    <p className="text-xs text-muted truncate">{ar.origin_name} → {ar.destination_name}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <div className="flex items-center gap-1 text-muted">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs">{ar.passenger_count ?? 1}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ar.status === 'in_progress'
                        ? 'bg-success/15 text-success'
                        : ar.status === 'pilot_arriving'
                        ? 'bg-secondary/15 text-secondary'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {ar.status === 'in_progress' ? 'Em curso' : ar.status === 'pilot_arriving' ? 'Chegando' : 'Aceito'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pending requests */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">
            {isPilotOnline ? 'Solicitações' : 'Você está offline'}
          </h2>
          {isPilotOnline && rides.length > 0 && (
            <span className="text-xs text-muted">{rides.length} disponíveis</span>
          )}
        </div>

        {isPilotOnline && ridesLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted/10 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : isPilotOnline && rides.length > 0 ? (
          <div className="space-y-3">
            {rides.map((ride) => {
              const fits = (ride.passengerCount ?? 1) <= availableSeats;
              return (
                <div key={ride.id} className="relative">
                  {!fits && (
                    <div className="absolute -top-1 right-2 z-10 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                      Sem espaço ({ride.passengerCount} pax)
                    </div>
                  )}
                  <RideRequestCard
                    ride={ride}
                    onAccept={() => handleAcceptRide(ride.id)}
                    onReject={() => handleRejectRide(ride.id)}
                    isAccepting={acceptingRideId === ride.id}
                  />
                </div>
              );
            })}
          </div>
        ) : isPilotOnline ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Ship className="w-8 h-8 text-muted" />
            </div>
            <p className="text-muted font-medium">Aguardando novas solicitações...</p>
            <p className="text-xs text-muted/70 mt-1">Você receberá uma notificação</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted text-sm">Ative o modo online para começar a receber corridas</p>
          </div>
        )}
        <SimplixFooter />
      </div>

      {showNotificationBanner && isPilotOnline && (
        <NotificationPermissionBanner onClose={() => setShowNotificationBanner(false)} />
      )}

      <ProfileIncompleteModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onGoToProfile={() => {
          setShowProfileModal(false);
          navigate('/pilot/profile');
        }}
        missingFields={missingFields}
        userType="pilot"
      />
    </div>
  );
};

export default PilotDashboard;
