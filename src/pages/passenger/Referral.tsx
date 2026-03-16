import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Gift, Users, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { useReferral } from '@/hooks/useReferral';
import { toast } from 'sonner';

const Referral = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { referralCode, pendingDiscounts, hasDiscount, loading } = useReferral(user?.id);
  const [copied, setCopied] = useState(false);

  const fallbackCopy = (text: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    document.body.removeChild(ta);
  };

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
    } catch {
      fallbackCopy(referralCode);
    }
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const referralLink = referralCode
    ? `${window.location.origin}/auth/passenger?ref=${referralCode}`
    : null;

  const handleShare = async () => {
    if (!referralLink) return;
    const text = `Viaje de barco na Ilha de Gigoia com o Gamma! Use meu link e ganhe 30% de desconto na primeira corrida 🚤`;
    if (navigator.share) {
      await navigator.share({ title: 'Gamma — Transporte aquático', text, url: referralLink });
    } else {
      try {
        await navigator.clipboard.writeText(referralLink);
      } catch {
        fallbackCopy(referralLink);
      }
      toast.success('Link copiado para compartilhar!');
    }
  };

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      fallbackCopy(referralLink);
    }
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Indicar Amigos</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pb-8">
        {/* Hero */}
        <div className="py-8 flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Gift className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Indique e Ganhe</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            Compartilhe seu código com amigos. Quando alguém se cadastrar usando o seu código,
            você ganha <strong className="text-foreground">30% de desconto</strong> em uma corrida.
          </p>
        </div>

        {/* Referral code card */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Seu código</p>
          {loading ? (
            <div className="h-10 bg-muted/20 rounded-xl animate-pulse" />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted/10 rounded-xl px-4 py-3 font-mono font-bold text-2xl text-center tracking-widest text-foreground">
                  {referralCode ?? '—'}
                </div>
                <button
                  onClick={handleCopy}
                  className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center active:scale-95 transition-transform shrink-0"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              {/* Referral link */}
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-muted truncate bg-muted/10 rounded-lg px-3 py-2 font-mono">
                  {referralLink ?? ''}
                </p>
                <button
                  onClick={handleCopyLink}
                  className="text-xs text-primary font-medium shrink-0 px-3 py-2 rounded-lg bg-primary/10 active:opacity-70"
                >
                  Copiar link
                </button>
              </div>
            </>
          )}
        </div>

        {/* Share button */}
        <Button variant="default" size="lg" fullWidth onClick={handleShare} className="mb-6 h-14 text-base">
          <Users className="w-5 h-5 mr-2" />
          Compartilhar com amigos
        </Button>

        {/* How it works */}
        <div className="bg-muted/10 rounded-2xl p-4 mb-6">
          <h3 className="font-semibold text-sm text-foreground mb-3">Como funciona</h3>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Compartilhe seu código com um amigo' },
              { step: '2', text: 'Seu amigo se cadastra e usa o código' },
              { step: '3', text: 'Você ganha 30% off em qualquer corrida' },
              { step: '4', text: 'Sem limite — indique quantos quiser!' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </div>
                <p className="text-sm text-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Available discounts */}
        {hasDiscount && (
          <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-sm text-green-700 dark:text-green-400">
                Descontos disponíveis
              </h3>
            </div>
            <div className="space-y-2">
              {pendingDiscounts.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-green-500/10 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{d.discount_percent}% de desconto</span>
                  <span className="text-xs text-muted">
                    Válido — aplica automaticamente
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">
              O desconto é aplicado automaticamente na próxima corrida confirmada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Referral;
