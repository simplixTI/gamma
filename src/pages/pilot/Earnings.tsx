import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import SimplixFooter from '@/components/SimplixFooter';

type Period = 'day' | 'week' | 'month';

interface Transaction {
  id: string;
  type: 'ride' | 'tip';
  description: string;
  amount: number;
  time: string;
}

interface EarningsSummary {
  total: number;
  rides: number;
  tips: number;
}

const Earnings = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<EarningsSummary>({ total: 0, rides: 0, tips: 0 });
  const [previous, setPrevious] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const getPeriodStart = (p: Period, offset = 0): Date => {
    const now = new Date();
    if (p === 'day')  return subDays(startOfDay(now), offset);
    if (p === 'week') return subWeeks(startOfWeek(now, { weekStartsOn: 1 }), offset);
    return subMonths(startOfMonth(now), offset);
  };

  const loadEarnings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const currentStart = getPeriodStart(period, 0);
      const previousStart = getPeriodStart(period, 1);

      // Fetch confirmed paid completed rides for this pilot in current period
      const { data: currentRides } = await supabase
        .from('rides')
        .select('id, price, tip, origin_name, destination_name, completed_at')
        .eq('pilot_user_id', user.id)
        .eq('status', 'completed')
        .eq('payment_status', 'paid')
        .gte('completed_at', currentStart.toISOString())
        .order('completed_at', { ascending: false });

      // Fetch previous period for growth comparison
      const { data: previousRides } = await supabase
        .from('rides')
        .select('price, tip')
        .eq('pilot_user_id', user.id)
        .eq('status', 'completed')
        .eq('payment_status', 'paid')
        .gte('completed_at', previousStart.toISOString())
        .lt('completed_at', currentStart.toISOString());

      const rides = currentRides || [];
      const totalRides = rides.reduce((sum, r) => sum + Number(r.price), 0);
      const totalTips = rides.reduce((sum, r) => sum + Number(r.tip || 0), 0);

      setCurrent({
        total: totalRides + totalTips,
        rides: rides.length,
        tips: totalTips,
      });

      const prevTotal = (previousRides || []).reduce(
        (sum, r) => sum + Number(r.price) + Number(r.tip || 0),
        0
      );
      setPrevious(prevTotal);

      // Build transaction list
      const txs: Transaction[] = [];
      for (const r of rides) {
        const time = r.completed_at
          ? format(new Date(r.completed_at), 'dd/MM HH:mm', { locale: ptBR })
          : '--:--';
        txs.push({
          id: `ride-${r.id}`,
          type: 'ride',
          description: `${r.origin_name || 'Origem'} → ${r.destination_name || 'Destino'}`,
          amount: Number(r.price),
          time,
        });
        if (r.tip && Number(r.tip) > 0) {
          txs.push({
            id: `tip-${r.id}`,
            type: 'tip',
            description: 'Gorjeta recebida',
            amount: Number(r.tip),
            time,
          });
        }
      }
      setTransactions(txs);
    } catch (err) {
      console.error('loadEarnings error:', err);
      toast.error('Erro ao carregar ganhos');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, period]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const growth = previous > 0 ? ((current.total - previous) / previous) * 100 : 0;
  const isPositive = growth >= 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 safe-area-top">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Ganhos</h1>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-4">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary-foreground text-primary'
                  : 'bg-primary-foreground/10 text-primary-foreground'
              }`}
            >
              {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>

        {/* Total Earnings */}
        <div className="bg-primary-foreground/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-80">Total de ganhos</p>
            {previous > 0 && (
              <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span>{Math.abs(growth).toFixed(1)}%</span>
              </div>
            )}
          </div>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary-foreground/60" />
          ) : (
            <p className="text-3xl font-bold">R$ {current.total.toFixed(2).replace('.', ',')}</p>
          )}
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted">Corridas</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{loading ? '—' : current.rides}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-success" />
              <p className="text-sm text-muted">Gorjetas</p>
            </div>
            <p className="text-2xl font-bold text-success">
              {loading ? '—' : `R$ ${current.tips.toFixed(2).replace('.', ',')}`}
            </p>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Histórico recente</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <p>Nenhuma corrida neste período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-card rounded-xl p-4 flex items-center justify-between border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.type === 'tip' ? 'bg-success/10' : 'bg-primary/10'
                    }`}>
                      {tx.type === 'tip' ? (
                        <DollarSign className="w-5 h-5 text-success" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{tx.description}</p>
                      <p className="text-sm text-muted">{tx.time}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${tx.type === 'tip' ? 'text-success' : 'text-foreground'}`}>
                    +R$ {tx.amount.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
          <SimplixFooter />
    </div>
  );
};

export default Earnings;
