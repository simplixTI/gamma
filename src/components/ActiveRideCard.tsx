import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DbRide } from '@/types';
import { differenceInMinutes } from 'date-fns';
import { useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActiveRideCardProps {
  ride: DbRide;
  userType: 'passenger' | 'pilot';
  onCancelled?: () => void;
}

const CANCELLATION_FEE = 3.5;
const FREE_CANCEL_MINUTES = 3;

const ActiveRideCard = ({ ride, userType, onCancelled }: ActiveRideCardProps) => {
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const minutesSinceCreation = differenceInMinutes(new Date(), new Date(ride.created_at));
  const hasFee = minutesSinceCreation >= FREE_CANCEL_MINUTES;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Aguardando piloto', color: 'bg-yellow-500' };
      case 'accepted':
        return { label: 'Piloto a caminho', color: 'bg-blue-500' };
      case 'pilot_arriving':
        return { label: 'Piloto no embarque', color: 'bg-green-500' };
      case 'in_progress':
        return { label: 'Em viagem', color: 'bg-primary' };
      default:
        return { label: status, color: 'bg-muted' };
    }
  };

  const handleResume = () => {
    if (userType === 'passenger') {
      if (ride.status === 'pending') {
        navigate('/passenger/searching', { replace: true });
      } else if (ride.status === 'accepted' || ride.status === 'pilot_arriving') {
        navigate('/passenger/tracking', { state: { rideId: ride.id }, replace: true });
      } else if (ride.status === 'in_progress') {
        navigate('/passenger/in-ride', { state: { rideId: ride.id }, replace: true });
      }
    } else {
      navigate(`/pilot/ride/${ride.id}`, { replace: true });
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const updateData: Record<string, unknown> = {
        status: 'cancelled',
      };

      // Se tiver taxa, registrar quem cancelou e o valor da taxa
      if (hasFee) {
        updateData.cancellation_fee = CANCELLATION_FEE;
        updateData.cancelled_by = userType;
      }

      const { error } = await supabase
        .from('rides')
        .update(updateData)
        .eq('id', ride.id);

      if (error) throw error;

      if (hasFee) {
        toast.warning(`Corrida cancelada. Taxa de R$ ${CANCELLATION_FEE.toFixed(2).replace('.', ',')} aplicada.`);
      } else {
        toast.success('Corrida cancelada sem taxa.');
      }

      onCancelled?.();
    } catch (error) {
      console.error('Erro ao cancelar corrida:', error);
      toast.error('Erro ao cancelar corrida');
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const statusInfo = getStatusLabel(ride.status);

  return (
    <>
      <div className="bg-card rounded-xl shadow-md border border-border p-4 animate-scale-in">
        {/* Header com status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusInfo.color} animate-pulse`} />
            <span className="text-sm font-medium text-foreground">{statusInfo.label}</span>
          </div>
          <span className="text-lg font-bold text-primary">
            R$ {Number(ride.price).toFixed(2).replace('.', ',')}
          </span>
        </div>

        {/* Rota */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center pt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
            <div className="w-0.5 h-6 bg-border my-1" />
            <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <p className="text-xs text-muted">Embarque</p>
              <p className="font-medium text-foreground text-sm truncate">{ride.origin_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Destino</p>
              <p className="font-medium text-foreground text-sm truncate">{ride.destination_name || 'Não definido'}</p>
            </div>
          </div>
        </div>

        {/* Info de tempo */}
        {ride.estimated_time && (
          <div className="flex items-center gap-2 text-muted mb-4">
            <Clock className="w-4 h-4" />
            <span className="text-sm">~{ride.estimated_time} min estimados</span>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCancelDialog(true)}
            className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleResume}
            className="flex-1"
          >
            Retomar
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Dialog de confirmação de cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Cancelar corrida?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {hasFee ? (
                  <>
                    <p>
                      Já se passaram mais de {FREE_CANCEL_MINUTES} minutos desde a solicitação.
                    </p>
                    <p className="font-semibold text-destructive">
                      Uma taxa de R$ {CANCELLATION_FEE.toFixed(2).replace('.', ',')} será cobrada.
                    </p>
                  </>
                ) : (
                  <p>
                    Você ainda pode cancelar sem taxa. Restam {FREE_CANCEL_MINUTES - minutesSinceCreation} minutos.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? 'Cancelando...' : hasFee ? `Cancelar (R$ ${CANCELLATION_FEE.toFixed(2).replace('.', ',')})` : 'Cancelar grátis'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ActiveRideCard;
