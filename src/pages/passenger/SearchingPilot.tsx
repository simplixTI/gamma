import { useEffect, useState, useCallback } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
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

const SearchingPilot = () => {
  const navigate = useNavigate();
  const { origin, destination, setRideStatus, setCurrentPilot, calculatePrice } = useApp();
  const { user } = useAuthContext();
  const [searchTime, setSearchTime] = useState(0);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [showAcceptedModal, setShowAcceptedModal] = useState(false);
  const [acceptedPilot, setAcceptedPilot] = useState<{ name: string; rating: number; phone: string } | null>(null);
  // Ref (not state) prevents stale closure in both realtime + polling callbacks
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
            // Already matched, go to tracking
            let pilotRating = 4.9;
            if (ride.pilot_id) {
              const { data: pp } = await supabase
                .from('pilot_profiles')
                .select('rating')
                .eq('user_id', ride.pilot_id)
                .maybeSingle();
              if (pp?.rating) pilotRating = pp.rating;
            }
            setCurrentPilot({
              id: ride.pilot_id || 'pilot-1',
              name: ride.pilot_name || 'Capitão',
              photo: '/placeholder.svg',
              rating: pilotRating,
              boat: 'Lancha Rápida',
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

            // Fetch real pilot rating from DB
            let pilotRating = 4.9;
            if (updatedRide.pilot_id) {
              const { data: pp } = await supabase
                .from('pilot_profiles')
                .select('rating')
                .eq('user_id', updatedRide.pilot_id)
                .maybeSingle();
              if (pp?.rating) pilotRating = pp.rating;
            }

            const pilot = {
              id: updatedRide.pilot_id || 'pilot-1',
              name: updatedRide.pilot_name || 'Capitão',
              photo: '/placeholder.svg',
              rating: pilotRating,
              boat: 'Lancha Rápida',
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
          } else if (updatedRide.status === 'cancelled') {
            toast.error('Corrida cancelada');
            setRideStatus('idle');
            navigate('/passenger');
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[SearchingPilot] Realtime channel error — polling will continue');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRideId, navigate, setCurrentPilot, setRideStatus]);

  // Polling como fallback para casos onde o realtime não funciona
  useEffect(() => {
    if (!currentRideId) return;

    const poll = async () => {
      try {
        const { data: ride, error } = await supabase
          .from('rides')
          .select('*')
          .eq('id', currentRideId)
          .single();

        if (error || !ride) {
          return;
        }

        if ((ride.status === 'accepted' || ride.status === 'pilot_arriving' || ride.status === 'in_progress') && !navigatedToTrackingRef.current) {
          navigatedToTrackingRef.current = true;
          let pilotRating = 4.9;
          if (ride.pilot_id) {
            const { data: pp } = await supabase
              .from('pilot_profiles')
              .select('rating')
              .eq('user_id', ride.pilot_id)
              .maybeSingle();
            if (pp?.rating) pilotRating = pp.rating;
          }
          const pilot = {
            id: ride.pilot_id || 'pilot-1',
            name: ride.pilot_name || 'Capitão',
            photo: '/placeholder.svg',
            rating: pilotRating,
            boat: 'Lancha Rápida',
            phone: ride.pilot_phone || '',
          };
          setCurrentPilot(pilot);
          setRideStatus('matched');
          navigate('/passenger/tracking', { state: { rideId: ride.id } });
        } else if (ride.status === 'cancelled') {
          toast.error('Corrida cancelada');
          setRideStatus('idle');
          navigate('/passenger');
        }
        // Se status === 'pending', continua aguardando
      } catch (error) {
        console.error('[SearchingPilot] Error polling ride:', error);
      }
    };

    // Poll a cada 3 segundos para resposta mais rápida
    const interval = setInterval(poll, 3000);

    return () => clearInterval(interval);
  }, [currentRideId, navigate, setCurrentPilot, setRideStatus]);

  // Increment search time and auto-cancel after 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setSearchTime((prev) => {
        const newTime = prev + 1;
        // Auto-cancel after 5 minutes (300 seconds)
        if (newTime >= 300 && currentRideId) {
          cancelRide(currentRideId)
            .then(() => {
              toast.error('Nenhum piloto disponível no momento. Tente novamente mais tarde.');
              setRideStatus('idle');
              navigate('/passenger');
            })
            .catch(() => {
              toast.error('Tempo esgotado. Tente novamente.');
              setRideStatus('idle');
              navigate('/passenger');
            });
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentRideId, navigate, setRideStatus]);

  const handleCancel = async () => {
    if (currentRideId) {
      try {
        await cancelRide(currentRideId);
      } catch (error) {
        console.error('Error cancelling ride:', error);
        toast.error('Erro ao cancelar. Tente novamente.');
      }
    }
    setRideStatus('idle');
    navigate('/passenger');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const price = calculatePrice();

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
