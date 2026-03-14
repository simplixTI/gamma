import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Share2, CreditCard, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    calculatePrice,
    setRideStatus
  } = useApp();
  
  const [pilotPosition, setPilotPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentRide, setCurrentRide] = useState<DbRide | null>(null);
  const [proximityNotifications, setProximityNotifications] = useState({
    notified500m: false,
    notified200m: false,
    notified100m: false,
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { playSound } = useNotificationSound();
  const { notifyPilotArrived } = useNotifications();
  // Deduplication: only fire status-change side-effects once per status value
  const handledStatusRef = useRef<string>('');

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

    const fetchRide = async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .single();

      if (data) {
        const ride = data as DbRide;
        setCurrentRide(ride);
        if (ride.pilot_lat && ride.pilot_lng) {
          setPilotPosition({ lat: ride.pilot_lat, lng: ride.pilot_lng });
        }

        // Handle status changes (for polling fallback)
        if (lastStatusRef.current && lastStatusRef.current !== ride.status) {
          handleStatusChange(ride.status);
        }
        lastStatusRef.current = ride.status;
        
        // Check current status and redirect if needed
        if (ride.status === 'in_progress') {
          navigate('/passenger/in-ride', { state: { rideId } });
        } else if (ride.status === 'completed') {
          navigate('/passenger/completed', { state: { rideId } });
        }
      }
    };

    const handleStatusChange = (status: string) => {
      // Deduplicate: only fire once per distinct status value
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

    fetchRide();

    // Polling fallback - check every 5 seconds
    const pollingInterval = setInterval(fetchRide, 5000);

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
          console.warn('[Tracking] Realtime channel error — relying on polling fallback');
        }
      });

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  }, [rideId, navigate, setRideStatus, playSound]);


  const handleCancel = async () => {
    if (rideId) {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', rideId);
      if (error) {
        console.error('[Tracking] Error cancelling ride:', error);
        toast.error('Erro ao cancelar corrida. Tente novamente.');
        return;
      }
    }
    setRideStatus('idle');
    navigate('/passenger');
  };

  // Redirect if ride data loaded but no pilot context and ride is in a non-trackable state
  useEffect(() => {
    if (!currentPilot && currentRide && currentRide.status !== 'accepted' && currentRide.status !== 'pilot_arriving' && currentRide.status !== 'in_progress') {
      navigate('/passenger');
    }
  }, [currentPilot, currentRide, navigate]);

  // Show nothing while ride/pilot data is loading to avoid null crashes
  if (!currentPilot || !currentRide) return null;

  const price = currentRide ? Number(currentRide.price) : calculatePrice();
  const status = currentRide?.status || 'accepted';

  return (
    <div className="h-screen h-[100dvh] bg-background relative overflow-hidden">
      {/* Map */}
      <div className="absolute inset-0">
        <GoogleMapView 
          showBoats={false} 
          origin={origin}
          destination={destination}
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
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {unreadMessages}
            </span>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="bg-card shadow-soft w-10 h-10"
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </header>

      {/* Status banner - always visible */}
      <div className="absolute top-16 left-4 right-4 z-30 safe-area-top">
        <RideStatusBanner 
          phase={status as RidePhase} 
          pilotName={currentPilot.name}
        />
      </div>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-3 space-y-3 animate-slide-up safe-area-bottom">
        {/* Pilot card */}
        <PilotCard
          pilot={currentPilot}
          arrivalTime={pilotToOriginMinutes}
          distance={routeInfo.pilotToOrigin.distanceMeters > 0 ? routeInfo.pilotToOrigin.distanceMeters / 1000 : undefined}
          onCall={() => {
            const phone = currentRide?.pilot_phone;
            const digits = phone?.replace(/\D/g, '');
            if (digits && digits.length >= 10) window.open(`tel:+55${digits}`);
          }}
          onMessage={() => {
            const phone = currentRide?.pilot_phone;
            const digits = phone?.replace(/\D/g, '');
            if (digits && digits.length >= 10) window.open(`https://wa.me/55${digits}`);
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
                  {routeInfo.pilotToOrigin.distanceMeters < 1000
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
              <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-success" />
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
          onClick={handleCancel}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 text-sm"
        >
          Cancelar viagem
        </Button>
      </div>

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
