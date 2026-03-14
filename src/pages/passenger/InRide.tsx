import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Clock, Route, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoogleMapView from '@/components/GoogleMapView';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { DbRide } from '@/types';
import { toast } from 'sonner';
import { getCurrentRide } from '@/services/rideService';
import { useAuthContext } from '@/contexts/AuthContext';

const InRide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const { origin, destination, setOrigin, setDestination } = useApp();
  
  const [pilotPosition, setPilotPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentRide, setCurrentRide] = useState<DbRide | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const initialRideId = (location.state as any)?.rideId as string | undefined;
  const [rideId, setRideId] = useState<string | null>(initialRideId || null);

  // Stable refs for context setters so useEffect deps don't need them
  const setOriginRef = useRef(setOrigin);
  const setDestinationRef = useRef(setDestination);
  setOriginRef.current = setOrigin;
  setDestinationRef.current = setDestination;
  const originRef = useRef(origin);
  originRef.current = origin;
  const destinationRef = useRef(destination);
  destinationRef.current = destination;

  // Ensure we always have a rideId (handles page refresh)
  useEffect(() => {
    if (!rideId && user?.id) {
      getCurrentRide(user.id).then((ride) => {
        if (ride && ride.status === 'in_progress') {
          setRideId(ride.id);
        } else if (!ride) {
          toast.error('Corrida não encontrada.');
          navigate('/passenger');
        }
      }).catch(() => {
        toast.error('Erro ao carregar corrida.');
        navigate('/passenger');
      });
    }
  }, [rideId, user?.id, navigate]);

  // Fetch ride and subscribe to updates
  useEffect(() => {
    if (!rideId) return;

    const fetchRide = async () => {
      // Pause polling when tab/app is in background to save battery
      if (document.hidden) return;

      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching ride:', error);
        return;
      }
      if (!data) return;

      const ride = data as DbRide;
      setCurrentRide(ride);

      // Set origin/destination from ride data (only once, using refs to avoid stale closure)
      if (!originRef.current && ride.origin_name) {
        setOriginRef.current({
          id: 'origin',
          name: ride.origin_name,
          address: ride.origin_address || '',
          coordinates: [ride.origin_lng, ride.origin_lat],
        });
      }
      if (!destinationRef.current && ride.destination_name) {
        setDestinationRef.current({
          id: 'destination',
          name: ride.destination_name || '',
          address: ride.destination_address || '',
          coordinates: [ride.destination_lng || 0, ride.destination_lat || 0],
        });
      }

      if (ride.pilot_lat && ride.pilot_lng) {
        setPilotPosition({ lat: ride.pilot_lat, lng: ride.pilot_lng });
      }
      if (ride.started_at) {
        setStartTime((prev) => prev ?? new Date(ride.started_at!));
      }
      // If no started_at, don't fallback to now — leave timer at 0 to avoid wrong elapsed time
    };

    fetchRide();

    // Polling fallback — pauses when app is in background
    const pollingInterval = setInterval(fetchRide, 5000);

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`inride-${rideId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => {
          const updatedRide = payload.new as DbRide;
          setCurrentRide(updatedRide);

          if (updatedRide.pilot_lat && updatedRide.pilot_lng) {
            setPilotPosition({ lat: updatedRide.pilot_lat, lng: updatedRide.pilot_lng });
          }
          if (updatedRide.status === 'completed') {
            toast.success('Viagem concluída!');
            navigate('/passenger/completed', { state: { rideId } });
          }
          if (updatedRide.status === 'cancelled') {
            toast.error('Corrida cancelada');
            navigate('/passenger');
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[InRide] Realtime channel error — relying on polling fallback');
        }
      });

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId, navigate]);

  // Timer for elapsed time
  useEffect(() => {
    if (!startTime) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCall = () => {
    if (currentRide?.pilot_phone) {
      window.open(`tel:${currentRide.pilot_phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (currentRide?.pilot_phone) {
      const digits = currentRide.pilot_phone.replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 15) {
        window.open(`https://wa.me/55${digits}`);
      }
    }
  };

  const price = currentRide ? Number(currentRide.price) : 0;

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
        />
      </div>

      {/* Status banner */}
      <div className="absolute top-4 left-4 right-4 z-30 safe-area-top">
        <div className="bg-secondary text-secondary-foreground rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.25 0 2.45-.2 3.57-.57a9.9 9.9 0 007.86 0C16.55 22.8 17.75 23 19 23h3v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.79l-1.2-2.4C20.4 8.51 20 7.77 20 7V6c0-1.1-.9-2-2-2h-1V1h-2v3H9V1H7v3H6C4.9 4 4 4.9 4 6v1c0 .77-.4 1.51-.63 2.13l-1.2 2.4a1 1 0 00-.06.79L3.95 19z"/>
          </svg>
          <div className="flex-1">
            <p className="font-bold text-sm">Em viagem</p>
            <p className="text-xs opacity-90">
              {currentRide?.pilot_name || 'Piloto'} está levando você ao destino
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{formatTime(elapsedTime)}</p>
          </div>
        </div>
      </div>

      {/* Bottom card */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-card rounded-t-2xl shadow-sheet p-4 animate-slide-up safe-area-bottom">
        {/* Destination info */}
        <div className="text-center mb-4">
          <p className="text-xs text-muted mb-0.5">Em viagem para</p>
          <p className="text-lg font-bold text-foreground">{destination?.name || currentRide?.destination_name}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="flex items-center gap-1.5 bg-muted/10 px-3 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-base font-semibold text-foreground">
              {formatTime(elapsedTime)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/10 px-3 py-2 rounded-lg">
            <span className="text-base font-semibold text-foreground">
              R$ {price.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* Pilot contact */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCall}
            className="flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Ligar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsApp}
            className="flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </Button>
        </div>

        {/* Info text */}
        <div className="bg-muted/10 rounded-lg p-3 mb-4">
          <p className="text-xs text-muted text-center">
            A viagem será finalizada pelo piloto quando vocês chegarem ao destino
          </p>
        </div>

        <Button
          variant="outline"
          fullWidth
          className="border-destructive text-destructive hover:bg-destructive/10 h-11"
          onClick={() => window.open('tel:190')}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Emergência (190)
        </Button>
      </div>
    </div>
  );
};

export default InRide;
