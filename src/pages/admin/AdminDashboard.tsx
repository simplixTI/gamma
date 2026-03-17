import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, DollarSign, Ship, Clock, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Stats {
  totalPassengers: number;
  totalPilots: number;
  pendingApprovals: number;
  totalRides: number;
  totalRevenue: number;
  ridesLast7Days: number;
}

const StatCard = ({
  icon: Icon, label, value, color = 'text-primary',
}: { icon: React.ElementType; label: string; value: string | number; color?: string }) => (
  <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [passengers, pilots, pendingPilots, rides, revenue, recentRides] = await Promise.all([
        supabase.from('passenger_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('pilot_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('pilot_profiles').select('id', { count: 'exact', head: true })
          .in('approval_status', ['pending', 'under_review']),
        supabase.from('rides').select('id', { count: 'exact', head: true })
          .eq('status', 'completed'),
        supabase.from('payments').select('amount').eq('status', 'completed'),
        supabase.from('rides').select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      const hasError = [passengers, pilots, pendingPilots, rides, revenue, recentRides]
        .some((r) => r.error);

      if (hasError) {
        setError('Erro ao carregar estatísticas. Tente novamente.');
        setLoading(false);
        return;
      }

      const totalRevenue = (revenue.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

      setStats({
        totalPassengers: passengers.count ?? 0,
        totalPilots: pilots.count ?? 0,
        pendingApprovals: pendingPilots.count ?? 0,
        totalRides: rides.count ?? 0,
        totalRevenue,
        ridesLast7Days: recentRides.count ?? 0,
      });
    } catch {
      setError('Erro ao carregar estatísticas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da plataforma</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <p className="flex-1 font-medium text-foreground">{error}</p>
          <Button size="sm" variant="outline" onClick={load} className="gap-1.5 shrink-0">
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Passageiros cadastrados" value={stats?.totalPassengers ?? 0} />
        <StatCard icon={Ship} label="Pilotos cadastrados" value={stats?.totalPilots ?? 0} color="text-secondary" />
        <StatCard
          icon={Clock}
          label="Aprovações pendentes"
          value={stats?.pendingApprovals ?? 0}
          color={stats?.pendingApprovals ? 'text-orange-500' : 'text-primary'}
        />
        <StatCard icon={UserCheck} label="Corridas concluídas" value={stats?.totalRides ?? 0} />
        <StatCard icon={TrendingUp} label="Corridas (7 dias)" value={stats?.ridesLast7Days ?? 0} color="text-green-500" />
        <StatCard
          icon={DollarSign}
          label="Receita total"
          value={`R$ ${(stats?.totalRevenue ?? 0).toFixed(2).replace('.', ',')}`}
          color="text-green-500"
        />
      </div>

      {(stats?.pendingApprovals ?? 0) > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-orange-500 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">
              {stats?.pendingApprovals} piloto{stats?.pendingApprovals !== 1 ? 's' : ''} aguardando aprovação
            </p>
            <p className="text-sm text-muted-foreground">
              Revise os documentos e aprove em até 24 horas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
