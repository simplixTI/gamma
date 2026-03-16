import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Ship, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PAGE_SIZE = 50;

interface PassengerRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  rating: number;
  created_at: string;
}

interface PilotRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  rating: number;
  total_rides: number;
  total_earnings: number;
  approval_status: string;
  is_active: boolean;
  created_at: string;
}

const approvalColor: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  under_review: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  approved: 'bg-green-500/10 text-green-600 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/30',
};

const approvalLabel: Record<string, string> = {
  pending: 'Pendente',
  under_review: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Reprovado',
};

const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [passengers, setPassengers] = useState<PassengerRow[]>([]);
  const [pilots, setPilots] = useState<PilotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [passengerPage, setPassengerPage] = useState(0);
  const [pilotPage, setPilotPage] = useState(0);
  const [passengerTotal, setPassengerTotal] = useState(0);
  const [pilotTotal, setPilotTotal] = useState(0);

  useEffect(() => {
    setPassengerPage(0);
    setPilotPage(0);
  }, [search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const from = passengerPage * PAGE_SIZE;
      const to = (passengerPage + 1) * PAGE_SIZE - 1;
      const [countRes, dataRes] = await Promise.all([
        supabase.from('passenger_profiles').select('count', { count: 'exact', head: true }),
        supabase.from('passenger_profiles')
          .select('id, full_name, email, phone, cpf, rating, created_at')
          .order('created_at', { ascending: false })
          .range(from, to),
      ]);
      setPassengerTotal(countRes.count ?? 0);
      setPassengers(dataRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [passengerPage]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const from = pilotPage * PAGE_SIZE;
      const to = (pilotPage + 1) * PAGE_SIZE - 1;
      const [countRes, dataRes] = await Promise.all([
        supabase.from('pilot_profiles').select('count', { count: 'exact', head: true }),
        supabase.from('pilot_profiles')
          .select('id, full_name, email, phone, cpf, rating, total_rides, total_earnings, approval_status, is_active, created_at')
          .order('created_at', { ascending: false })
          .range(from, to),
      ]);
      setPilotTotal(countRes.count ?? 0);
      setPilots(dataRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [pilotPage]);

  const filteredPassengers = passengers.filter(p =>
    !search || p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search)
  );

  const filteredPilots = pilots.filter(p =>
    !search || p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <p className="text-sm text-muted-foreground">Banco de dados de passageiros e pilotos</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou CPF..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="passengers">
        <TabsList>
          <TabsTrigger value="passengers">
            <User className="w-4 h-4 mr-1.5" />
            Passageiros ({passengerTotal})
          </TabsTrigger>
          <TabsTrigger value="pilots">
            <Ship className="w-4 h-4 mr-1.5" />
            Pilotos ({pilotTotal})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="passengers" className="mt-4">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Nome</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">E-mail</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Telefone</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">CPF</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Rating</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPassengers.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{p.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.email}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.cpf}</td>
                      <td className="px-4 py-3 text-foreground">⭐ {Number(p.rating).toFixed(1)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                  {filteredPassengers.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum passageiro encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && passengerTotal > 0 && (
            <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
              <span>
                Mostrando {passengerPage * PAGE_SIZE + 1}–{Math.min((passengerPage + 1) * PAGE_SIZE, passengerTotal)} de {passengerTotal}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPassengerPage(p => p - 1)}
                  disabled={passengerPage === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPassengerPage(p => p + 1)}
                  disabled={(passengerPage + 1) * PAGE_SIZE >= passengerTotal}
                >
                  Próxima
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pilots" className="mt-4">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Nome</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">E-mail</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Corridas</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Ganhos</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPilots.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{p.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${approvalColor[p.approval_status] ?? 'bg-muted text-muted-foreground'}`}>
                          {approvalLabel[p.approval_status] ?? p.approval_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.total_rides}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        R$ {Number(p.total_earnings).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                  {filteredPilots.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum piloto encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && pilotTotal > 0 && (
            <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
              <span>
                Mostrando {pilotPage * PAGE_SIZE + 1}–{Math.min((pilotPage + 1) * PAGE_SIZE, pilotTotal)} de {pilotTotal}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPilotPage(p => p - 1)}
                  disabled={pilotPage === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPilotPage(p => p + 1)}
                  disabled={(pilotPage + 1) * PAGE_SIZE >= pilotTotal}
                >
                  Próxima
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminUsers;
