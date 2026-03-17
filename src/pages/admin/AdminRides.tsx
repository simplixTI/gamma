import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronLeft, ChevronRight, MapPin, Clock, User, Ship } from 'lucide-react';
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
  passenger_profiles: { full_name: string; email: string } | null;
  pilot_profiles: { full_name: string } | null;
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

  const load = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = (page + 1) * PAGE_SIZE - 1;

    let query = supabase
      .from('rides')
      .select(
        'id, status, price, origin_name, destination_name, created_at, payment_status, passenger_profiles(full_name, email), pilot_profiles(full_name)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, count } = await query;
    setRides((data ?? []) as unknown as RideRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { setPage(0); }, [statusFilter, search]);
  useEffect(() => { void load(); }, [load]);

  const filtered = search
    ? rides.filter(r =>
        r.passenger_profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.pilot_profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
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
                    {r.passenger_profiles?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {r.pilot_profiles?.full_name ?? 'Sem piloto'}
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
