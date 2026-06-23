import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronLeft, ChevronRight, MapPin, Clock, User, Ship, TrendingUp, Users, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 30;

interface RideRow {
  id: string;
  status: string;
  price: number;
  origin_name: string | null;
  destination_name: string | null;
  created_at: string;
  payment_status: string | null;
  passenger_user_id: string | null;
  pilot_user_id: string | null;
  passenger_name: string | null;
  pilot_name: string | null;
}

interface PeriodMetrics {
  rides: number;
  uniquePassengers: number;
}

const statusColor: Record<string, string> = {
  pending:     'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  accepted:    'bg-blue-500/10 text-blue-600 border-blue-500/30',
  in_progress: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  completed:   'bg-green-500/10 text-green-600 border-green-500/30',
  cancelled:   'bg-red-500/10 text-red-600 border-red-500/30',
};

const statusLabel: Record<string, string> = {
  pending:     'Aguardando',
  accepted:    'Aceita',
  in_progress: 'Em andamento',
  completed:   'Concluída',
  cancelled:   'Cancelada',
};

const AdminRides = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rides, setRides] = useState<RideRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<{ day: PeriodMetrics; week: PeriodMetrics; month: PeriodMetrics }>({
    day:   { rides: 0, uniquePassengers: 0 },
    week:  { rides: 0, uniquePassengers: 0 },
    month: { rides: 0, uniquePassengers: 0 },
  });

  // Load rides + join profile data client-side (no FK from rides to profiles tables)
  const load = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = (page + 1) * PAGE_SIZE - 1;

    let query = supabase
      .from('rides')
      .select(
        'id, status, price, origin_name, destination_name, created_at, payment_status, passenger_user_id, pilot_user_id',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, count } = await query;
    const rawRides = (data ?? []) as Array<{
      id: string;
      status: string;
      price: number;
      origin_name: string | null;
      destination_name: string | null;
      created_at: string;
      payment_status: string | null;
      passenger_user_id: string | null;
      pilot_user_id: string | null;
    }>;

    // Collect unique user IDs to batch-fetch profiles
    const passengerIds = Array.from(new Set(rawRides.map(r => r.passenger_user_id).filter(Boolean) as string[]));
    const pilotIds     = Array.from(new Set(rawRides.map(r => r.pilot_user_id).filter(Boolean) as string[]));

    const [passengersRes, pilotsRes] = await Promise.all([
      passengerIds.length
        ? supabase.from('passenger_profiles').select('user_id, full_name').in('user_id', passengerIds)
        : Promise.resolve({ data: [] }),
      pilotIds.length
        ? supabase.from('pilot_profiles').select('user_id, full_name').in('user_id', pilotIds)
        : Promise.resolve({ data: [] }),
    ]);

    const passengerMap = new Map<string, string>();
    (passengersRes.data ?? []).forEach((p: { user_id: string; full_name: string | null }) => {
      if (p.user_id && p.full_name) passengerMap.set(p.user_id, p.full_name);
    });
    const pilotMap = new Map<string, string>();
    (pilotsRes.data ?? []).forEach((p: { user_id: string; full_name: string | null }) => {
      if (p.user_id && p.full_name) pilotMap.set(p.user_id, p.full_name);
    });

    setRides(rawRides.map(r => ({
      ...r,
      passenger_name: r.passenger_user_id ? passengerMap.get(r.passenger_user_id) ?? null : null,
      pilot_name:     r.pilot_user_id     ? pilotMap.get(r.pilot_user_id) ?? null     : null,
    })));
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, statusFilter]);

  // Aggregate period metrics — independent of pagination, full month window
  const loadMetrics = useCallback(async () => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    const dayIdx = (startOfWeek.getDay() + 6) % 7; // 0 = Monday
    startOfWeek.setDate(startOfWeek.getDate() - dayIdx);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data } = await supabase
      .from('rides')
      .select('passenger_user_id, created_at')
      .gte('created_at', startOfMonth.toISOString())
      .eq('status', 'completed');

    const rows = (data ?? []) as Array<{ passenger_user_id: string | null; created_at: string }>;
    const agg = (sinceISO: string): PeriodMetrics => {
      const since = new Date(sinceISO);
      const inWindow = rows.filter(r => new Date(r.created_at) >= since);
      const uniques = new Set(inWindow.map(r => r.passenger_user_id).filter(Boolean));
      return { rides: inWindow.length, uniquePassengers: uniques.size };
    };
    setMetrics({
      day:   agg(startOfDay.toISOString()),
      week:  agg(startOfWeek.toISOString()),
      month: agg(startOfMonth.toISOString()),
    });
  }, []);

  useEffect(() => { setPage(0); }, [statusFilter, search]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadMetrics(); }, [loadMetrics]);

  const filtered = search
    ? rides.filter(r =>
        r.passenger_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.pilot_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.origin_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.id.startsWith(search),
      )
    : rides;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Corridas</h1>
        <p className="text-sm text-muted-foreground">Histórico e status de todas as corridas</p>
      </div>

      {/* Period metrics — completed rides + unique passengers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([
          { key: 'day',   label: 'Hoje',     icon: Clock,    color: 'text-blue-600 bg-blue-500/10' },
          { key: 'week',  label: 'Semana',   icon: Calendar, color: 'text-violet-600 bg-violet-500/10' },
          { key: 'month', label: 'Mês',      icon: TrendingUp, color: 'text-emerald-600 bg-emerald-500/10' },
        ] as const).map(p => {
          const Icon = p.icon;
          const m = metrics[p.key];
          return (
            <div key={p.key} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">{p.label}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Corridas</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{m.rides}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Users className="w-3 h-3" />Passageiros
                  </p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{m.uniquePassengers}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por passageiro, piloto, origem..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'}`}
            >
              {s === 'all' ? 'Todas' : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Corrida</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">
                  <User className="w-3.5 h-3.5 inline mr-1" />Passageiro
                </th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">
                  <Ship className="w-3.5 h-3.5 inline mr-1" />Piloto
                </th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Valor</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />Data
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground truncate max-w-[200px]">
                      <MapPin className="w-3 h-3 inline mr-1 text-muted-foreground" />
                      {r.origin_name ?? '—'} → {r.destination_name ?? '—'}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">#{r.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {r.passenger_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {r.pilot_name ?? 'Sem piloto'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor[r.status] ?? 'bg-muted'}`}>
                      {statusLabel[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium hidden md:table-cell">
                    R$ {Number(r.price).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma corrida encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" />Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}>
              Próxima<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRides;
