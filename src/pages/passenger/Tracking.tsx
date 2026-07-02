import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Share2, CreditCard, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import GoogleMapView, { RouteInfo } from '@/components/GoogleMapView';
import PilotCard from '@/components/PilotCard';
import RideChat from '@/components/RideChat';
import RideStatusBanner, { RidePhase } from '@/components/RideStatusBanner';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DbRide } from '@/types';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { format, addMinutes } from 'date-fns';
import { getCurrentRide } from '@/services/rideService';

const Tracking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const {
    currentPilot,
    origin,
    destination,
    setOrigin,
    setDestination,
    calculatePrice,
    setRideStatus
  } = useApp();
  
  const [localPilotData, setLocalPilotData] = useState<{ id: string; name: string; photo: string; rating: number; boat: string; boatType?: string; boatColor?: string; phone: string } | null>(null);
  const [pilotPosition, setPilotPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentRide, setCurrentRide] = useState<DbRide | null>(null);
  const [proximityNotifications, setProximityNotifications] = useState({
    notified500m: false,
    notified200m: false,
    notified100m: false,
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loadingRide, setLoadingRide] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { playSound } = useNotificationSound();
  const { notifyPilotArrived } = useNotifications();
  // Deduplication: only fire status-change side-effects once per status value
  const handledStatusRef = useRef<string>('');
  // Deduplication: only navigate once for each terminal status
  const navigatedStatusRef = useRef<string>('');

  const handleNewMessage = useCallback(() => {
    if (!isChatOpen) {
      setUnreadMessages((prev) => prev + 1);
      playSound();
    }
  }, [isChatOpen, playSound]);
  
  // Route info from Google Directions API (distances in meters, durations in seconds)
  const [routeInfo, setRouteInfo] = useState({
    pilotToOrigin: { distanceMeters: 0, durationSeconds: 0 },
    originToDestination: { distanceMeters: 0, durationSeconds: 0 },
  });

  const handleRouteInfo = useCallback((info: RouteInfo) => {
    setRouteInfo(info);
    const dist = info.pilotToOrigin.distanceMeters;
    if (dist > 0 && dist <= 500) {
      setProximityNotifications((prev) => {
        if (!prev.notified500m) {
          toast.info("Piloto a 500m", { description: "Seu piloto está se aproximando", duration: 5000 });
          return { ...prev, notified500m: true };
        }
        return prev;
      });
    }
    if (dist > 0 && dist <= 200) {
      setProximityNotifications((prev) => {
        if (!prev.notified200m) {
          playSound();
          toast.success("Piloto a 200m!", { description: "Prepare-se para embarcar", duration: 8000 });
          return { ...prev, notified200m: true };
        }
        return prev;
      });
    }
    if (dist > 0 && dist <= 100) {
      setProximityNotifications((prev) => {
        if (!prev.notified100m) {
          playSound();
          notifyPilotArrived(currentPilot?.name || "Piloto", origin?.name || "embarque");
          toast.success("Piloto chegando!", { description: "Menos de 100m - Dirija-se ao ponto de embarque!", duration: 10000 });
          return { ...prev, notified100m: true };
        }
        return prev;
      });
    }
  }, [playSound, notifyPilotArrived, currentPilot, origin]);

  // ETA calculada pela Google Directions API (tempo em segundos)
  const pilotToOriginMinutes = Math.max(1, Math.round(routeInfo.pilotToOrigin.durationSeconds / 60));
  const originToDestMinutes = Math.max(1, Math.round(routeInfo.originToDestination.durationSeconds / 60));
  const totalMinutes = pilotToOriginMinutes + originToDestMinutes;

  const etaEmbark = useMemo(() => {
    return format(addMinutes(new Date(), pilotToOriginMinutes), 'HH:mm');
  }, [pilotToOriginMinutes]);

  const etaDestination = useMemo(() => {
    return format(addMinutes(new Date(), totalMinutes), 'HH:mm');
  }, [totalMinutes]);



  const initialRideId = (location.state as any)?.rideId as string | undefined;
  const [rideId, setRideId] = useState<string | null>(initialRideId || null);

  // Ensure we always have a rideId (handles page refresh / direct access)
  useEffect(() => {
    if (!rideId && user?.id) {
      getCurrentRide(user.id)
        .then((ride) => {
          if (ride) {
            setRideId(ride.id);
          } else {
            toast.error('Corrida não encontrada.');
            navigate('/passenger');
          }
        })
        .catch(() => {
          toast.error('Erro ao carregar corrida. Verifique sua conexão.');
          navigate('/passenger');
        });
    }
  }, [rideId, user?.id, navigate]);

  // Persist last-seen status across polling ticks (ref so it doesn't cause re-renders)
  const lastStatusRef = useRef('');

  // Fetch ride and subscribe to updates
  useEffect(() => {
    if (!rideId) return;

    // handleStatusChange must be defined inside the effect so it closes over
    // the latest rideId. handledStatusRef deduplicates across polling + realtime.
    const handleStatusChange = (status: string) => {
      if (handledStatusRef.current === status) return;
      handledStatusRef.current = status;

      if (status === 'pilot_arriving') {
        playSound();
        toast.success('Piloto chegou ao embarque!');
        setRideStatus('arriving');
      } else if (status === 'in_progress') {
        playSound();
        toast.success('Viagem iniciada!');
        navigate('/passenger/in-ride', { state: { rideId } });
      } else if (status === 'completed') {
        navigate('/passenger/completed', { state: { rideId } });
      } else if (status === 'cancelled') {
        toast.error('Corrida cancelada');
        navigate('/passenger');
      }
    };

    const fetchRide = async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('id, status, pilot_id, pilot_name, pilot_phone, pilot_lat, pilot_lng, origin_name, origin_address, origin_lat, origin_lng, origin_pier_id, destination_name, destination_address, destination_lat, destination_lng, destination_pier_id, price, estimated_time, created_at, payment_status')
        .eq('id', rideId)
        .single();

      if (error) {
        console.error('[Tracking] fetchRide error:', error);
        setLoadingRide(false);
        return;
      }

      if (data) {
        const ride = data as DbRide;
        setCurrentRide(ride);
        setLoadingRide(false);
        if (ride.pilot_lat && ride.pilot_lng) {
          setPilotPosition({ lat: ride.pilot_lat, lng: ride.pilot_lng });
        }

        // Restore origin/destination if lost after page refresh
        if (!origin && ride.origin_name) {
          setOrigin({ id: ride.origin_pier_id || 'origin', name: ride.origin_name, address: ride.origin_address || '', coordinates: [ride.origin_lng, ride.origin_lat] });
        }
        if (!destination && ride.destination_name) {
          setDestination({ id: ride.destination_pier_id || 'destination', name: ride.destination_name || '', address: ride.destination_address || '', coordinates: [ride.destination_lng || 0, ride.destination_lat || 0] });
        }

        // Handle status changes (for polling fallback)
        if (lastStatusRef.current && lastStatusRef.current !== ride.status) {
          handleStatusChange(ride.status);
        }
        lastStatusRef.current = ride.status;

        // Check current status and redirect if needed — guard prevents repeated navigation on every poll tick
        if (navigatedStatusRef.current !== ride.status) {
          if (ride.status === 'in_progress') {
            navigatedStatusRef.current = ride.status;
            navigate('/passenger/in-ride', { state: { rideId } });
          } else if (ride.status === 'completed') {
            navigatedStatusRef.current = ride.status;
            navigate('/passenger/completed', { state: { rideId } });
          }
        }
      } else {
        setLoadingRide(false);
      }
    };

    fetchRide();

    // 30-second fallback sync (only if realtime fails)
    const pollingInterval = setInterval(fetchRide, 30000);

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`tracking-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          const updatedRide = payload.new as DbRide;
          setCurrentRide(updatedRide);

          if (updatedRide.pilot_lat !== null && updatedRide.pilot_lng !== null) {
            setPilotPosition({
              lat: updatedRide.pilot_lat,
              lng: updatedRide.pilot_lng
            });
          }

          handleStatusChange(updatedRide.status);
          lastStatusRef.current = updatedRide.status;
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[Tracking] Realtime channel error — relying on 30s fallback sync');
        }
      });

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  // origin/destination intentionally excluded: restoring them is a one-time
  // side-effect on first load; including them would cause the subscription to
  // re-subscribe every time those values change, which is too expensive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId, navigate, setRideStatus, playSound, setOrigin, setDestination]);


  const handleCancel = async () => {
    if (!rideId) return;

    // Re-fetch the current status from DB to avoid acting on stale local state
    // (currentRide.status may be up to 5s old due to the polling interval).
    const { data: freshRide } = await supabase
      .from('rides')
      .select('status')
      .eq('id', rideId)
      .single();

    if (freshRide && freshRide.status !== 'pending') {
      toast.error('Corrida já foi aceita, não é possível cancelar');
      return;
    }

    const { error } = await supabase
      .from('rides')
      .update({ status: 'cancelled' })
      .eq('id', rideId)
      // Extra guard: only cancel if still pending (prevents a race with pilot accept)
      .eq('status', 'pending');

    if (error) {
      console.error('[Tracking] Error cancelling ride:', error);
      toast.error('Erro ao cancelar corrida. Tente novamente.');
      return;
    }

    setRideStatus('idle');
    navigate('/passenger');
  };

  // If we have a ride but no pilot context (e.g. after page refresh), fetch pilot from ride data
  useEffect(() => {
    if (!currentRide?.pilot_id || currentPilot) return;
    let mounted = true;

    supabase
      .from('pilot_profiles')
      .select('id, full_name, phone, photo_url, rating, boat_type, boat_identification, boat_color')
      .eq('id', currentRide.pilot_id)
      .single()
      .then(({ data }) => {
        if (mounted && data) {
          setLocalPilotData({
            id: data.id,
            name: data.full_name || 'Piloto',
            photo: data.photo_url || '',
            rating: data.rating || 4.9,
            boat: data.boat_identification || data.boat_type || 'Barco',
            boatType: data.boat_type ?? undefined,
            boatColor: data.boat_color ?? undefined,
            phone: data.phone || '',
          });
        }
      });

    return () => { mounted = false; };
  }, [currentRide?.pilot_id, currentPilot]);

  // Show spinner while ride data is loading
  if (loadingRide || !currentRide) {
    return (
      <div className="h-screen h-[100dvh] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando corrida...</p>
        </div>
      </div>
    );
  }

  const activePilot = currentPilot ?? localPilotData;

  // If ride loaded but no pilot context and local fetch also pending/failed
  // Show minimal tracking screen instead of crashing
  if (!activePilot && currentRide) {
    return (
      <div className="h-screen h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.25 0 2.45-.2 3.57-.57a9.9 9.9 0 007.86 0C16.55 22.8 17.75 23 19 23h3v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.79l-1.2-2.4C20.4 8.51 20 7.77 20 7V6c0-1.1-.9-2-2-2h-1V1h-2v3H9V1H7v3H6C4.9 4 4 4.9 4 6v1c0 .77-.4 1.51-.63 2.13l-1.2 2.4a1 1 0 00-.06.79L3.95 19z"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Piloto a caminho</p>
          <p className="text-sm text-muted-foreground mt-1">
            {currentRide.origin_name} → {currentRide.destination_name || 'Destino'}
          </p>
          <p className="text-sm font-bold text-primary mt-2">
            R$ {Number(currentRide.price).toFixed(2).replace('.', ',')}
          </p>
        </div>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive text-sm"
          onClick={handleCancel}
        >
          Cancelar viagem
        </Button>
      </div>
    );
  }

  const price = currentRide ? Number(currentRide.price) : calculatePrice();
  const status = currentRide?.status || 'accepted';

  return (
    <div className="h-screen h-[100dvh] bg-background relative overflow-hidden">
      {/* Map */}
      <div className="absolute inset-0">
        <GoogleMapView 
          showBoats={false} 
          origin={origin?.coordinates?.length ? origin : undefined}
          destination={destination?.coordinates?.length ? destination : undefined}
          pilotPosition={pilotPosition}
          animateBoatOnRoute={true}
          onRouteInfo={handleRouteInfo}
        />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 p-3 flex justify-between safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/passenger')}
          className="bg-card shadow-soft w-10 h-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsChatOpen(true);
            setUnreadMessages(0);
          }}
          className="bg-card shadow-soft w-10 h-10 relative"
        >
          <MessageCircle className="w-4 h-4" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 w-auto min-w-[20px] px-1 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="bg-card shadow-soft w-10 h-10"
          onClick={() => {
            const text = `Acompanhe minha viagem: ${origin?.name || ''} → ${destination?.name || ''}`;
            if (navigator.share) {
              navigator.share({ title: 'Gamma – minha viagem', text }).catch(() => {});
            } else if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(text).catch(() => {});
              toast.info('Link copiado!');
            }
          }}
          title="Compartilhar viagem"
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </header>

      {/* Status banner - always visible */}
      <div className="absolute top-16 left-4 right-4 z-30 safe-area-top">
        <RideStatusBanner 
          phase={status as RidePhase} 
          pilotName={activePilot.name}
        />
      </div>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-3 space-y-3 animate-slide-up safe-area-bottom">
        {/* Pilot card */}
        <PilotCard
          pilot={activePilot}
          arrivalTime={pilotToOriginMinutes}
          distance={routeInfo.pilotToOrigin.distanceMeters > 0 ? routeInfo.pilotToOrigin.distanceMeters / 1000 : undefined}
          onCall={() => {
            const phone = currentRide?.pilot_phone;
            const digits = phone?.replace(/\D/g, '');
            if (digits && digits.length >= 10) window.location.href = `tel:+55${digits}`;
          }}
          onMessage={() => {
            const phone = currentRide?.pilot_phone;
            const digits = phone?.replace(/\D/g, '');
            if (digits && digits.length >= 10) window.location.href = `https://wa.me/55${digits}`;
          }}
        />

        {/* Route timeline with times */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-0" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          {/* Pilot → Embarque */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.25 0 2.45-.2 3.57-.57a9.9 9.9 0 007.86 0C16.55 22.8 17.75 23 19 23h3v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.79l-1.2-2.4C20.4 8.51 20 7.77 20 7V6c0-1.1-.9-2-2-2h-1V1h-2v3H9V1H7v3H6C4.9 4 4 4.9 4 6v1c0 .77-.4 1.51-.63 2.13l-1.2 2.4a1 1 0 00-.06.79L3.95 19z"/>
                </svg>
              </div>
              <div className="w-0.5 h-8 bg-border mt-1" />
            </div>
            <div className="flex-1 flex items-start justify-between pb-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Piloto → Embarque</p>
                <p className="font-semibold text-foreground text-sm mt-0.5">
                  {routeInfo.pilotToOrigin.distanceMeters === 0
                    ? '...'
                    : routeInfo.pilotToOrigin.distanceMeters < 1000
                    ? `${routeInfo.pilotToOrigin.distanceMeters}m`
                    : `${(routeInfo.pilotToOrigin.distanceMeters / 1000).toFixed(1)}km`}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                  {pilotToOriginMinutes} min
                </span>
                <span className="bg-muted/30 text-foreground text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />{etaEmbark}
                </span>
              </div>
            </div>
          </div>

          {/* Embarque dot */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <div className="w-7 h-7 rounded-full bg-orange-500/15 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              </div>
              <div className="w-0.5 h-8 bg-border mt-1" />
            </div>
            <div className="flex-1 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Embarque</p>
              <p className="font-semibold text-foreground text-sm mt-0.5 truncate">{origin?.name}</p>
            </div>
          </div>

          {/* Destino dot + ETA */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
              </div>
            </div>
            <div className="flex-1 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Destino</p>
                <p className="font-semibold text-foreground text-sm mt-0.5 truncate">{destination?.name}</p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="bg-success/10 text-success text-xs font-bold px-2.5 py-1 rounded-full">
                  +{originToDestMinutes} min
                </span>
                <span className="bg-muted/30 text-foreground text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />{etaDestination}
                </span>
              </div>
            </div>
          </div>

          {/* Totais */}
          <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-foreground">{totalMinutes} min</span>
              </span>
            </div>
            <p className="font-bold text-lg text-foreground">
              R$ {price.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          fullWidth
          onClick={() => setShowCancelDialog(true)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 text-sm"
        >
          Cancelar viagem
        </Button>
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar viagem?</AlertDialogTitle>
            <AlertDialogDescription>
              {currentRide?.status !== 'pending'
                ? 'Sua viagem já foi aceita por um piloto e não pode ser cancelada.'
                : 'Tem certeza que deseja cancelar? O piloto será notificado.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{currentRide?.status !== 'pending' ? 'Entendido' : 'Voltar'}</AlertDialogCancel>
            {currentRide?.status === 'pending' && (
              <AlertDialogAction
                onClick={() => { setShowCancelDialog(false); handleCancel(); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancelar viagem
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chat */}
      {rideId && (
        <RideChat
          rideId={rideId}
          userType="passenger"
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onNewMessage={handleNewMessage}
        />
      )}
    </div>
  );
};

export default Tracking;
