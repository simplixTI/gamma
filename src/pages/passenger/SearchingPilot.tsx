import { useEffect, useState, useCallback } from 'react';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoogleMapView from '@/components/GoogleMapView';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { cancelRide, getCurrentRide } from '@/services/rideService';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useNotifications } from '@/hooks/useNotifications';
import { DbRide } from '@/types';
import { toast } from 'sonner';
import RideAcceptedModal from '@/components/RideAcceptedModal';
import RideStatusBanner from '@/components/RideStatusBanner';
import AdDisplay from '@/components/AdDisplay';

const SearchingPilot = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { origin, destination, setRideStatus, setCurrentPilot, calculatePrice } = useApp();
  const { user } = useAuthContext();
  const [searchTime, setSearchTime] = useState(0);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [showAcceptedModal, setShowAcceptedModal] = useState(false);
  const [acceptedPilot, setAcceptedPilot] = useState<{ name: string; rating: number; phone: string } | null>(null);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  // Ref (not state) prevents stale closure in both realtime + fallback callbacks
  const navigatedToTrackingRef = React.useRef(false);
  const { playSound } = useNotificationSound();
  const { notifyRideAccepted } = useNotifications();
  // Fetch current ride on mount
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchCurrentRide = async () => {
      try {
        const ride = await getCurrentRide(user.id);
        if (ride) {
          setCurrentRideId(ride.id);
          if (ride.status === 'accepted' || ride.status === 'pilot_arriving' || ride.status === 'in_progress') {
            // Already matched, go to tracking (pilot_id = pilot_profiles.id row UUID)
            let pilotRating = 4.9;
            let pilotPhoto = '';
            let pilotBoat = 'Barco';
            if (ride.pilot_id) {
              const { data: pp } = await supabase
                .from('pilot_profiles')
                .select('rating, photo_url, boat_type')
                .eq('id', ride.pilot_id)
                .maybeSingle();
              if (pp?.rating) pilotRating = pp.rating;
              if (pp?.photo_url) pilotPhoto = pp.photo_url;
              if (pp?.boat_type) pilotBoat = pp.boat_type;
            }
            if (navigatedToTrackingRef.current) return;
            navigatedToTrackingRef.current = true;
            setCurrentPilot({
              id: ride.pilot_id || 'pilot-1',
              name: ride.pilot_name || 'Capitão',
              photo: pilotPhoto,
              rating: pilotRating,
              boat: pilotBoat,
              phone: ride.pilot_phone || '',
            });
            setRideStatus('matched');
            navigate('/passenger/tracking', { state: { rideId: ride.id } });
          }
        }
      } catch (err) {
        console.error('[SearchingPilot] Error fetching ride:', err);
        // Don't show toast here — ride fetch might fail transiently on mount
      }
    };
    fetchCurrentRide();
  }, [user?.id, navigate, setCurrentPilot, setRideStatus]);

  // Subscribe to ride updates via realtime
  useEffect(() => {
    if (!currentRideId) return;

    const channel = supabase
      .channel(`ride-search-${currentRideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${currentRideId}`,
        },
        async (payload) => {
          const updatedRide = payload.new as DbRide;
          if ((updatedRide.status === 'accepted' || updatedRide.status === 'pilot_arriving' || updatedRide.status === 'in_progress') && !navigatedToTrackingRef.current) {
            navigatedToTrackingRef.current = true;
            playSound();
            notifyRideAccepted(updatedRide.pilot_name || 'Capitão');

            // Fetch real pilot rating, photo and boat_type from DB
            let pilotRating = 4.9;
            let pilotPhoto = '';
            let pilotBoat = 'Barco';
            if (updatedRide.pilot_id) {
              const { data: pp } = await supabase
                .from('pilot_profiles')
                .select('rating, photo_url, boat_type')
                .eq('id', updatedRide.pilot_id)
                .maybeSingle();
              if (pp?.rating) pilotRating = pp.rating;
              if (pp?.photo_url) pilotPhoto = pp.photo_url;
              if (pp?.boat_type) pilotBoat = pp.boat_type;
            }

            const pilot = {
              id: updatedRide.pilot_id || 'pilot-1',
              name: updatedRide.pilot_name || 'Capitão',
              photo: pilotPhoto,
              rating: pilotRating,
              boat: pilotBoat,
              phone: updatedRide.pilot_phone || '',
            };

            setCurrentPilot(pilot);
            setAcceptedPilot({ name: pilot.name, rating: pilot.rating, phone: pilot.phone });
            setShowAcceptedModal(true);
            setRideStatus('matched');

            toast.success(`${updatedRide.pilot_name || 'Piloto'} aceitou sua corrida!`, {
              duration: 5000,
            });
            navigate('/passenger/tracking', { state: { rideId: updatedRide.id } });
          } else if (updatedRide.status === 'pending') {
            // Pilot cancelled after accepting — reset lock to allow re-navigation
            navigatedToTrackingRef.current = false;
          } else if (updatedRide.status === 'cancelled') {
            // Only act on cancel if we haven't already navigated to tracking
            // (prevents cancel overriding a simultaneous accept event)
            if (!navigatedToTrackingRef.current) {
              navigatedToTrackingRef.current = true;
              toast.error('Corrida cancelada');
              setRideStatus('idle');
              navigate('/passenger');
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[SearchingPilot] Realtime channel error — 30s fallback sync active');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRideId, navigate, setCurrentPilot, setRideStatus, playSound, notifyRideAccepted]);

  // 30-second fallback sync (only if realtime fails)
  useEffect(() => {
    if (!currentRideId) return;

    const fallbackInterval = setInterval(async () => {
      if (!currentRideId) return;
      const { data } = await supabase
        .from('rides')
        .select('status, pilot_id')
        .eq('id', currentRideId)
        .maybeSingle();
      if (data?.status === 'accepted' && !navigatedToTrackingRef.current) {
        navigatedToTrackingRef.current = true;
        navigate('/passenger/tracking', { state: { rideId: currentRideId } });
      }
    }, 30000);

    return () => clearInterval(fallbackInterval);
  }, [currentRideId, navigate]);

  // Increment search time and auto-cancel after 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setSearchTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Show warning 15 seconds before auto-cancel
  useEffect(() => {
    if (searchTime === 285 && !navigatedToTrackingRef.current) {
      setShowCancelWarning(true);
    }
  }, [searchTime]);

  // Trigger auto-cancel when timeout is reached (fetch fresh status first)
  useEffect(() => {
    if (searchTime >= 300 && currentRideId && !navigatedToTrackingRef.current) {
      navigatedToTrackingRef.current = true;

      const checkAndCancel = async () => {
        try {
          const freshRide = await getCurrentRide(user?.id ?? '');
          if (freshRide && (freshRide.status === 'accepted' || freshRide.status === 'in_progress' || freshRide.status === 'pilot_arriving')) {
            navigatedToTrackingRef.current = false;
            return; // pilot accepted — don't cancel
          }
          // Don't cancel if payment is confirmed (ride is valid, just waiting for pilot)
          if (freshRide && (freshRide as any).payment_status === 'paid') {
            navigatedToTrackingRef.current = false;
            return;
          }
        } catch (err) {
          console.error('Error checking ride status before auto-cancel:', err);
        }

        cancelRide(currentRideId, user?.id ?? '')
          .then(() => {
            toast.error('Nenhum piloto disponível no momento. Tente novamente mais tarde.');
          })
          .catch(() => {
            toast.error('Tempo esgotado. Tente novamente.');
          })
          .finally(() => {
            setRideStatus('idle');
            navigate('/passenger');
          });
      };

      checkAndCancel();
    }
  }, [searchTime, currentRideId, navigate, setRideStatus, user?.id]);

  const handleCancel = async () => {
    // Prevent double-cancellation if realtime/polling has already navigated away
    if (navigatedToTrackingRef.current) return;
    if (currentRideId) {
      try {
        await cancelRide(currentRideId, user?.id ?? '');
      } catch (error) {
        console.error('Error cancelling ride:', error);
        toast.error('Erro ao cancelar. Tente novamente.');
        // Do not navigate away — the ride is still active in the DB.
        // The user can retry cancellation or wait for a pilot.
        return;
      }
    }
    // Only mark as navigated and redirect after a successful cancellation
    navigatedToTrackingRef.current = true;
    setRideStatus('idle');
    navigate('/passenger');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const price = (location.state as { confirmedPrice?: number } | null)?.confirmedPrice ?? calculatePrice();

  const handleCloseModal = () => {
    setShowAcceptedModal(false);
    if (currentRideId) {
      navigate('/passenger/tracking', { state: { rideId: currentRideId } });
    }
  };

  return (
    <div className="h-screen h-[100dvh] bg-background relative overflow-hidden">
      {/* Ride Accepted Modal */}
      <RideAcceptedModal
        isOpen={showAcceptedModal}
        onClose={handleCloseModal}
        pilotName={acceptedPilot?.name || 'Capitão'}
        pilotRating={acceptedPilot?.rating}
        pilotPhone={acceptedPilot?.phone}
      />

      {/* Map Background */}
      <div className="absolute inset-0">
        <GoogleMapView 
          showBoats={true} 
          origin={origin}
          destination={destination}
        />
      </div>

      {/* Searching overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <header className="p-4 safe-area-top">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="bg-card shadow-md rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </header>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Animated search indicator */}
          <div className="relative mb-8">
            {/* Outer rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full border-2 border-secondary/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-2 border-secondary/40 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-2 border-secondary/60 animate-ping" style={{ animationDuration: '1s', animationDelay: '0.25s' }} />
            </div>
            
            {/* Center boat */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-secondary-foreground animate-bounce" style={{ animationDuration: '2s' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.25 0 2.45-.2 3.57-.57a9.9 9.9 0 007.86 0C16.55 22.8 17.75 23 19 23h3v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.79l-1.2-2.4C20.4 8.51 20 7.77 20 7V6c0-1.1-.9-2-2-2h-1V1h-2v3H9V1H7v3H6C4.9 4 4 4.9 4 6v1c0 .77-.4 1.51-.63 2.13l-1.2 2.4a1 1 0 00-.06.79L3.95 19z"/>
                </svg>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
            Procurando pilotos...
          </h2>
          <p className="text-muted text-center mb-2">
            Buscando pilotos disponíveis na região
          </p>
          <div className="flex items-center gap-2 text-secondary font-semibold">
            <Clock className="w-4 h-4" />
            <span>{formatTime(searchTime)}</span>
          </div>
          {/* Always visible: time counter and auto-cancel info */}
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {searchTime < 240
                ? `Buscando há ${Math.floor(searchTime / 60)}:${String(searchTime % 60).padStart(2, '0')} — cancela automaticamente em ${Math.floor((300 - searchTime) / 60)}:${String((300 - searchTime) % 60).padStart(2, '0')}`
                : `Cancelamento automático em ${300 - searchTime}s`
              }
            </span>
          </div>

          {/* Warning banner: 15s before auto-cancel */}
          {showCancelWarning && !navigatedToTrackingRef.current && (
            <div className="mt-4 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-destructive text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">Nenhum piloto encontrado</p>
                <p className="text-xs text-destructive/80">A busca será cancelada automaticamente em {Math.max(0, 300 - searchTime)}s.</p>
              </div>
              <Button size="sm" variant="outline" className="border-destructive/40 text-destructive shrink-0" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* Bottom card */}
        <div className="p-4 safe-area-bottom">
          <div className="bg-card rounded-2xl shadow-lg p-4 mb-4">
            {/* Route info */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-success" />
                <div className="w-0.5 h-8 bg-border my-1" />
                <div className="w-3 h-3 rounded-full bg-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-3">
                  <p className="text-xs text-muted">Embarque</p>
                  <p className="font-medium text-foreground truncate">{origin?.name || 'Origem'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Destino</p>
                  <p className="font-medium text-foreground truncate">{destination?.name || 'Destino'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Total</p>
                <p className="text-xl font-bold text-foreground">R${price.toFixed(0)}</p>
              </div>
            </div>

            {/* Dots animation */}
            <div className="flex items-center justify-center gap-1 py-2">
              <div className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>

          <AdDisplay position="searching" />

          <Button
            variant="ghost"
            fullWidth
            onClick={handleCancel}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-12"
          >
            <X className="w-5 h-5 mr-2" />
            Cancelar solicitação
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchingPilot;
