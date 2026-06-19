import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Plus, ArrowUpRight, ArrowDownLeft, Loader2, RefreshCw, QrCode, Copy, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SimplixFooter from '@/components/SimplixFooter';

type TxType = 'topup' | 'ride_payment' | 'refund' | 'tip';
type TxStatus = 'pending' | 'completed' | 'failed' | 'expired';

interface WalletTx {
  id: string;
  type: TxType;
  amount: number;
  balance_after: number;
  description: string | null;
  status: TxStatus;
  created_at: string;
  completed_at: string | null;
}

const TOP_UP_OPTIONS = [20, 50, 100, 200];

const txLabel: Record<TxType, string> = {
  topup: 'Recarga',
  ride_payment: 'Corrida',
  refund: 'Estorno',
  tip: 'Gorjeta',
};

const WalletPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string; txId: string } | null>(null);
  const [generatingPix, setGeneratingPix] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadWallet = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);

    const [profileResult, txResult] = await Promise.all([
      supabase
        .from('passenger_profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    if (profileResult.data) {
      setBalance(Number(profileResult.data.wallet_balance));
    }
    if (txResult.data) {
      setTransactions(txResult.data as WalletTx[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // Real-time: when a pending top-up transaction completes, update balance
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const tx = payload.new as WalletTx;
          if (tx.status === 'completed') {
            setBalance(tx.balance_after);
            setTransactions((prev) =>
              prev.map((t) => (t.id === tx.id ? tx : t))
            );
            if (tx.type === 'topup') {
              toast.success(`Recarga de R$ ${tx.amount.toFixed(2).replace('.', ',')} confirmada!`);
              setShowTopUp(false);
              setPixData(null);
              setTopUpAmount(null);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[Wallet] Realtime channel error — balance updates may be delayed');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Auto-recovery: if wallet topup transaction stays in 'processing' after PIX is paid,
  // poll its status and force-complete via RPC. Webhook sometimes fails to finalize.
  useEffect(() => {
    if (!pixData?.txId) return;
    let polls = 0;
    const interval = setInterval(async () => {
      polls += 1;
      const { data: tx } = await supabase
        .from('wallet_transactions')
        .select('status')
        .eq('id', pixData.txId)
        .maybeSingle();
      if (tx?.status === 'completed') {
        clearInterval(interval);
        return;
      }
      if (tx?.status === 'processing' && polls >= 3) {
        const { data: result } = await supabase.rpc('complete_stuck_wallet_topup', { p_tx_id: pixData.txId });
        const r = result as { success?: boolean } | null;
        if (r?.success) {
          clearInterval(interval);
          await loadWallet(true);
          toast.success('Recarga confirmada!');
          setShowTopUp(false);
          setPixData(null);
          setTopUpAmount(null);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [pixData?.txId, loadWallet]);

  const handleGeneratePix = async () => {
    if (!topUpAmount || !user?.id) return;
    setGeneratingPix(true);

    try {
      // FIX [MEDIUM]: Remove userId from body — the edge function ignores it and
      // always derives userId from the authenticated JWT. Sending it was misleading.
      const { data, error } = await supabase.functions.invoke('wallet-topup', {
        body: { amount: topUpAmount },
      });

      if (error) throw error;

      if (data.success) {
        setPixData({
          qrCode: data.qrCode,
          copyPaste: data.copyPaste,
          txId: data.transactionId,
        });

        // Edge Function already created the pending wallet_transactions row — refresh silently
        await loadWallet(true);
      } else {
        throw new Error(data.error || 'Erro ao gerar PIX');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar código PIX. Tente novamente.');
    } finally {
      setGeneratingPix(false);
    }
  };

  const handleCopy = async () => {
    if (!pixData?.copyPaste) return;
    try {
      await navigator.clipboard.writeText(pixData.copyPaste);
    } catch {
      // Fallback for HTTP or when Clipboard API is unavailable
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

  const txIcon = (type: TxType, status: TxStatus) => {
    if (status === 'pending') return <Clock className="w-4 h-4 text-muted" />;
    if (type === 'topup' || type === 'refund')
      return <ArrowDownLeft className="w-4 h-4 text-success" />;
    return <ArrowUpRight className="w-4 h-4 text-destructive" />;
  };

  const txAmountColor = (type: TxType, status: TxStatus) => {
    if (status === 'pending') return 'text-muted';
    return type === 'topup' || type === 'refund' ? 'text-success' : 'text-foreground';
  };

  const txAmountSign = (type: TxType) =>
    type === 'topup' || type === 'refund' ? '+' : '-';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 safe-area-top">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Gamma Cash</h1>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadWallet(true)}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>

        {/* Balance card */}
        <div className="bg-primary-foreground/10 rounded-2xl p-5 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 opacity-80" />
            <p className="text-sm opacity-80">Saldo disponível</p>
          </div>
          {loading ? (
            <Loader2 className="w-7 h-7 animate-spin opacity-60" />
          ) : (
            <p className="text-4xl font-bold">
              R$ {(balance ?? 0).toFixed(2).replace('.', ',')}
            </p>
          )}
          <p className="text-xs opacity-60 mt-1">Usado automaticamente nas corridas</p>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Add balance button */}
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => setShowTopUp(true)}
          className="h-12"
        >
          <Plus className="w-5 h-5 mr-2" />
          Adicionar saldo
        </Button>

        {/* Transaction history */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Extrato</h2>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-muted">
              <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma movimentação ainda</p>
              <p className="text-xs mt-1 opacity-70">Adicione saldo para começar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-card rounded-xl p-4 flex items-center gap-3 border border-border"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      tx.status === 'pending'
                        ? 'bg-muted/20'
                        : tx.type === 'topup' || tx.type === 'refund'
                        ? 'bg-success/10'
                        : 'bg-muted/10'
                    }`}
                  >
                    {txIcon(tx.type, tx.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      {txLabel[tx.type]}
                      {tx.status === 'pending' && (
                        <span className="ml-2 text-xs text-muted font-normal">(aguardando)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {tx.description ||
                        format(new Date(tx.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <p className={`font-bold text-sm ${txAmountColor(tx.type, tx.status)}`}>
                    {txAmountSign(tx.type)}R$ {tx.amount.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top-up bottom sheet */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-card rounded-t-3xl shadow-2xl animate-slide-up safe-area-bottom">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Adicionar saldo</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowTopUp(false);
                  setPixData(null);
                  setTopUpAmount(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              {!pixData ? (
                <>
                  <p className="text-sm text-muted mb-4 text-center">
                    Escolha o valor para carregar na sua carteira
                  </p>
                  {/* Preset amounts */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {TOP_UP_OPTIONS.map((val) => (
                      <button
                        key={val}
                        onClick={() => setTopUpAmount(val)}
                        className={`py-4 rounded-xl font-bold text-lg transition-all active:scale-95 border-2 ${
                          topUpAmount === val
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-foreground'
                        }`}
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>

                  {/* Custom amount */}
                  <div className="relative mb-6">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Outro valor"
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 5 && v <= 1000) setTopUpAmount(v);
                      }}
                    />
                  </div>

                  <Button
                    fullWidth
                    size="lg"
                    onClick={handleGeneratePix}
                    disabled={!topUpAmount || generatingPix}
                    className="h-14"
                  >
                    {generatingPix ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando PIX...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5 mr-2" />
                        Gerar PIX {topUpAmount ? `— R$ ${topUpAmount.toFixed(2).replace('.', ',')}` : ''}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                /* PIX QR Code screen */
                <>
                  <div className="text-center mb-5">
                    <p className="text-sm text-muted mb-1">Valor da recarga</p>
                    <p className="text-4xl font-bold text-foreground">
                      R$ {(topUpAmount ?? 0).toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-5 mb-4 flex flex-col items-center">
                    {pixData.qrCode ? (
                      <img
                        src={`data:image/png;base64,${pixData.qrCode}`}
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
                      Escaneie com o app do seu banco
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
                    <span>Expira em 24 horas • O saldo é creditado automaticamente</span>
                  </div>

                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => {
                      setPixData(null);
                      setTopUpAmount(null);
                    }}
                  >
                    Escolher outro valor
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <SimplixFooter />
    </div>
  );
};

export default WalletPage;
