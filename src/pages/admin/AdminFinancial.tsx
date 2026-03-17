import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, CreditCard, Wallet, CheckCircle, Users, Building2, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Split constants — kept in sync with platform_config table
const PILOT_PCT = 0.30;
const SIMPLIX_PCT = 0.20;
const OWNERS_PCT = 0.50;

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

interface PilotPendingPayout {
  pilot_profile_id: string;
  pilot_name: string;
  gross: number;
  pilot_share: number;
  simplix_share: number;
  owners_share: number;
}

const StatCard = ({ icon: Icon, label, value, sub, color = 'green' }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) => {
  const colorMap: Record<string, string> = {
    green: 'bg-green-500/10 text-green-600',
    blue: 'bg-blue-500/10 text-blue-600',
    purple: 'bg-purple-500/10 text-purple-600',
    orange: 'bg-orange-500/10 text-orange-600',
  };
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color] ?? colorMap.green}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const AdminFinancial = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [daily, setDaily] = useState<DailyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [pilotPayouts, setPilotPayouts] = useState<PilotPendingPayout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  // Filter by pilot
  const [selectedPilot, setSelectedPilot] = useState<string>('all');

  const loadPilotPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    const { data } = await supabase
      .from('pilot_earnings')
      .select('pilot_profile_id, gross_amount, net_amount, pilot_profiles(full_name)')
      .eq('status', 'pending');

    if (data) {
      const grouped: Record<string, PilotPendingPayout> = {};
      for (const row of data) {
        const id = row.pilot_profile_id as string;
        const name = (row.pilot_profiles as { full_name?: string } | null)?.full_name ?? 'Piloto desconhecido';
        const gross = Number(row.gross_amount);
        if (!grouped[id]) {
          grouped[id] = { pilot_profile_id: id, pilot_name: name, gross: 0, pilot_share: 0, simplix_share: 0, owners_share: 0 };
        }
        grouped[id].gross += gross;
        grouped[id].pilot_share += gross * PILOT_PCT;
        grouped[id].simplix_share += gross * SIMPLIX_PCT;
        grouped[id].owners_share += gross * OWNERS_PCT;
      }
      setPilotPayouts(Object.values(grouped));
    }
    setPayoutsLoading(false);
  }, []);

  const handleMarkAsPaid = async (pilotProfileId: string) => {
    setMarkingPaid(pilotProfileId);
    const { error } = await supabase
      .from('pilot_earnings')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('pilot_profile_id', pilotProfileId)
      .eq('status', 'pending');
    if (error) {
      console.error('Error marking as paid:', error);
    } else {
      setPilotPayouts((prev) => prev.filter((p) => p.pilot_profile_id !== pilotProfileId));
    }
    setMarkingPaid(null);
  };

  useEffect(() => {
    loadPilotPayouts();
  }, [loadPilotPayouts]);

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

  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalRevenue = completedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => ['pending', 'in_process'].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0);
  const walletTopups = walletTxs.filter(t => t.type === 'credit' && t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0);
  const todayRevenue = daily.find(d => d.date === new Date().toISOString().slice(0, 10))?.total ?? 0;

  // Revenue split totals
  const totalPilot = totalRevenue * PILOT_PCT;
  const totalSimplix = totalRevenue * SIMPLIX_PCT;
  const totalOwners = totalRevenue * OWNERS_PCT;

  // Pilot filter options
  const pilotOptions = [{ id: 'all', name: 'Todos os pilotos' }, ...pilotPayouts.map(p => ({ id: p.pilot_profile_id, name: p.pilot_name }))];
  const filteredPayouts = selectedPilot === 'all' ? pilotPayouts : pilotPayouts.filter(p => p.pilot_profile_id === selectedPilot);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Receitas, divisão de renda e pagamentos a pilotos</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Main metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Receita total" value={fmt(totalRevenue)} color="green" />
            <StatCard icon={TrendingUp} label="Receita hoje" value={fmt(todayRevenue)} color="blue" />
            <StatCard icon={CreditCard} label="Pagamentos pendentes" value={fmt(totalPending)} color="orange" />
            <StatCard icon={Wallet} label="Recargas de carteira" value={fmt(walletTopups)} color="purple" />
          </div>

          {/* Revenue split */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Divisão de Receita</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Anchor className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">PILOTOS (30%)</p>
                    <p className="text-xl font-bold text-foreground">{fmt(totalPilot)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">30% de cada corrida vai para o piloto</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">SIMPLIX (20%)</p>
                    <p className="text-xl font-bold text-foreground">{fmt(totalSimplix)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Taxa da plataforma Simplix</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">DONOS (50%)</p>
                    <p className="text-xl font-bold text-foreground">{fmt(totalOwners)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Repasse para os donos da plataforma</p>
              </div>
            </div>
          </div>

          {/* Pilot Payouts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Pagamentos a Pilotos</h2>
              <select
                value={selectedPilot}
                onChange={e => setSelectedPilot(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground"
              >
                {pilotOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            {payoutsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground text-sm">
                Nenhum pagamento pendente a pilotos.
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Piloto</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Bruto</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-blue-600">Piloto (30%)</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-purple-600">Simplix (20%)</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-green-600">Donos (50%)</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayouts.map((p) => (
                      <tr key={p.pilot_profile_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{p.pilot_name}</td>
                        <td className="px-4 py-3 text-foreground">{fmt(p.gross)}</td>
                        <td className="px-4 py-3 font-semibold text-blue-600">{fmt(p.pilot_share)}</td>
                        <td className="px-4 py-3 font-semibold text-purple-600">{fmt(p.simplix_share)}</td>
                        <td className="px-4 py-3 font-semibold text-green-600">{fmt(p.owners_share)}</td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsPaid(p.pilot_profile_id)}
                            disabled={markingPaid === p.pilot_profile_id}
                            className="gap-1.5"
                          >
                            {markingPaid === p.pilot_profile_id ? (
                              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            Marcar Pago
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Bruto</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-blue-600">Pilotos</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-purple-600">Simplix</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-green-600">Donos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map(d => (
                      <tr key={d.date} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{d.count}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{fmt(d.total)}</td>
                        <td className="px-4 py-3 text-blue-600">{fmt(d.total * PILOT_PCT)}</td>
                        <td className="px-4 py-3 text-purple-600">{fmt(d.total * SIMPLIX_PCT)}</td>
                        <td className="px-4 py-3 text-green-600">{fmt(d.total * OWNERS_PCT)}</td>
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
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Bruto</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Piloto (30%)</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Plataforma (70%)</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 20).map(p => {
                    const gross = Number(p.amount);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{fmt(gross)}</td>
                        <td className="px-4 py-3 text-blue-600">{fmt(gross * PILOT_PCT)}</td>
                        <td className="px-4 py-3 text-green-600">{fmt(gross * (SIMPLIX_PCT + OWNERS_PCT))}</td>
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
                    );
                  })}
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
