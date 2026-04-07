import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, Check, Clock, QrCode, CreditCard, Loader2, Star, ChevronDown, ChevronUp, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { SavedCard, getCardBrandIcon } from '@/pages/passenger/SavedCards';

type PaymentTab = 'pix' | 'card';

interface CardState {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}

interface PixData {
  qrCode: string | null;
  copyPaste: string;
  paymentId: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  amount: number;
  tip?: number;
  initialTab?: PaymentTab;
  passengerDeviceId: string;
  pilotId?: string;
  passengerName?: string;
  passengerCpf?: string;
  passengerEmail?: string;
  onPaymentComplete?: () => void;
}

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

const brandColors: Record<string, string> = {
  visa: 'bg-blue-600',
  mastercard: 'bg-red-600',
  elo: 'bg-yellow-500',
  amex: 'bg-green-600',
  hipercard: 'bg-red-700',
};

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  rideId,
  amount,
  tip = 0,
  initialTab = 'pix',
  passengerDeviceId,
  pilotId,
  passengerName,
  passengerCpf,
  passengerEmail,
  onPaymentComplete,
}) => {
  const { user } = useAuthContext();
  const pixCreationInProgressRef = useRef(false);
  const pixConfirmInProgressRef = useRef(false);
  const [tab, setTab] = useState<PaymentTab>(initialTab);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);

  const [card, setCard] = useState<CardState>({ number: '', name: '', expiry: '', cvv: '' });
  const [cardLoading, setCardLoading] = useState(false);
  const [cardResult, setCardResult] = useState<{ success: boolean; message: string } | null>(null);

  // Saved cards state
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [savedCardsLoading, setSavedCardsLoading] = useState(false);
  const [selectedSavedCard, setSelectedSavedCard] = useState<SavedCard | null>(null);
  const [savedCardCvv, setSavedCardCvv] = useState('');
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [saveCard, setSaveCard] = useState(false);

  // Resolved amount fetched from DB if needed
  const [resolvedAmount, setResolvedAmount] = useState(0);

  const totalAmount = (resolvedAmount || amount) + tip;

  const loadSavedCards = useCallback(async () => {
    if (!user?.id) return;
    setSavedCardsLoading(true);
    const { data, error: scError } = await supabase
      .from('saved_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (scError) {
      console.error('Failed to load saved cards:', scError);
      toast.error('Não foi possível carregar cartões salvos.');
    }
    if (data) {
      setSavedCards(data as SavedCard[]);
      // Auto-select default card
      const def = (data as SavedCard[]).find((c) => c.is_default);
      if (def) setSelectedSavedCard(def);
    }
    setSavedCardsLoading(false);
  }, [user?.id]);

  // Reset state when modal closes or rideId changes (prevents stale QR from previous ride)
  useEffect(() => {
    if (!isOpen) {
      setPixData(null);
      setCardResult(null);
      setCard({ number: '', name: '', expiry: '', cvv: '' });
      setSavedCardCvv('');
      setShowNewCardForm(false);
      setResolvedAmount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setPixData(null);
  }, [rideId]);

  // Sync tab with initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Fetch ride price from DB if amount is 0 (fixes private browsing issue)
  useEffect(() => {
    if (!isOpen || !rideId) return;

    // If amount is already provided and > 0, use it
    if (amount > 0) {
      setResolvedAmount(amount);
      return;
    }

    // Otherwise fetch price from DB
    const fetchRidePrice = async () => {
      try {
        const { data, error } = await supabase
          .from('rides')
          .select('price')
          .eq('id', rideId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching ride price:', error);
          return;
        }

        if (data?.price) {
          setResolvedAmount(Number(data.price));
        }
      } catch (err) {
        console.error('Error fetching ride price:', err);
      }
    };

    fetchRidePrice();
  }, [isOpen, rideId, amount]);

  useEffect(() => {
    if (isOpen && rideId && tab === 'pix') {
      createPixPayment();
    }
    // pixData intentionally omitted — including it causes duplicate PIX creation
    // when createPixPayment resets pixData to null before the API call completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, rideId, tab]);

  useEffect(() => {
    if (isOpen && tab === 'card') {
      loadSavedCards();
    }
  }, [isOpen, tab, loadSavedCards]);

  const createPixPayment = async () => {
    if (pixCreationInProgressRef.current) return;

    // Guard: prevent PIX generation when resolved amount is still 0
    if (totalAmount <= 0) {
      setPixError('Valor da corrida não disponível. Feche e tente novamente.');
      setPixLoading(false);
      pixCreationInProgressRef.current = false;
      return;
    }

    pixCreationInProgressRef.current = true;
    setPixLoading(true);
    setPixError(null);
    try {
      // Ensure session is fresh before invoking function (prevents 401 from expired JWT)
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Token refresh warning:', refreshError);
        // Continue anyway — supabase.functions.invoke will use current token
      }

      const { data, error } = await supabase.functions.invoke('mp-create-payment', {
        body: {
          rideId,
          amount: totalAmount,
          paymentMethod: 'pix',
          passengerEmail: passengerEmail || '',
          passengerName,
          passengerCpf,
          passengerDeviceId,
          pilotId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao criar pagamento');

      setPixData({
        qrCode: data.qrCode || null,
        copyPaste: data.copyPaste || '',
        paymentId: data.paymentId,
      });
    } catch (err) {
      console.error('Error creating PIX payment:', err);
      setPixError('Não foi possível gerar o código PIX. Tente novamente.');
    } finally {
      setPixLoading(false);
      pixCreationInProgressRef.current = false;
    }
  };

  const handleCopy = async () => {
    if (!pixData?.copyPaste) return;
    try {
      await navigator.clipboard.writeText(pixData.copyPaste);
      toast.success('Código PIX copiado!');
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for Capacitor/mobile when Clipboard API fails
      const textArea = document.createElement('textarea');
      textArea.value = pixData.copyPaste;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Código PIX copiado!');
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        toast.error('Não foi possível copiar. Copie manualmente.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleConfirmPix = async () => {
    if (pixConfirmInProgressRef.current) return;
    pixConfirmInProgressRef.current = true;
    setCheckingPayment(true);
    try {
      // Primary check: ride payment_status
      const { data: ride } = await supabase
        .from('rides')
        .select('payment_status')
        .eq('id', rideId)
        .maybeSingle();

      if (ride?.payment_status === 'paid') {
        toast.success('Pagamento confirmado!');
        setPixConfirmed(true);
        setTimeout(() => {
          onPaymentComplete?.();
          onClose();
        }, 1500);
        return;
      }

      // Fallback check: payment status directly (in case ride update failed)
      if (pixData?.paymentId) {
        const { data: payment } = await supabase
          .from('payments')
          .select('status')
          .eq('id', pixData.paymentId)
          .maybeSingle();

        if (payment?.status === 'completed') {
          // Payment confirmed but ride not updated — force update and proceed
          await supabase.from('rides').update({ payment_status: 'paid' }).eq('id', rideId);
          toast.success('Pagamento confirmado!');
          setPixConfirmed(true);
          setTimeout(() => {
            onPaymentComplete?.();
            onClose();
          }, 1500);
          return;
        }
      }

      toast.info('Pagamento ainda não detectado. Aguarde alguns segundos e tente novamente.');
    } catch (err) {
      console.error('Error checking payment:', err);
      toast.error('Erro ao verificar pagamento. Tente novamente.');
    } finally {
      setCheckingPayment(false);
      pixConfirmInProgressRef.current = false;
    }
  };

  // Auto-poll ride payment_status every 5s after PIX QR is generated
  // Uses rides table instead of payments to avoid RLS policy issues
  useEffect(() => {
    if (!rideId || !isOpen || pixConfirmed || !pixData) return;
    setAwaitingPayment(true);

    const interval = setInterval(async () => {
      try {
        // Primary check: ride payment status
        const { data: ride } = await supabase
          .from('rides')
          .select('payment_status')
          .eq('id', rideId)
          .maybeSingle();

        if (ride?.payment_status === 'paid') {
          clearInterval(interval);
          setAwaitingPayment(false);
          setPixConfirmed(true);
          setTimeout(() => {
            onPaymentComplete?.();
            onClose();
          }, 2000);
          return;
        }

        // Fallback check: payment status directly (in case ride update failed)
        if (pixData?.paymentId) {
          const { data: payment } = await supabase
            .from('payments')
            .select('status')
            .eq('id', pixData.paymentId)
            .maybeSingle();

          if (payment?.status === 'completed') {
            // Payment confirmed but ride not updated — force update and proceed
            await supabase.from('rides').update({ payment_status: 'paid' }).eq('id', rideId);
            clearInterval(interval);
            setAwaitingPayment(false);
            setPixConfirmed(true);
            setTimeout(() => {
              onPaymentComplete?.();
              onClose();
            }, 2000);
          }
        }
      } catch {
        // silent — will retry next interval
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      setAwaitingPayment(false);
    };
  }, [rideId, isOpen, pixConfirmed, pixData, onPaymentComplete, onClose]);

  // Reset pixConfirmed when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPixConfirmed(false);
      setAwaitingPayment(false);
    }
  }, [isOpen]);

  // NOTE: Card saving is handled entirely server-side in mp-tokenize-and-pay
  // (via the MP Customers API, which stores mp_card_id + mp_customer_id).
  // A client-side persistSavedCard function was previously here but has been removed —
  // it saved cards without mp_card_id/mp_customer_id, creating records that would
  // immediately require re-entry (the requiresFullCard fallback path).

  const handleCardPayment = async () => {
    const rawNumber = card.number.replace(/\s/g, '');
    if (rawNumber.length < 13 || !card.name || !card.expiry || card.cvv.length < 3) {
      toast.error('Preencha todos os dados do cartão');
      return;
    }

    const [expiryMonth, expiryYear] = card.expiry.split('/');
    if (!expiryMonth || !expiryYear) {
      toast.error('Data de validade inválida');
      return;
    }

    setCardLoading(true);
    setCardResult(null);

    try {
      // Ensure session is fresh before invoking function (prevents 401 from expired JWT)
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Token refresh warning:', refreshError);
        // Continue anyway — supabase.functions.invoke will use current token
      }

      const { data, error } = await supabase.functions.invoke('mp-tokenize-and-pay', {
        body: {
          cardNumber: rawNumber,
          cardholderName: card.name.trim(),
          expiryMonth,
          expiryYear,
          cvv: card.cvv,
          rideId,
          amount: totalAmount,
          passengerEmail: passengerEmail || '',
          passengerCpf,
          passengerName,
          passengerDeviceId,
          pilotId,
          saveCard,
        },
      });

      if (error) throw error;

      if (data.success && data.status === 'approved') {
        if (saveCard) {
          // Card was saved server-side via MP Customers API — refresh the list
          await loadSavedCards();
        }
        setCardResult({ success: true, message: 'Pagamento aprovado!' });
        toast.success('Pagamento aprovado!');
        setTimeout(() => {
          onPaymentComplete?.();
          onClose();
        }, 1500);
      } else if (data.status === 'in_process') {
        // Do NOT call onPaymentComplete — the card may still be declined.
        // The webhook will set payment_status='paid' if/when approved.
        toast.info('Pagamento em análise pelo banco. Aguarde a confirmação por e-mail.');
        setCardResult({ success: false, message: 'Aguardando aprovação do banco...' });
      } else {
        const rejectionMessages: Record<string, string> = {
          cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão.',
          cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
          cc_rejected_bad_filled_date: 'Data de validade inválida.',
          cc_rejected_bad_filled_security_code: 'Código de segurança inválido.',
          cc_rejected_call_for_authorize: 'Cartão requer autorização. Entre em contato com o banco.',
          cc_rejected_card_disabled: 'Cartão desabilitado. Entre em contato com o banco.',
          cc_rejected_duplicated_payment: 'Pagamento duplicado detectado.',
        };
        const detail = data.statusDetail || '';
        const msg = rejectionMessages[detail] || 'Pagamento recusado. Verifique os dados ou use outro cartão.';
        setCardResult({ success: false, message: msg });
        toast.error(msg);
      }
    } catch (err) {
      console.error('Card payment error:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao processar cartão';
      setCardResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setCardLoading(false);
    }
  };

  const handleSavedCardPayment = async () => {
    if (!selectedSavedCard || savedCardCvv.length < 3) {
      toast.error('Informe o CVV do cartão');
      return;
    }

    setCardLoading(true);
    setCardResult(null);

    try {
      // Ensure session is fresh before invoking function (prevents 401 from expired JWT)
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Token refresh warning:', refreshError);
        // Continue anyway — supabase.functions.invoke will use current token
      }

      const { data, error } = await supabase.functions.invoke('mp-tokenize-and-pay', {
        body: {
          savedCardId: selectedSavedCard.id,
          cvv: savedCardCvv,
          rideId,
          amount: totalAmount,
          passengerEmail: passengerEmail || '',
          passengerCpf,
          passengerName,
          passengerDeviceId,
          pilotId,
        },
      });

      if (error) throw error;

      if (data.requiresFullCard) {
        // MP Customers API not integrated — fall back to full card form
        toast.info('Por favor, insira os dados completos do cartão.');
        setShowNewCardForm(true);
        setSelectedSavedCard(null);
        return;
      }

      if (data.success && data.status === 'approved') {
        setCardResult({ success: true, message: 'Pagamento aprovado!' });
        toast.success('Pagamento aprovado!');
        setTimeout(() => {
          onPaymentComplete?.();
          onClose();
        }, 1500);
      } else if (data.status === 'in_process') {
        // Do NOT call onPaymentComplete — the card may still be declined.
        toast.info('Pagamento em análise pelo banco. Aguarde a confirmação por e-mail.');
        setCardResult({ success: false, message: 'Aguardando aprovação do banco...' });
      } else {
        const msg = 'Pagamento recusado. Verifique o CVV ou use outro cartão.';
        setCardResult({ success: false, message: msg });
        toast.error(msg);
      }
    } catch (err) {
      console.error('Saved card payment error:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao processar cartão';
      setCardResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setCardLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasSavedCards = savedCards.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-t-3xl shadow-2xl animate-slide-up safe-area-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Pagamento</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Amount */}
        <div className="text-center pt-4 pb-2">
          {totalAmount <= 0 ? (
            <>
              <p className="text-sm text-destructive">Valor indisponível</p>
              <p className="text-sm text-destructive/80 mt-1">A corrida não possui valor definido</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Valor total</p>
              <p className="text-4xl font-bold text-foreground">
                R$ {totalAmount.toFixed(2).replace('.', ',')}
              </p>
            </>
          )}
        </div>

        {/* Tab selector */}
        <div className="flex mx-4 mt-3 mb-0 rounded-xl bg-muted/20 p-1 gap-1">
          <button
            onClick={() => { setTab('pix'); setCardResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'pix'
                ? 'bg-card shadow text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <QrCode className="w-4 h-4" />
            PIX
          </button>
          <button
            onClick={() => { setTab('card'); setCardResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'card'
                ? 'bg-card shadow text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Cartão
          </button>
        </div>

        <div className="p-6 pt-4 max-h-[70vh] overflow-y-auto">
          {/* PIX Tab */}
          {tab === 'pix' && (
            <>
              {pixLoading ? (
                <div className="flex flex-col items-center py-10">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                  <p className="text-muted text-sm">Gerando QR Code PIX...</p>
                </div>
              ) : pixData ? (
                <>
                  {pixError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Erro ao gerar PIX</p>
                        <p className="text-xs text-destructive/80 mt-1">{pixError}</p>
                      </div>
                    </div>
                  )}
                  <div className="bg-white rounded-2xl p-6 mb-4 flex flex-col items-center">
                    {pixData.qrCode ? (
                      <img
                        src={pixData.qrCode.startsWith('data:') ? pixData.qrCode : `data:image/png;base64,${pixData.qrCode}`}
                        alt="QR Code PIX"
                        className="w-48 h-48 rounded-xl mb-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center mb-3">
                        <QrCode className="w-32 h-32 text-foreground" />
                      </div>
                    )}
                    <p className="text-xs text-muted text-center">
                      Escaneie o QR Code com o app do seu banco
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-4 mb-4">
                    <p className="text-xs text-muted mb-2">Ou copie o código PIX:</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-background rounded-lg px-3 py-2 text-sm font-mono text-foreground truncate">
                        {pixData.copyPaste.substring(0, 30)}...
                      </div>
                      <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                        {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {pixConfirmed ? (
                    <div className="flex flex-col items-center py-6">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-lg font-bold text-green-600">Pagamento confirmado!</p>
                      <p className="text-sm text-muted mt-1">Buscando piloto...</p>
                    </div>
                  ) : (
                    <>
                      {awaitingPayment && (
                        <div className="flex items-center justify-center gap-2 text-primary text-sm mb-3 animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Aguardando confirmação do pagamento...</span>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2 text-muted text-sm mb-5">
                        <Clock className="w-4 h-4" />
                        <span>Expira em 30 minutos</span>
                      </div>

                      <div className="space-y-3">
                        <Button fullWidth size="lg" onClick={handleConfirmPix} disabled={checkingPayment} className="h-14">
                          {checkingPayment ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</>
                          ) : (
                            'Já realizei o pagamento'
                          )}
                        </Button>
                        <Button variant="ghost" fullWidth onClick={createPixPayment} disabled={pixLoading}>
                          {pixLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Gerar novo código
                        </Button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-10">
                  {pixError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4 flex items-start gap-3 text-left">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Erro ao gerar PIX</p>
                        <p className="text-xs text-destructive/80 mt-1">{pixError}</p>
                      </div>
                    </div>
                  )}
                  <Button variant="outline" onClick={() => { setPixError(null); createPixPayment(); }} disabled={pixLoading}>
                    {pixLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Tentar novamente
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Card Tab */}
          {tab === 'card' && (
            <div className="space-y-4">
              {cardResult ? (
                <div className={`rounded-xl p-5 text-center ${cardResult.success ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  <p className={`font-semibold text-base mb-1 ${cardResult.success ? 'text-success' : 'text-destructive'}`}>
                    {cardResult.success ? 'Aprovado' : 'Recusado'}
                  </p>
                  <p className="text-sm text-muted">{cardResult.message}</p>
                  {!cardResult.success && (
                    <Button variant="outline" className="mt-4" onClick={() => setCardResult(null)}>
                      Tentar novamente
                    </Button>
                  )}
                </div>
              ) : savedCardsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Saved cards */}
                  {hasSavedCards && !showNewCardForm && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted font-medium uppercase tracking-wide">Cartões salvos</p>
                      {savedCards.map((sc) => (
                        <button
                          key={sc.id}
                          onClick={() => { setSelectedSavedCard(sc); setSavedCardCvv(''); }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            selectedSavedCard?.id === sc.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className={`w-10 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${brandColors[sc.brand] || 'bg-muted-foreground'}`}>
                            {getCardBrandIcon(sc.brand)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">•••• {sc.last_four}</p>
                            <p className="text-xs text-muted truncate">{sc.holder_name}</p>
                          </div>
                          {sc.is_default && (
                            <Star className="w-3.5 h-3.5 text-primary fill-primary shrink-0" />
                          )}
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selectedSavedCard?.id === sc.id ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                        </button>
                      ))}

                      {/* CVV for selected saved card */}
                      {selectedSavedCard && (
                        <div className="pt-2">
                          <label className="text-xs text-muted block mb-1">CVV do cartão selecionado</label>
                          <input
                            type="password"
                            inputMode="numeric"
                            placeholder="•••"
                            maxLength={4}
                            autoComplete="cc-csc"
                            value={savedCardCvv}
                            onChange={(e) => setSavedCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      )}

                      <Button
                        fullWidth
                        size="lg"
                        onClick={handleSavedCardPayment}
                        disabled={cardLoading || !selectedSavedCard || savedCardCvv.length < 3}
                        className="h-14 mt-2"
                      >
                        {cardLoading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
                        ) : (
                          `Pagar R$ ${totalAmount.toFixed(2).replace('.', ',')}`
                        )}
                      </Button>

                      {/* Toggle to new card form */}
                      <button
                        onClick={() => { setShowNewCardForm(true); setSelectedSavedCard(null); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted hover:text-foreground transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Usar outro cartão
                      </button>
                    </div>
                  )}

                  {/* New card form */}
                  {(!hasSavedCards || showNewCardForm) && (
                    <div className="space-y-4">
                      {showNewCardForm && (
                        <button
                          onClick={() => setShowNewCardForm(false)}
                          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
                        >
                          <ChevronUp className="w-4 h-4" />
                          Usar cartão salvo
                        </button>
                      )}

                      {/* Card number */}
                      <div>
                        <label className="text-xs text-muted block mb-1">Número do cartão</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0000 0000 0000 0000"
                          value={card.number}
                          onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-mono text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      {/* Cardholder name */}
                      <div>
                        <label className="text-xs text-muted block mb-1">Nome no cartão</label>
                        <input
                          type="text"
                          placeholder="NOME SOBRENOME"
                          value={card.name}
                          onChange={(e) => setCard((c) => ({ ...c, name: e.target.value.toUpperCase() }))}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      {/* Expiry + CVV */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted block mb-1">Validade</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="MM/AA"
                            value={card.expiry}
                            onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted block mb-1">CVV</label>
                          <input
                            type="password"
                            inputMode="numeric"
                            placeholder="•••"
                            maxLength={4}
                            autoComplete="cc-csc"
                            value={card.cvv}
                            onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>

                      {/* Save card checkbox */}
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div
                          onClick={() => setSaveCard((v) => !v)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                            saveCard ? 'border-primary bg-primary' : 'border-border bg-background'
                          }`}
                        >
                          {saveCard && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="text-sm text-foreground">Salvar cartão para próximas corridas</span>
                      </label>

                      <Button
                        fullWidth
                        size="lg"
                        onClick={handleCardPayment}
                        disabled={cardLoading}
                        className="h-14 mt-2"
                      >
                        {cardLoading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
                        ) : (
                          `Pagar R$ ${totalAmount.toFixed(2).replace('.', ',')}`
                        )}
                      </Button>

                      <p className="text-xs text-muted text-center">
                        Seus dados são criptografados e processados com segurança pelo Mercado Pago.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
