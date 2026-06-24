import { useState, useEffect, useRef } from 'react';
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
import AdDisplay from '@/components/AdDisplay';
import { useReferral } from '@/hooks/useReferral';

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
  const { grantReferralDiscount } = useReferral(user?.id);
  
  const [rating, setRating] = useState(0);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [confirmLowRating, setConfirmLowRating] = useState(false);
  const [rideData, setRideData] = useState<DbRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [payingWithWallet, setPayingWithWallet] = useState(false);
  const payingWithWalletRef = useRef(false);

  const rideId = location.state?.rideId;

  // Note: Do NOT reset origin/destination on unmount. They should persist
  // so user can request another ride. Only reset on logout (handled in AppContext).
  // The Completed page is the END of a ride flow, not the start of a new one.

  // Fetch ride data, payment status, and wallet balance
  useEffect(() => {
    if (!rideId) {
      toast.error('Corrida não encontrada.');
      navigate('/passenger');
      return;
    }

    const checkRideAndPayment = async () => {
      const [rideResult, walletResult] = await Promise.all([
        supabase.from('rides').select('id, status, origin_name, destination_name, pilot_name, pilot_user_id, price, estimated_time, started_at, completed_at, payment_status, payment_method, passenger_device_id').eq('id', rideId).single(),
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId, user?.id, navigate]);

  const handlePayWithWallet = async () => {
    if (payingWithWalletRef.current) return;
    if (!rideId || !user?.id || !rideData) return;
    // Set lock immediately — before any early returns so retry is always possible via finally
    payingWithWalletRef.current = true;
    setPayingWithWallet(true);
    // Prevent concurrent PIX modal from opening while wallet payment is in-flight
    setShowPaymentModal(false);
    const price = Number(rideData.price);
    try {
      const { data: result, error } = await supabase.rpc('pay_ride_with_wallet', {
        p_user_id: user.id,
        p_ride_id: rideId,
        p_amount: Number(rideData.price),
        p_description: `Corrida de ${rideData.origin_name || 'origem'} para ${rideData.destination_name || 'destino'}`,
      });

      if (error) throw error;

      if (!result?.success) {
        if (result?.error === 'insufficient_balance') {
          toast.error(`Saldo insuficiente. Você tem R$ ${result.balance?.toFixed(2).replace('.', ',')} mas a corrida custa R$ ${Number(rideData.price).toFixed(2).replace('.', ',')}.`);
        } else if (result?.error === 'already_paid') {
          toast.info('Esta corrida já foi paga.');
          setIsPaid(true);
        } else {
          throw new Error(result?.error || 'Falha no pagamento');
        }
        return;
      }

      setIsPaid(true);
      toast.success('Pagamento realizado com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao pagar';
      toast.error(msg);
    } finally {
      setPayingWithWallet(false);
      payingWithWalletRef.current = false;
    }
  };

  // Grant referral discount to the referrer when this passenger completes their first ride
  useEffect(() => {
    if (isPaid && user?.id) {
      grantReferralDiscount(user.id).catch(() => {
        // Silent fail — referral grant failure should never block the user
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaid, user?.id]);

  // Dispara emails de recibo (passageiro + piloto) via Resend.
  // Idempotente server-side via ride_emails_sent — re-render nao reenvia.
  // Fire-and-forget: falha de email nao bloqueia UX.
  const emailDispatchedRef = useRef(false);
  useEffect(() => {
    if (!isPaid || !rideId || emailDispatchedRef.current) return;
    emailDispatchedRef.current = true;
    supabase.functions.invoke('send-ride-emails', { body: { ride_id: rideId } })
      .catch((err) => console.warn('[send-ride-emails] failed:', err));
  }, [isPaid, rideId]);

  // Trigger confetti when 5 stars are given
  useEffect(() => {
    if (rating === 5 && !confettiTriggered) {
      triggerConfetti();
      setConfettiTriggered(true);
    }
  }, [rating, confettiTriggered]);

  const resetState = () => {
    // Only reset ride-specific state. Keep origin/destination so user can
    // immediately request another ride with the same route if desired.
    setRideStatus('idle');
    setCurrentPilot(null);
    // DO NOT clear setOrigin/setDestination — they should persist for next ride
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Por favor, selecione uma avaliação');
      return;
    }

    if (rating <= 2 && !confirmLowRating) {
      setConfirmLowRating(true);
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

        // Cobrar gorjeta do saldo (atômico: debita carteira + grava rides.tip + wallet_transactions)
        if (isPaid && selectedTip) {
          const { data: tipResult, error: tipError } = await supabase.rpc('tip_ride_with_wallet', {
            p_user_id: user.id,
            p_ride_id: rideId,
            p_amount: selectedTip,
          });

          if (tipError) throw tipError;

          if (!tipResult?.success) {
            const code = tipResult?.error;
            if (code === 'insufficient_balance') {
              const bal = Number(tipResult?.balance ?? 0);
              toast.error(`Saldo insuficiente para gorjeta. Você tem R$ ${bal.toFixed(2).replace('.', ',')}.`);
            } else if (code === 'tip_already_given') {
              toast.info('Gorjeta já enviada para esta corrida.');
            } else if (code === 'ride_not_paid') {
              toast.error('Corrida ainda não foi paga.');
            } else {
              toast.error('Não foi possível processar a gorjeta.');
            }
            return;
          }

          setWalletBalance(Number(tipResult.balance_after));
          toast.success(`Gorjeta de R$ ${selectedTip.toFixed(2).replace('.', ',')} enviada!`);
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
        tip={selectedTip ?? 0}
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
                  disabled={payingWithWallet || isPaid}
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
                <span className="text-xs font-medium">Pagar com PIX</span>
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
              {rating === 5 ? 'Excelente!' : rating >= 4 ? 'Boa viagem!' : rating >= 3 ? 'OK' : 'Pode melhorar'}
            </p>
          )}
        </div>

        {/* Comment */}
        <textarea
          placeholder="Deixe um comentário (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={300}
          className="w-full bg-background border border-border rounded-xl p-2.5 resize-none h-16 mb-4 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
        />

        {/* Tip — only available after wallet payment (PIX/cartão not supported) */}
        {isPaid && rideData?.payment_method === 'wallet' && <div className="mb-5">
          <p className="text-center text-foreground font-medium text-sm mb-1">
            Dar gorjeta ao piloto
          </p>
          <p className="text-center text-xs text-muted mb-2">
            Saldo: R$ {(walletBalance ?? 0).toFixed(2).replace('.', ',')}
          </p>
          <div className="flex justify-center gap-2">
            {tipOptions.map((tip) => {
              const canAfford = (walletBalance ?? 0) >= tip;
              return (
                <button
                  key={tip}
                  disabled={!canAfford}
                  onClick={() => setSelectedTip(selectedTip === tip ? null : tip)}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                    !canAfford
                      ? 'bg-muted/20 text-muted-foreground/60 cursor-not-allowed border border-border'
                      : selectedTip === tip
                      ? 'bg-success text-success-foreground shadow-md'
                      : 'bg-background text-foreground border border-border hover:border-success/50'
                  }`}
                >
                  R$ {tip}
                </button>
              );
            })}
          </div>
          {selectedTip && (
            <p className="text-center text-xs text-success mt-2 font-medium">
              Será descontado R$ {selectedTip.toFixed(2).replace('.', ',')} do seu saldo
            </p>
          )}
          {!selectedTip && (walletBalance ?? 0) < tipOptions[0] && (
            <p className="text-center text-xs text-muted mt-2">
              Adicione saldo na carteira para dar gorjeta
            </p>
          )}
        </div>}

        {/* PIX/cartão: informa que gorjeta exige saldo na carteira */}
        {isPaid && rideData?.payment_method && rideData.payment_method !== 'wallet' && (
          <div className="mb-5 bg-muted/30 border border-border rounded-xl p-3">
            <p className="text-center text-xs text-muted-foreground">
              Pagamentos por {rideData.payment_method === 'pix' ? 'PIX' : 'cartão'} não suportam gorjeta.
              Para dar gorjeta, adicione saldo na carteira na próxima corrida.
            </p>
          </div>
        )}

        {/* Low rating confirmation inline banner */}
        {confirmLowRating && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 mb-3 text-center animate-scale-in">
            <p className="text-sm font-semibold text-foreground mb-1">
              Confirmar {rating} estrela{rating > 1 ? 's' : ''}?
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Isso será enviado ao piloto como feedback.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLowRating(false)}
                className="flex-1 py-2 rounded-xl border border-border text-sm font-medium text-foreground active:bg-muted/20 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setConfirmLowRating(false); handleSubmit(); }}
                className="flex-1 py-2 rounded-xl bg-warning text-warning-foreground text-sm font-semibold active:opacity-90 cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        )}

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
        <AdDisplay position="completed" />
        <SimplixFooter />
      </div>
    </div>
    </>
  );
};

export default Completed;
