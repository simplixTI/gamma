import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, QrCode, Wallet, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Payment = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-4 safe-area-top">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Pagamento</h1>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {/* Gamma Cash */}
        <button
          onClick={() => navigate('/passenger/wallet')}
          className="w-full bg-card rounded-xl p-4 flex items-center gap-4 border border-border active:scale-[0.98] transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-foreground">Gamma Cash</p>
            <p className="text-sm text-muted">Saldo em carteira — usado automaticamente</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted" />
        </button>

        {/* PIX */}
        <div className="w-full bg-card rounded-xl p-4 flex items-center gap-4 border border-border">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-foreground">PIX</p>
            <p className="text-sm text-muted">Disponivel ao finalizar corrida — expira em 30 min</p>
          </div>
          <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full font-medium">
            Disponivel
          </span>
        </div>

        {/* Credit Card */}
        <div className="w-full bg-card rounded-xl p-4 flex items-center gap-4 border border-border">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-foreground">Cartão de Crédito</p>
            <p className="text-sm text-muted">Disponivel ao finalizar corrida — sem salvar dados</p>
          </div>
          <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full font-medium">
            Disponivel
          </span>
        </div>

        {/* Security info */}
        <div className="bg-muted/5 rounded-xl p-4 mt-4">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Pagamento seguro via Mercado Pago</p>
              <p className="text-xs text-muted mt-1">
                Seus dados de pagamento são criptografados. Os numeros completos do cartao nunca sao armazenados em nossos servidores.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
