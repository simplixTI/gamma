import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useAuthContext } from '@/contexts/AuthContext';
import { DbRide, Ride } from '@/types';
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
  // timerStart is seeded from DB started_at so elapsed time is correct after remount
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [timer, setTimer] = useState(0);
  // Prevent duplicate navigation when realtime and local action race
  const navigatedAwayRef = useRef(false);
  const [ride, setRide] = useState<Ride | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  // pilotProfileId = pilot_profiles.id (UUID), used for the cancel_ride_by_pilot RPC
  const [pilotProfileId, setPilotProfileId] = useState<string | undefined>(undefined);
  // pilotUserId = auth UUID, used for GPS tracking via usePilotGPS
  const [currentPilotId, setCurrentPilotId] = useState<string | undefined>(undefined);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [passengerPhone, setPassengerPhone] = useState<string | null>(null);
  const { user } = useAuthContext();
  const { playSound } = useNotificationSound();

  const handleNewMessage = useCallback(() => {
    if (!isChatOpen) {
      setUnreadMessages((prev) => prev + 1);
      playSound();
    }
  }, [isChatOpen, playSound]);

  // GPS tracking - active when ride is in progress or going to passenger.
  // currentPilotId is the pilot_profiles.id UUID (set from pilot_user_id on the ride row).
  const isGPSActive = phase === 'going_to_passenger' || phase === 'waiting' || phase === 'in_progress';
  usePilotGPS({ rideId, pilotId: currentPilotId, isActive: isGPSActive });

  // Convert database ride to app ride format
  // IMPORTANT: DB stores lat/lng correctly, but Location.coordinates format is [lng, lat]
  const dbRideToRide = useCallback((dbRide: DbRide): Ride => ({
    id: dbRide.id,
    passengerId: dbRide.passenger_device_id,
    passengerName: dbRide.passenger_name || 'Passageiro',
    passengerPhoto: '',
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
      coordinates: [dbRide.destination_lng ?? 0, dbRide.destination_lat ?? 0], // [lng, lat] format
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
        .select('id, status, passenger_device_id, passenger_name, passenger_phone, passenger_count, pilot_id, pilot_user_id, origin_name, origin_address, origin_lat, origin_lng, origin_pier_id, destination_name, destination_address, destination_lat, destination_lng, destination_pier_id, price, estimated_time, created_at, payment_status')
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
        setPassengerPhone(dbRide.passenger_phone ?? null);
        // pilot_user_id (auth UUID) → used by usePilotGPS for location updates
        if (data.pilot_user_id) setCurrentPilotId(data.pilot_user_id);
        // pilot_id (pilot_profiles row UUID) → used by cancel_ride_by_pilot RPC
        if (data.pilot_id) setPilotProfileId(data.pilot_id);
        // Set phase based on ride status
        if (data.status === 'accepted') {
          setPhase('going_to_passenger');
        } else if (data.status === 'pilot_arriving') {
          setPhase('waiting');
        } else if (data.status === 'in_progress') {
          setPhase('in_progress');
          // Seed timer from DB so elapsed time is correct on remount
          const startedAt = (data as DbRide & { started_at?: string }).started_at;
          if (startedAt) {
            setTimerStart((prev) => prev ?? new Date(startedAt));
          }
        } else if (data.status === 'completed') {
          setPhase('completed');
        }
        // Check payment status
        if ((data as DbRide).payment_status === 'paid') {
          setPaymentStatus('paid');
        } else if ((data as DbRide).payment_status === 'failed') {
          setPaymentStatus('failed');
        }
      }
      setLoading(false);
    };

    fetchRide();

    // Single channel handles both ride status updates and payment status updates.
    // Previously two channels subscribed to the same filter; merged into one to
    // avoid duplicate events and unnecessary connections.
    const channel = supabase
      .channel(`active-ride-${rideId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => {
          const updatedRide = payload.new as DbRide & { started_at?: string };
          setRide(dbRideToRide(updatedRide));

          // Payment update
          if (updatedRide.payment_status === 'paid') {
            setPaymentStatus('paid');
            playSound();
            toast.success('Pagamento confirmado!');
          } else if (updatedRide.payment_status === 'failed') {
            setPaymentStatus('failed');
            toast.error('Pagamento falhou. O passageiro precisa tentar novamente.');
          }

          // Phase sync — keep UI in step with DB status (e.g. passenger cancels)
          if (updatedRide.status === 'accepted') {
            setPhase('going_to_passenger');
          } else if (updatedRide.status === 'pilot_arriving') {
            setPhase('waiting');
          } else if (updatedRide.status === 'in_progress') {
            setPhase('in_progress');
            if (updatedRide.started_at) {
              setTimerStart((prev) => prev ?? new Date(updatedRide.started_at!));
            }
          } else if (updatedRide.status === 'cancelled') {
            if (!navigatedAwayRef.current) {
              navigatedAwayRef.current = true;
              toast.error('Corrida cancelada pelo passageiro');
              navigate('/pilot');
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[ActiveRide] Realtime channel error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId, navigate, dbRideToRide, playSound]);

  useEffect(() => {
    if (phase !== 'in_progress' || !timerStart) return;
    // Compute initial elapsed immediately, then update each second
    setTimer(Math.floor((Date.now() - timerStart.getTime()) / 1000));
    const interval = setInterval(() => {
      setTimer(Math.floor((Date.now() - timerStart.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timerStart]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAction = async () => {
    if (!ride || !rideId || isActionPending) return;

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
        // Warn if payment is still pending — pilot can still complete
        if (paymentStatus !== 'paid') {
          toast.warning('Pagamento ainda pendente. Você receberá assim que confirmado.', { duration: 6000 });
        }
        newStatus = 'completed';
        newPhase = 'completed';
        break;
    }

    setIsActionPending(true);
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'in_progress') {
        const now = new Date();
        updateData.started_at = now.toISOString();
        setTimerStart(now);
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
        navigatedAwayRef.current = true;
        navigate(`/pilot/rate/${rideId}`);
      }
    } finally {
      setIsActionPending(false);
    }
  };

  const handleCancelRide = async () => {
    // cancel_ride_by_pilot RPC validates auth.uid() === p_pilot_id, so pass user.id (auth UUID)
    if (!ride || !rideId || !user?.id) {
      toast.error('Dados do piloto ainda carregando. Tente novamente.');
      return;
    }

    setIsCancelling(true);

    try {
      const { data, error } = await supabase.rpc('cancel_ride_by_pilot', {
        p_ride_id: rideId,
        p_pilot_id: user.id,
      });

      if (error) {
        console.error('Error cancelling ride:', error);
        toast.error('Erro ao cancelar corrida');
        return;
      }

      // RPC returns json: { success, cancellation_fee } or { success: false, error }
      const result = data as { success: boolean; cancellation_fee?: number; error?: string } | null;
      if (!result?.success) {
        toast.error(result?.error ?? 'Não foi possível cancelar a corrida');
        return;
      }

      const fee: number = result.cancellation_fee ?? 0;
      toast.success(fee > 0
        ? `Corrida cancelada. Taxa de R$ ${fee.toFixed(2)} aplicada.`
        : 'Corrida cancelada com sucesso');
      navigatedAwayRef.current = true;
      navigate('/pilot');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOpenNavigation = () => {
    if (!ride || !rideId) return;
    
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
    <div className="h-screen h-[100dvh] bg-background relative overflow-hidden">
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
              <span className="absolute -top-1 -right-1 w-auto min-w-[20px] px-1 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {unreadMessages > 9 ? '9+' : unreadMessages}
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
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
            onClick={() => { const d = passengerPhone?.replace(/\D/g, ''); if (d && d.length >= 10) window.location.href = `tel:+55${d}`; }}
            disabled={!passengerPhone}
            title={passengerPhone ? `Ligar para ${ride.passengerName}` : 'Telefone não disponível'}
          >
            <Phone className="w-5 h-5" />
          </Button>
        </div>

        {paymentStatus === 'failed' && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-3">
            <p className="text-sm font-semibold text-destructive">⚠️ Pagamento falhou</p>
            <p className="text-xs text-destructive/80">O passageiro precisa tentar novamente.</p>
          </div>
        )}

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
          disabled={isActionPending || phase === 'completed'}
        >
          {isActionPending ? <Loader2 className="w-5 h-5 animate-spin" /> : getActionText()}
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
                  Cancelamentos após 3 minutos incorrem em uma taxa de R$ 3,50. Deseja continuar?
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
