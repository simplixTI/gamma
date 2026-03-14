import { useEffect, useState, useCallback } from 'react';
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
  const [navigatedToTracking, setNavigatedToTracking] = useState(false);
  const { playSound } = useNotificationSound();
  const { notifyRideAccepted } = useNotifications();
  // Fetch current ride on mount
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchCurrentRide = async () => {
      const ride = await getCurrentRide(user.id);
      if (ride) {
        setCurrentRideId(ride.id);
        if (ride.status === 'accepted' || ride.status === 'pilot_arriving' || ride.status === 'in_progress') {
          // Already matched, go to tracking
          setCurrentPilot({
            id: ride.pilot_id || 'pilot-1',
            name: ride.pilot_name || 'Capitão',
            photo: '/placeholder.svg',
            rating: 4.9,
            boat: 'Lancha Rápida',
            phone: ride.pilot_phone || '',
          });
          setRideStatus('matched');
          navigate('/passenger/tracking', { state: { rideId: ride.id } });
        }
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
        (payload) => {
          const updatedRide = payload.new as DbRide;
          if ((updatedRide.status === 'accepted' || updatedRide.status === 'pilot_arriving' || updatedRide.status === 'in_progress') && !navigatedToTracking) {
            setNavigatedToTracking(true);
            playSound();
            notifyRideAccepted(updatedRide.pilot_name || 'Capitão');

            const pilot = {
              id: updatedRide.pilot_id || 'pilot-1',
              name: updatedRide.pilot_name || 'Capitão',
              photo: '/placeholder.svg',
              rating: 4.9,
              boat: 'Lancha Rápida',
              phone: updatedRide.pilot_phone || '',
            };

            setCurrentPilot(pilot);
            setAcceptedPilot({ name: pilot.name, rating: pilot.rating, phone: pilot.phone });
            setShowAcceptedModal(true);
            setRideStatus('matched');

            toast.success(`🎉 ${updatedRide.pilot_name || 'Piloto'} aceitou sua corrida!`, {
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
      .subscribe();

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

        if ((ride.status === 'accepted' || ride.status === 'pilot_arriving' || ride.status === 'in_progress') && !navigatedToTracking) {
          setNavigatedToTracking(true);
          const pilot = {
            id: ride.pilot_id || 'pilot-1',
            name: ride.pilot_name || 'Capitão',
            photo: '/placeholder.svg',
            rating: 4.9,
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
  }, [currentRideId, navigate, setCurrentPilot, setRideStatus, playSound]);

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
                <span className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>🚤</span>
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
