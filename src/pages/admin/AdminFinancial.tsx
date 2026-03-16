import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, CreditCard, Wallet } from 'lucide-react';

interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  ride_id: string | null;
}

interface WalletTx {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  description: string | null;
}

interface DailyRevenue {
  date: string;
  total: number;
  count: number;
}

const StatCard = ({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) => (
  <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </div>
);

const AdminFinancial = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [daily, setDaily] = useState<DailyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [pRes, wRes] = await Promise.all([
        supabase.from('payments')
          .select('id, amount, status, paid_at, created_at, ride_id')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('wallet_transactions')
          .select('id, amount, type, status, created_at, description')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      const pmts = pRes.data ?? [];
      setPayments(pmts);
      setWalletTxs(wRes.data ?? []);

      // Build daily revenue from completed payments (last 14 days)
      const completed = pmts.filter(p => p.status === 'completed' && p.paid_at);
      const byDay: Record<string, DailyRevenue> = {};
      completed.forEach(p => {
        const day = p.paid_at!.slice(0, 10);
        if (!byDay[day]) byDay[day] = { date: day, total: 0, count: 0 };
        byDay[day].total += Number(p.amount);
        byDay[day].count += 1;
      });
      setDaily(Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14));
      setLoading(false);
    };
    load();
  }, []);

  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => ['pending', 'in_process'].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0);
  const walletTopups = walletTxs.filter(t => t.type === 'credit' && t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0);
  const todayRevenue = daily.find(d => d.date === new Date().toISOString().slice(0, 10))?.total ?? 0;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Receitas, pagamentos e transações de carteira</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Receita total" value={fmt(totalRevenue)} />
            <StatCard icon={TrendingUp} label="Receita hoje" value={fmt(todayRevenue)} />
            <StatCard icon={CreditCard} label="Pagamentos pendentes" value={fmt(totalPending)} />
            <StatCard icon={Wallet} label="Recargas de carteira" value={fmt(walletTopups)} />
          </div>

          {/* Daily revenue table */}
          {daily.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Receita diária (14 dias)</h2>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Data</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Corridas</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map(d => (
                      <tr key={d.date} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{d.count}</td>
                        <td className="px-4 py-3 font-semibold text-green-600">{fmt(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent payments */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Últimos pagamentos</h2>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Data</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Valor</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 20).map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{fmt(Number(p.amount))}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border
                          ${p.status === 'completed' ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                            p.status === 'failed' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
                            'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'}`}>
                          {p.status === 'completed' ? 'Aprovado' :
                           p.status === 'failed' ? 'Falhou' :
                           p.status === 'pending' ? 'Pendente' : p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminFinancial;
