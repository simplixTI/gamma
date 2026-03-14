import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Loader2, Clock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { DbRide } from '@/types';
import StarRating from '@/components/StarRating';
import PaymentModal from '@/components/PaymentModal';
import SimplixFooter from '@/components/SimplixFooter';

const tipOptions = [2, 5, 10];

const triggerConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#00A8E8', '#FFD700', '#00D4AA'],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#00A8E8', '#FFD700', '#00D4AA'],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
};

// Calculate real trip duration in minutes
const calculateTripDuration = (startedAt: string | null, completedAt: string | null): number | null => {
  if (!startedAt || !completedAt) return null;
  
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  return diffMins > 0 ? diffMins : 1;
};

const Completed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setRideStatus, setOrigin, setDestination, setCurrentPilot } = useApp();
  const { user, passengerProfile } = useAuthContext();
  
  const [rating, setRating] = useState(0);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [rideData, setRideData] = useState<DbRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [payingWithWallet, setPayingWithWallet] = useState(false);

  const rideId = location.state?.rideId;

  // Fetch ride data, payment status, and wallet balance
  useEffect(() => {
    if (!rideId) {
      setLoading(false);
      return;
    }

    const checkRideAndPayment = async () => {
      const [rideResult, walletResult] = await Promise.all([
        supabase.from('rides').select('*').eq('id', rideId).single(),
        user?.id
          ? supabase
              .from('passenger_profiles')
              .select('wallet_balance')
              .eq('user_id', user.id)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      if (rideResult.data) {
        setRideData(rideResult.data as DbRide);

        const { data: payment } = await supabase
          .from('payments')
          .select('status')
          .eq('ride_id', rideId)
          .eq('status', 'completed')
          .maybeSingle();

        if (payment || (rideResult.data as DbRide).payment_status === 'paid') {
          setIsPaid(true);
        } else {
          setShowPaymentModal(true);
        }
      }

      if (walletResult.data) {
        setWalletBalance(Number(walletResult.data.wallet_balance));
      }

      setLoading(false);
    };

    checkRideAndPayment();
  }, [rideId, user?.id]);

  const handlePayWithWallet = async () => {
    if (!rideId || !user?.id || !rideData) return;
    setPayingWithWallet(true);
    try {
      const { error } = await supabase.rpc('debit_wallet', {
        p_user_id: user.id,
        p_amount: Number(rideData.price),
        p_description: `Corrida: ${rideData.origin_name} → ${rideData.destination_name || 'Destino'}`,
        p_ride_id: rideId,
      });
      if (error) throw error;

      // Mark ride as paid
      await supabase
        .from('rides')
        .update({ payment_status: 'paid' })
        .eq('id', rideId);

      setIsPaid(true);
      toast.success('Pago com Gamma Cash!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao pagar';
      toast.error(msg);
    } finally {
      setPayingWithWallet(false);
    }
  };

  // Trigger confetti when 5 stars AND tip is selected
  useEffect(() => {
    if (rating === 5 && selectedTip && !confettiTriggered) {
      triggerConfetti();
      setConfettiTriggered(true);
    }
  }, [rating, selectedTip, confettiTriggered]);

  const resetState = () => {
    setRideStatus('idle');
    setOrigin(null);
    setDestination(null);
    setCurrentPilot(null);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Por favor, selecione uma avaliação');
      return;
    }

    setIsSubmitting(true);
    try {
      if (rideId && user?.id && rideData?.pilot_user_id) {
        const { error } = await supabase
          .from('ride_reviews')
          .insert({
            ride_id: rideId,
            reviewer_id: user.id,
            reviewee_id: rideData.pilot_user_id,
            reviewer_role: 'passenger',
            stars: rating,
            comment: comment || null,
          });
        if (error) throw error;

        // Gravar tip na corrida (campo existente, mantém compatibilidade)
        if (selectedTip) {
          await supabase
            .from('rides')
            .update({ tip: selectedTip })
            .eq('id', rideId);
        }
      }
      toast.success('Obrigado pela avaliação!');
      resetState();
      navigate('/passenger');
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    resetState();
    navigate('/passenger');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const originName = rideData?.origin_name || 'Origem';
  const destinationName = rideData?.destination_name || 'Destino';
  const pilotName = rideData?.pilot_name || 'Piloto';
  const price = rideData ? Number(rideData.price) : 0;
  const estimatedTime = rideData?.estimated_time || 0;
  const realTripTime = calculateTripDuration(rideData?.started_at || null, rideData?.completed_at || null);

  return (
    <>
    {rideId && !isPaid && (
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        rideId={rideId}
        amount={price}
        passengerDeviceId={user?.id || rideData?.passenger_device_id || ''}
        pilotId={rideData?.pilot_user_id || undefined}
        passengerEmail={passengerProfile?.email || user?.email || ''}
        passengerName={passengerProfile?.full_name || undefined}
        passengerCpf={passengerProfile?.cpf || undefined}
        onPaymentComplete={() => {
          setIsPaid(true);
          setShowPaymentModal(false);
          toast.success('Pagamento confirmado!');
        }}
      />
    )}
    <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center p-3 safe-area-inset">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-elevated p-5 animate-scale-in">
        {/* Success icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-success-foreground" strokeWidth={3} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-foreground text-center mb-2">
          Viagem concluída!
        </h1>
        
        <p className="text-sm text-muted text-center mb-4">
          Obrigado por viajar com {pilotName}
        </p>

        {/* Trip summary */}
        <div className="bg-background rounded-xl p-3 mb-5">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted text-xs">De</span>
            <span className="font-medium text-foreground text-sm truncate ml-2 max-w-[60%] text-right">{originName}</span>
          </div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted text-xs">Para</span>
            <span className="font-medium text-foreground text-sm truncate ml-2 max-w-[60%] text-right">{destinationName}</span>
          </div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted text-xs">Tempo da viagem</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-secondary" />
              <span className="font-medium text-foreground text-sm">
                {realTripTime ? `${realTripTime} minutos` : `~${estimatedTime} minutos`}
              </span>
            </div>
          </div>
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-muted text-xs">Valor da corrida</span>
              <span className="font-medium text-foreground">
                R$ {price.toFixed(2).replace('.', ',')}
              </span>
            </div>
            {selectedTip && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted text-xs">Gorjeta</span>
                <span className="font-medium text-success">
                  + R$ {selectedTip.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>
          
          {/* Payment status */}
          {isPaid ? (
            <div className="bg-success/10 border border-success/30 rounded-lg p-2 mt-3 flex items-center justify-center gap-2 text-success">
              <Check className="w-4 h-4" />
              <span className="text-xs font-medium">Pagamento confirmado</span>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {walletBalance !== null && walletBalance >= price && (
                <button
                  onClick={handlePayWithWallet}
                  disabled={payingWithWallet}
                  className="w-full bg-primary/10 border border-primary/30 rounded-lg p-2.5 flex items-center justify-between text-primary active:bg-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    <span className="text-xs font-medium">Pagar com Gamma Cash</span>
                  </div>
                  {payingWithWallet ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span className="text-xs font-bold">
                      R$ {walletBalance.toFixed(2).replace('.', ',')} disponível
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-destructive/10 border border-destructive/30 rounded-lg p-2 flex items-center justify-center gap-2 text-destructive"
              >
                <span className="text-xs font-medium">⚠️ Pagar com PIX</span>
              </button>
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="mb-5">
          <p className="text-center text-foreground font-medium text-sm mb-2">
            Como foi sua viagem?
          </p>
          <StarRating value={rating} onChange={setRating} size="lg" />
          {rating > 0 && (
            <p className="text-center text-sm text-muted mt-2">
              {rating === 5 ? '⭐ Excelente!' : rating >= 4 ? '😊 Boa viagem!' : rating >= 3 ? '👍 OK' : '😐 Pode melhorar'}
            </p>
          )}
        </div>

        {/* Comment */}
        <textarea
          placeholder="Deixe um comentário (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full bg-background border border-border rounded-xl p-2.5 resize-none h-16 mb-4 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
        />

        {/* Tip */}
        <div className="mb-5">
          <p className="text-center text-foreground font-medium text-sm mb-2">
            Dar gorjeta ao piloto 💰
          </p>
          <div className="flex justify-center gap-2">
            {tipOptions.map((tip) => (
              <button
                key={tip}
                onClick={() => setSelectedTip(selectedTip === tip ? null : tip)}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                  selectedTip === tip
                    ? 'bg-success text-success-foreground shadow-md'
                    : 'bg-background text-foreground border border-border hover:border-success/50'
                }`}
              >
                R$ {tip}
              </button>
            ))}
          </div>
          {selectedTip && (
            <p className="text-center text-xs text-success mt-2 font-medium">
              Obrigado! O piloto ficará muito feliz 🙏
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="h-11"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar avaliação'
            )}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-muted h-10 text-sm"
          >
            Pular
          </Button>
        </div>
        <SimplixFooter />
      </div>
    </div>
    </>
  );
};

export default Completed;
