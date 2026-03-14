import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check, Clock, QrCode, CreditCard, Loader2, Star, ChevronDown, ChevronUp, Plus } from 'lucide-react';
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
  const [tab, setTab] = useState<PaymentTab>(initialTab);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

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

  const totalAmount = amount + tip;

  const loadSavedCards = useCallback(async () => {
    if (!user?.id) return;
    setSavedCardsLoading(true);
    const { data } = await supabase
      .from('saved_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) {
      setSavedCards(data as SavedCard[]);
      // Auto-select default card
      const def = (data as SavedCard[]).find((c) => c.is_default);
      if (def) setSelectedSavedCard(def);
    }
    setSavedCardsLoading(false);
  }, [user?.id]);

  // Sync tab with initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && rideId && tab === 'pix' && !pixData) {
      createPixPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, rideId, tab, pixData]);

  useEffect(() => {
    if (isOpen && tab === 'card') {
      loadSavedCards();
    }
  }, [isOpen, tab, loadSavedCards]);

  const createPixPayment = async () => {
    setPixLoading(true);
    setPixData(null);
    try {
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
      toast.error('Erro ao gerar pagamento PIX');
    } finally {
      setPixLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!pixData?.copyPaste) return;
    try {
      await navigator.clipboard.writeText(pixData.copyPaste);
    } catch {
      // Fallback for HTTP or when Clipboard API permission is denied
      const ta = document.createElement('textarea');
      ta.value = pixData.copyPaste;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleConfirmPix = async () => {
    setCheckingPayment(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'completed', paid_at: new Date().toISOString() })
        .eq('ride_id', rideId)
        .eq('status', 'pending');

      if (error) throw error;

      toast.success('Pagamento confirmado!');
      onPaymentComplete?.();
      onClose();
    } catch (err) {
      console.error('Error confirming payment:', err);
      toast.error('Erro ao confirmar pagamento');
    } finally {
      setCheckingPayment(false);
    }
  };

  const persistSavedCard = async (cardData: {
    last_four: string;
    brand: string;
    holder_name: string;
    expiry_month: string;
    expiry_year: string;
  }) => {
    if (!user?.id) return;
    const isFirst = savedCards.length === 0;
    await supabase.from('saved_cards').insert({
      user_id: user.id,
      last_four: cardData.last_four,
      brand: cardData.brand,
      holder_name: cardData.holder_name,
      expiry_month: cardData.expiry_month,
      expiry_year: cardData.expiry_year,
      is_default: isFirst,
    });
  };

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
        },
      });

      if (error) throw error;

      if (data.success && data.status === 'approved') {
        if (saveCard) {
          await persistSavedCard({
            last_four: rawNumber.slice(-4),
            brand: data.brand || 'unknown',
            holder_name: card.name.trim(),
            expiry_month: expiryMonth,
            expiry_year: expiryYear,
          });
        }
        setCardResult({ success: true, message: 'Pagamento aprovado!' });
        toast.success('Pagamento aprovado!');
        setTimeout(() => {
          onPaymentComplete?.();
          onClose();
        }, 1500);
      } else if (data.status === 'in_process') {
        setCardResult({ success: true, message: 'Pagamento em análise. Você receberá uma confirmação em breve.' });
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
        setCardResult({ success: true, message: 'Pagamento em análise. Você receberá uma confirmação em breve.' });
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
          <p className="text-sm text-muted">Valor total</p>
          <p className="text-4xl font-bold text-foreground">
            R$ {totalAmount.toFixed(2).replace('.', ',')}
          </p>
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
                  <div className="bg-white rounded-2xl p-6 mb-4 flex flex-col items-center">
                    {pixData.qrCode ? (
                      <img
                        src={pixData.qrCode.startsWith('data:') ? pixData.qrCode : `data:image/png;base64,${pixData.qrCode}`}
                        alt="QR Code PIX"
                        className="w-48 h-48 rounded-xl mb-3"
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
                    <Button variant="ghost" fullWidth onClick={createPixPayment}>
                      Gerar novo código
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <p className="text-destructive mb-4">Erro ao gerar pagamento</p>
                  <Button variant="outline" onClick={createPixPayment}>Tentar novamente</Button>
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
                            type="text"
                            inputMode="numeric"
                            placeholder="123"
                            maxLength={4}
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
                            type="text"
                            inputMode="numeric"
                            placeholder="123"
                            maxLength={4}
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
