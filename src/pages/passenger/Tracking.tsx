import { useState, useEffect, useMemo, useCallback } from 'react';
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
    rideStatus, 
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

  // Fetch ride and subscribe to updates
  useEffect(() => {
    if (!rideId) return;

    let lastStatus = '';

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
        if (lastStatus && lastStatus !== ride.status) {
          handleStatusChange(ride.status);
        }
        lastStatus = ride.status;
        
        // Check current status and redirect if needed
        if (ride.status === 'in_progress') {
          navigate('/passenger/in-ride', { state: { rideId } });
        } else if (ride.status === 'completed') {
          navigate('/passenger/completed', { state: { rideId } });
        }
      }
    };

    const handleStatusChange = (status: string) => {
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
          lastStatus = updatedRide.status;
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  }, [rideId, navigate, setRideStatus, playSound]);


  const handleCancel = async () => {
    if (rideId) {
      await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', rideId);
    }
    setRideStatus('idle');
    navigate('/passenger');
  };

  if (!currentPilot) {
    navigate('/passenger');
    return null;
  }

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
            if (currentRide?.pilot_phone) {
              window.open(`tel:${currentRide.pilot_phone}`);
            }
          }}
          onMessage={() => {
            if (currentRide?.pilot_phone) {
              window.open(`https://wa.me/${currentRide.pilot_phone.replace(/\D/g, '')}`);
            }
          }}
        />

        {/* Route timeline with times */}
        <div className="bg-card rounded-xl shadow-soft p-3 space-y-1">
          {/* Pilot to Origin segment */}
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-center">
              <span className="text-lg animate-pulse">🚤</span>
              <div className="w-0.5 h-6 bg-primary/40" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Piloto → Embarque</p>
                <p className="font-medium text-foreground text-sm">
                  {routeInfo.pilotToOrigin.distanceMeters < 1000 
                    ? `${routeInfo.pilotToOrigin.distanceMeters}m` 
                    : `${(routeInfo.pilotToOrigin.distanceMeters / 1000).toFixed(1)}km`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary px-2 py-1 rounded-lg">
                  <span className="text-sm font-bold">{pilotToOriginMinutes} min</span>
                </div>
                <div className="flex items-center gap-1 bg-secondary/10 text-secondary px-2 py-1 rounded-lg">
                  <Clock className="w-3 h-3" />
                  <span className="text-sm font-bold">{etaEmbark}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Origin point */}
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-success border-2 border-success/30" />
              <div className="w-0.5 h-6 bg-success/40" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted">Embarque</p>
              <p className="font-medium text-foreground text-sm truncate">{origin?.name}</p>
            </div>
          </div>
          
          {/* Origin to Destination segment */}
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-destructive border-2 border-destructive/30" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Destino</p>
                <p className="font-medium text-foreground text-sm truncate">{destination?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-success/10 text-success px-2 py-1 rounded-lg">
                  <span className="text-sm font-bold">+{originToDestMinutes} min</span>
                </div>
                <div className="flex items-center gap-1 bg-secondary/10 text-secondary px-2 py-1 rounded-lg">
                  <Clock className="w-3 h-3" />
                  <span className="text-sm font-bold">{etaDestination}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total and price */}
          <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted" />
              <span className="text-sm text-muted">
                Total: <span className="font-semibold text-foreground">{totalMinutes} min</span>
              </span>
            </div>
            <p className="font-bold text-base text-foreground">
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
