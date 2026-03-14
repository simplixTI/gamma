import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Navigation, Clock, Route, Loader2, MessageCircle, CheckCircle2, AlertCircle, Users } from 'lucide-react';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import GoogleMapView from '@/components/GoogleMapView';
import RideChat from '@/components/RideChat';
import RideTimeline, { TimelineStep } from '@/components/RideTimeline';
import { supabase } from '@/integrations/supabase/client';
import { DbRide, Ride, Location } from '@/types';
import { toast } from 'sonner';
import { usePilotGPS } from '@/hooks/usePilotGPS';
import { useNotificationSound } from '@/hooks/useNotificationSound';

type RidePhase = 'going_to_passenger' | 'waiting' | 'in_progress' | 'completed';

const phaseToTimelineStep: Record<RidePhase, TimelineStep> = {
  going_to_passenger: 'going_to_passenger',
  waiting: 'waiting',
  in_progress: 'in_progress',
  completed: 'completed',
};
const ActiveRide = () => {
  const navigate = useNavigate();
  const { rideId } = useParams();
  const [phase, setPhase] = useState<RidePhase>('going_to_passenger');
  const [timer, setTimer] = useState(0);
  const [ride, setRide] = useState<Ride | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [currentPilotId, setCurrentPilotId] = useState<string | undefined>(undefined);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const { playSound } = useNotificationSound();

  const handleNewMessage = useCallback(() => {
    if (!isChatOpen) {
      setUnreadMessages((prev) => prev + 1);
      playSound();
    }
  }, [isChatOpen, playSound]);

  // GPS tracking - active when ride is in progress or going to passenger
  const isGPSActive = phase === 'going_to_passenger' || phase === 'waiting' || phase === 'in_progress';
  usePilotGPS({ rideId, pilotId: currentPilotId, isActive: isGPSActive, intervalMs: 5000 });

  // Convert database ride to app ride format
  // IMPORTANT: DB stores lat/lng correctly, but Location.coordinates format is [lng, lat]
  const dbRideToRide = useCallback((dbRide: DbRide): Ride => ({
    id: dbRide.id,
    passengerId: dbRide.passenger_device_id,
    passengerName: dbRide.passenger_name || 'Passageiro',
    passengerPhoto: '/placeholder.svg',
    pilotId: dbRide.pilot_id || undefined,
    origin: {
      id: 'origin',
      name: dbRide.origin_name,
      address: dbRide.origin_address || '',
      coordinates: [dbRide.origin_lng, dbRide.origin_lat], // [lng, lat] format for Location type
    },
    destination: {
      id: 'destination',
      name: dbRide.destination_name || 'Destino',
      address: dbRide.destination_address || '',
      coordinates: [dbRide.destination_lng || 0, dbRide.destination_lat || 0], // [lng, lat] format
    },
    status: dbRide.status,
    price: Number(dbRide.price),
    estimatedTime: dbRide.estimated_time || 0,
    distance: 0,
    createdAt: new Date(dbRide.created_at),
    passengerCount: dbRide.passenger_count ?? 1,
    originPierId: dbRide.origin_pier_id || undefined,
    destinationPierId: dbRide.destination_pier_id || undefined,
  }), []);

  // Fetch ride from Supabase
  useEffect(() => {
    const fetchRide = async () => {
      if (!rideId) return;

      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .single();

      if (error) {
        console.error('Error fetching ride:', error);
        toast.error('Erro ao carregar corrida');
        navigate('/pilot');
        return;
      }

      if (data) {
        const dbRide = data as DbRide;
        setRide(dbRideToRide(dbRide));
        setPassengerCount(dbRide.passenger_count ?? 1);
        if (data.pilot_id) setCurrentPilotId(data.pilot_id);
        // Set phase based on ride status
        if (data.status === 'accepted') {
          setPhase('going_to_passenger');
        } else if (data.status === 'pilot_arriving') {
          setPhase('waiting');
        } else if (data.status === 'in_progress') {
          setPhase('in_progress');
        } else if (data.status === 'completed') {
          setPhase('completed');
        }
        // Check payment status
        if ((data as DbRide).payment_status === 'paid') {
          setPaymentStatus('paid');
        }
      }
      setLoading(false);
    };

    fetchRide();

    // Subscribe to payment updates
    const paymentChannel = supabase
      .channel(`payment-${rideId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => {
          const updated = payload.new as DbRide;
          if (updated.payment_status === 'paid') {
            setPaymentStatus('paid');
            playSound();
            toast.success('Pagamento confirmado!');
          }
        }
      )
      .subscribe();

    // Subscribe to ride updates
    const channel = supabase
      .channel(`ride-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          const updatedRide = payload.new as DbRide;
          setRide(dbRideToRide(updatedRide));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(paymentChannel);
    };
  }, [rideId, navigate, dbRideToRide]);

  useEffect(() => {
    if (phase === 'in_progress') {
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAction = async () => {
    if (!ride || !rideId) return;

    let newStatus = '';
    let newPhase: RidePhase = phase;

    switch (phase) {
      case 'going_to_passenger':
        newStatus = 'pilot_arriving';
        newPhase = 'waiting';
        break;
      case 'waiting':
        newStatus = 'in_progress';
        newPhase = 'in_progress';
        break;
      case 'in_progress':
        newStatus = 'completed';
        newPhase = 'completed';
        break;
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', rideId);

    if (error) {
      console.error('Error updating ride:', error);
      toast.error('Erro ao atualizar corrida');
      return;
    }

    setPhase(newPhase);

    if (newPhase === 'completed') {
      navigate(`/pilot/rate/${rideId}`);
    }
  };

  const handleCancelRide = async () => {
    if (!ride || !rideId) return;
    
    setIsCancelling(true);
    
    // Check if cancellation is after 3 minutes (applies fee)
    const rideCreatedAt = new Date(ride.createdAt);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - rideCreatedAt.getTime()) / (1000 * 60);
    const hasCancellationFee = minutesSinceCreation > 3;
    const cancellationFee = hasCancellationFee ? 3.50 : 0;
    
    const { error } = await supabase
      .from('rides')
      .update({
        status: 'cancelled',
        cancelled_by: 'pilot',
        cancellation_fee: cancellationFee,
      })
      .eq('id', rideId);

    if (error) {
      console.error('Error cancelling ride:', error);
      toast.error('Erro ao cancelar corrida');
      setIsCancelling(false);
      return;
    }

    toast.success(hasCancellationFee 
      ? `Corrida cancelada. Taxa de R$ ${cancellationFee.toFixed(2)} aplicada.`
      : 'Corrida cancelada com sucesso');
    navigate('/pilot');
  };

  const handleOpenNavigation = () => {
    if (!ride) return;
    
    const dest = phase === 'in_progress' ? ride.destination : ride.origin;
    // coordinates is [lng, lat] but Google Maps needs lat,lng
    const lat = dest.coordinates[1];
    const lng = dest.coordinates[0];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const getActionText = () => {
    switch (phase) {
      case 'going_to_passenger':
        return 'Cheguei ao embarque';
      case 'waiting':
        return 'Iniciar corrida';
      case 'in_progress':
        return 'Finalizar corrida';
      case 'completed':
        return 'Corrida finalizada!';
    }
  };

  const getPhaseInfo = () => {
    if (!ride) return { title: '', subtitle: '' };
    switch (phase) {
      case 'going_to_passenger':
        return { title: 'Indo buscar passageiro', subtitle: ride.origin.name };
      case 'waiting':
        return { title: 'Aguardando passageiro', subtitle: 'No ponto de embarque' };
      case 'in_progress':
        return { title: 'Em corrida', subtitle: `Para ${ride.destination.name}` };
      case 'completed':
        return { title: 'Corrida concluída!', subtitle: `R$ ${ride.price.toFixed(2)}` };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground mb-2">Corrida não encontrada</p>
          <Button onClick={() => navigate('/pilot')}>Voltar</Button>
        </div>
      </div>
    );
  }

  const phaseInfo = getPhaseInfo();

  return (
    <div className="min-h-screen bg-background relative">
      {/* Map */}
      <div className="absolute inset-0">
        <GoogleMapView 
          showBoats={false}
          origin={ride.origin}
          destination={phase === 'in_progress' ? ride.destination : ride.origin}
        />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-center safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/pilot')}
          className="bg-card shadow-soft"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        <div className="bg-card rounded-full px-4 py-2 shadow-soft">
          <p className="font-semibold text-foreground">{phaseInfo.title}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsChatOpen(true);
              setUnreadMessages(0);
            }}
            className="bg-card shadow-soft relative"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenNavigation}
            className="bg-secondary shadow-soft"
          >
            <Navigation className="w-5 h-5 text-secondary-foreground" />
          </Button>
        </div>
      </header>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-card rounded-t-3xl shadow-sheet p-5 animate-slide-up safe-area-bottom max-h-[70vh] overflow-y-auto">
        {/* Timeline */}
        <RideTimeline currentStep={phaseToTimelineStep[phase]} className="mb-4" />

        {/* Passenger info */}
        <div className="flex items-center gap-4 mb-4">
          <img
            src={ride.passengerPhoto}
            alt={ride.passengerName}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-secondary"
          />
          <div className="flex-1">
            <p className="font-semibold text-lg text-foreground">{ride.passengerName}</p>
            <div className="flex items-center gap-1 text-muted">
              <Users className="w-3.5 h-3.5" />
              <p className="text-sm">{passengerCount} passageiro{passengerCount > 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Phone className="w-5 h-5" />
          </Button>
        </div>

        {/* Route info */}
        <div className="bg-background rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-success mt-1" />
            <div>
              <p className="text-sm text-muted">Embarque</p>
              <p className="font-medium text-foreground">{ride.origin.name}</p>
            </div>
          </div>
          <div className="ml-1.5 w-0.5 h-4 bg-border mb-3" />
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-destructive mt-1" />
            <div>
              <p className="text-sm text-muted">Destino</p>
              <p className="font-medium text-foreground">{ride.destination.name}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-6 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-muted mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Tempo</span>
            </div>
            <p className="font-bold text-lg text-foreground">
              {phase === 'in_progress' ? formatTime(timer) : `${ride.estimatedTime} min`}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted mb-1">
              <Route className="w-4 h-4" />
              <span className="text-sm">Distância</span>
            </div>
            <p className="font-bold text-lg text-foreground">{ride.distance} km</p>
          </div>
          <div>
            <p className="text-sm text-muted mb-1">Valor</p>
            <p className="font-bold text-lg text-success">
              R$ {ride.price.toFixed(2).replace('.', ',')}
            </p>
            {phase === 'in_progress' || phase === 'completed' ? (
              paymentStatus === 'paid' ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-success" />
                  <span className="text-xs text-success">Pago</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3 text-muted" />
                  <span className="text-xs text-muted">Aguardando</span>
                </div>
              )
            ) : null}
          </div>
        </div>

        {/* Action button */}
        <Button
          variant={phase === 'in_progress' ? 'destructive' : 'success'}
          size="xl"
          fullWidth
          onClick={handleAction}
        >
          {getActionText()}
        </Button>

        {phase === 'going_to_passenger' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                fullWidth
                className="mt-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelando...' : 'Cancelar corrida'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar corrida?</AlertDialogTitle>
                <AlertDialogDescription>
                  {(() => {
                    const rideCreatedAt = ride ? new Date(ride.createdAt) : new Date();
                    const now = new Date();
                    const minutesSinceCreation = (now.getTime() - rideCreatedAt.getTime()) / (1000 * 60);
                    const hasFee = minutesSinceCreation > 3;
                    
                    return hasFee 
                      ? 'Cancelamentos após 3 minutos incorrem em uma taxa de R$ 3,50. Deseja continuar?'
                      : 'Tem certeza que deseja cancelar esta corrida?';
                  })()}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleCancelRide}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirmar cancelamento
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Chat */}
      <RideChat
        rideId={rideId || ''}
        userType="pilot"
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onNewMessage={handleNewMessage}
      />
    </div>
  );
};

export default ActiveRide;
