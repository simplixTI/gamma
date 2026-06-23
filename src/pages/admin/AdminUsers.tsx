import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Ship, ChevronLeft, ChevronRight, Power, PowerOff, Pencil, Trash2, X, Plus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

interface PassengerRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  rating: number;
  created_at: string;
}

type PilotType = 'pilot' | 'partner_boat';

interface PilotRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  rating: number;
  total_rides: number;
  total_earnings: number;
  approval_status: string;
  is_active: boolean;
  boat_type: string;
  boat_identification: string;
  pilot_type: PilotType;
  created_at: string;
}

interface PassengerForm {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
}

interface PilotForm {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  boat_type: string;
  boat_identification: string;
  pilot_type: PilotType;
}

const EMPTY_PASSENGER_FORM: PassengerForm = {
  full_name: '',
  email: '',
  phone: '',
  cpf: '',
};

const EMPTY_PILOT_FORM: PilotForm = {
  full_name: '',
  email: '',
  phone: '',
  cpf: '',
  boat_type: '',
  boat_identification: '',
  pilot_type: 'pilot',
};

const PILOT_TYPE_LABEL: Record<PilotType, string> = {
  pilot: 'Piloto Gamma',
  partner_boat: 'Barco Parceiro',
};

const PILOT_TYPE_BADGE: Record<PilotType, string> = {
  pilot: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  partner_boat: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
};

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
  const [togglingPilotId, setTogglingPilotId] = useState<string | null>(null);

  // Passenger modal state
  const [passengerModal, setPassengerModal] = useState<'create' | 'edit' | null>(null);
  const [passengerForm, setPassengerForm] = useState<PassengerForm>(EMPTY_PASSENGER_FORM);
  const [editingPassengerId, setEditingPassengerId] = useState<string | null>(null);
  const [savingPassenger, setSavingPassenger] = useState(false);
  const [deletingPassengerId, setDeletingPassengerId] = useState<string | null>(null);
  const [confirmDeletePassenger, setConfirmDeletePassenger] = useState<PassengerRow | null>(null);

  // Pilot modal state
  const [pilotModal, setPilotModal] = useState<'create' | 'edit' | null>(null);
  const [pilotForm, setPilotForm] = useState<PilotForm>(EMPTY_PILOT_FORM);
  const [editingPilotId, setEditingPilotId] = useState<string | null>(null);
  const [savingPilot, setSavingPilot] = useState(false);
  const [deletingPilotId, setDeletingPilotId] = useState<string | null>(null);
  const [confirmDeletePilot, setConfirmDeletePilot] = useState<PilotRow | null>(null);

  // ── data loading ──────────────────────────────────────────────────────────

  const loadPassengers = async (page: number) => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = (page + 1) * PAGE_SIZE - 1;
    const [countRes, dataRes] = await Promise.all([
      supabase.from('passenger_profiles').select('count', { count: 'exact', head: true }),
      supabase
        .from('passenger_profiles')
        .select('id, user_id, full_name, email, phone, cpf, rating, created_at')
        .order('created_at', { ascending: false })
        .range(from, to),
    ]);
    setPassengerTotal(countRes.count ?? 0);
    setPassengers(dataRes.data ?? []);
    setLoading(false);
  };

  const loadPilots = async (page: number) => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = (page + 1) * PAGE_SIZE - 1;
    const [countRes, dataRes] = await Promise.all([
      supabase.from('pilot_profiles').select('count', { count: 'exact', head: true }),
      supabase
        .from('pilot_profiles')
        .select('id, user_id, full_name, email, phone, cpf, rating, total_rides, total_earnings, approval_status, is_active, boat_type, boat_identification, pilot_type, created_at')
        .order('created_at', { ascending: false })
        .range(from, to),
    ]);
    setPilotTotal(countRes.count ?? 0);
    setPilots(dataRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    setPassengerPage(0);
    setPilotPage(0);
  }, [search]);

  useEffect(() => { loadPassengers(passengerPage); }, [passengerPage]);
  useEffect(() => { loadPilots(pilotPage); }, [pilotPage]);

  // ── filtering ─────────────────────────────────────────────────────────────

  const filteredPassengers = passengers.filter(p =>
    !search ||
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search)
  );

  const filteredPilots = pilots.filter(p =>
    !search ||
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search)
  );

  // ── pilot toggle ──────────────────────────────────────────────────────────

  const handleTogglePilotActive = async (pilot: PilotRow) => {
    setTogglingPilotId(pilot.id);
    const newActive = !pilot.is_active;
    const { error } = await supabase
      .from('pilot_profiles')
      .update({ is_active: newActive })
      .eq('id', pilot.id);
    if (error) {
      toast.error('Erro ao atualizar status do piloto');
    } else {
      setPilots(prev => prev.map(p => p.id === pilot.id ? { ...p, is_active: newActive } : p));
      toast.success(newActive ? `${pilot.full_name} reativado` : `${pilot.full_name} suspenso`);
    }
    setTogglingPilotId(null);
  };

  // ── passenger CRUD ────────────────────────────────────────────────────────

  const openCreatePassenger = () => {
    setPassengerForm(EMPTY_PASSENGER_FORM);
    setEditingPassengerId(null);
    setPassengerModal('create');
  };

  const openEditPassenger = (p: PassengerRow) => {
    setPassengerForm({ full_name: p.full_name, email: p.email, phone: p.phone, cpf: p.cpf });
    setEditingPassengerId(p.id);
    setPassengerModal('edit');
  };

  const closePassengerModal = () => {
    setPassengerModal(null);
    setEditingPassengerId(null);
    setPassengerForm(EMPTY_PASSENGER_FORM);
  };

  const handleSavePassenger = async () => {
    if (!passengerForm.full_name.trim() || !passengerForm.email.trim()) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }
    setSavingPassenger(true);
    if (passengerModal === 'create') {
      const { data, error } = await supabase
        .from('passenger_profiles')
        .insert([{ ...passengerForm }])
        .select('id, full_name, email, phone, cpf, rating, created_at')
        .single();
      if (error) {
        toast.error('Erro ao criar perfil: ' + error.message);
      } else {
        // Also insert user_roles record if possible (best-effort, no auth user yet)
        await supabase.from('user_roles').insert([{ user_id: data.id, role: 'passenger' }]);
        setPassengers(prev => [data, ...prev]);
        setPassengerTotal(t => t + 1);
        toast.success('Perfil criado. Peça ao usuário para se cadastrar com este e-mail.');
        closePassengerModal();
      }
    } else if (passengerModal === 'edit' && editingPassengerId) {
      const { error } = await supabase
        .from('passenger_profiles')
        .update({ ...passengerForm })
        .eq('id', editingPassengerId);
      if (error) {
        toast.error('Erro ao atualizar perfil: ' + error.message);
      } else {
        setPassengers(prev =>
          prev.map(p => p.id === editingPassengerId ? { ...p, ...passengerForm } : p)
        );
        toast.success('Perfil atualizado');
        closePassengerModal();
      }
    }
    setSavingPassenger(false);
  };

  const handleDeletePassenger = async (p: PassengerRow) => {
    setDeletingPassengerId(p.id);
    const { data, error } = await supabase.rpc('admin_delete_user', { p_user_id: p.user_id });
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast.error('Erro ao excluir passageiro: ' + (error?.message ?? result?.error ?? 'desconhecido'));
    } else {
      setPassengers(prev => prev.filter(r => r.id !== p.id));
      setPassengerTotal(t => t - 1);
      toast.success(`${p.full_name} excluído`);
    }
    setDeletingPassengerId(null);
    setConfirmDeletePassenger(null);
  };

  // ── pilot CRUD ────────────────────────────────────────────────────────────

  const openCreatePilot = () => {
    setPilotForm(EMPTY_PILOT_FORM);
    setEditingPilotId(null);
    setPilotModal('create');
  };

  const openEditPilot = (p: PilotRow) => {
    setPilotForm({
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      cpf: p.cpf,
      boat_type: p.boat_type ?? '',
      boat_identification: p.boat_identification ?? '',
      pilot_type: p.pilot_type ?? 'pilot',
    });
    setEditingPilotId(p.id);
    setPilotModal('edit');
  };

  const closePilotModal = () => {
    setPilotModal(null);
    setEditingPilotId(null);
    setPilotForm(EMPTY_PILOT_FORM);
  };

  const handleSavePilot = async () => {
    if (!pilotForm.full_name.trim() || !pilotForm.email.trim()) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }
    setSavingPilot(true);
    if (pilotModal === 'create') {
      const { data, error } = await supabase
        .from('pilot_profiles')
        .insert([{ ...pilotForm, approval_status: 'pending', is_active: false }])
        .select('id, user_id, full_name, email, phone, cpf, rating, total_rides, total_earnings, approval_status, is_active, boat_type, boat_identification, pilot_type, created_at')
        .single();
      if (error) {
        toast.error('Erro ao criar piloto: ' + error.message);
      } else {
        await supabase.from('user_roles').insert([{ user_id: data.id, role: 'pilot' }]);
        setPilots(prev => [data, ...prev]);
        setPilotTotal(t => t + 1);
        toast.success('Perfil criado. Peça ao usuário para se cadastrar com este e-mail.');
        closePilotModal();
      }
    } else if (pilotModal === 'edit' && editingPilotId) {
      const { error } = await supabase
        .from('pilot_profiles')
        .update({ ...pilotForm })
        .eq('id', editingPilotId);
      if (error) {
        toast.error('Erro ao atualizar piloto: ' + error.message);
      } else {
        setPilots(prev =>
          prev.map(p => p.id === editingPilotId ? { ...p, ...pilotForm } : p)
        );
        toast.success('Piloto atualizado');
        closePilotModal();
      }
    }
    setSavingPilot(false);
  };

  const handleDeletePilot = async (p: PilotRow) => {
    setDeletingPilotId(p.id);
    const { data, error } = await supabase.rpc('admin_delete_user', { p_user_id: p.user_id });
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast.error('Erro ao excluir piloto: ' + (error?.message ?? result?.error ?? 'desconhecido'));
    } else {
      setPilots(prev => prev.filter(r => r.id !== p.id));
      setPilotTotal(t => t - 1);
      toast.success(`${p.full_name} excluído`);
    }
    setDeletingPilotId(null);
    setConfirmDeletePilot(null);
  };

  // ── render ─────────────────────────────────────────────────────────────────

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

        {/* ── PASSENGERS TAB ───────────────────────────────────────────────── */}
        <TabsContent value="passengers" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">
              {passengerTotal} passageiro{passengerTotal !== 1 ? 's' : ''} cadastrado{passengerTotal !== 1 ? 's' : ''}
            </span>
            <Button size="sm" onClick={openCreatePassenger}>
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Passageiro
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
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
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPassengers.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{p.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.email}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.cpf}</td>
                      <td className="px-4 py-3 text-foreground">&#11088; {Number(p.rating).toFixed(1)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPassenger(p)}
                            title="Editar passageiro"
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeletePassenger(p)}
                            disabled={deletingPassengerId === p.id}
                            title="Excluir passageiro"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            {deletingPassengerId === p.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPassengers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum passageiro encontrado
                      </td>
                    </tr>
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

        {/* ── PILOTS TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="pilots" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">
              {pilotTotal} piloto{pilotTotal !== 1 ? 's' : ''} cadastrado{pilotTotal !== 1 ? 's' : ''}
            </span>
            <Button size="sm" onClick={openCreatePilot}>
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Piloto
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Nome</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Tipo</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">E-mail</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Corridas</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Ganhos</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Cadastro</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPilots.map(p => {
                    const ptype: PilotType = (p.pilot_type ?? 'pilot') as PilotType;
                    return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{p.full_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PILOT_TYPE_BADGE[ptype]}`}>
                          {PILOT_TYPE_LABEL[ptype]}
                        </span>
                      </td>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePilotActive(p)}
                            disabled={togglingPilotId === p.id}
                            className={`h-8 w-8 p-0 ${p.is_active ? 'text-destructive hover:text-destructive' : 'text-green-600 hover:text-green-700'}`}
                            title={p.is_active ? 'Suspender piloto' : 'Reativar piloto'}
                          >
                            {togglingPilotId === p.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : p.is_active
                                ? <PowerOff className="w-3.5 h-3.5" />
                                : <Power className="w-3.5 h-3.5" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPilot(p)}
                            title="Editar piloto"
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeletePilot(p)}
                            disabled={deletingPilotId === p.id}
                            title="Excluir piloto"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            {deletingPilotId === p.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {filteredPilots.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum piloto encontrado
                      </td>
                    </tr>
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

      {/* ── PASSENGER MODAL (create / edit) ─────────────────────────────────── */}
      {passengerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">
                {passengerModal === 'create' ? 'Novo Passageiro' : 'Editar Passageiro'}
              </h2>
              <Button variant="ghost" size="sm" onClick={closePassengerModal} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {passengerModal === 'create' && (
                <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 border border-border">
                  O usuario recebera um convite por email para definir sua senha.
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="p-full_name">Nome completo <span className="text-destructive">*</span></Label>
                <Input
                  id="p-full_name"
                  value={passengerForm.full_name}
                  onChange={e => setPassengerForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Ana Paula Silva"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-email">E-mail <span className="text-destructive">*</span></Label>
                <Input
                  id="p-email"
                  type="email"
                  value={passengerForm.email}
                  onChange={e => setPassengerForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="ana@email.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-phone">Telefone</Label>
                <Input
                  id="p-phone"
                  value={passengerForm.phone}
                  onChange={e => setPassengerForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-cpf">CPF</Label>
                <Input
                  id="p-cpf"
                  value={passengerForm.cpf}
                  onChange={e => setPassengerForm(f => ({ ...f, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={closePassengerModal} disabled={savingPassenger}>
                Cancelar
              </Button>
              <Button onClick={handleSavePassenger} disabled={savingPassenger}>
                {savingPassenger && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {passengerModal === 'create' ? 'Criar Perfil' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── PILOT MODAL (create / edit) ──────────────────────────────────────── */}
      {pilotModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">
                {pilotModal === 'create' ? 'Novo Piloto' : 'Editar Piloto'}
              </h2>
              <Button variant="ghost" size="sm" onClick={closePilotModal} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {pilotModal === 'create' && (
                <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 border border-border">
                  O usuario recebera um convite por email para definir sua senha.
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="pi-full_name">Nome completo <span className="text-destructive">*</span></Label>
                <Input
                  id="pi-full_name"
                  value={pilotForm.full_name}
                  onChange={e => setPilotForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Carlos Mendes"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pi-email">E-mail <span className="text-destructive">*</span></Label>
                <Input
                  id="pi-email"
                  type="email"
                  value={pilotForm.email}
                  onChange={e => setPilotForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="carlos@email.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pi-phone">Telefone</Label>
                <Input
                  id="pi-phone"
                  value={pilotForm.phone}
                  onChange={e => setPilotForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pi-cpf">CPF</Label>
                <Input
                  id="pi-cpf"
                  value={pilotForm.cpf}
                  onChange={e => setPilotForm(f => ({ ...f, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pi-pilot_type">Modelo de repasse <span className="text-destructive">*</span></Label>
                <select
                  id="pi-pilot_type"
                  value={pilotForm.pilot_type}
                  onChange={e => setPilotForm(f => ({ ...f, pilot_type: e.target.value as PilotType }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="pilot">Piloto Gamma (recebe 45%)</option>
                  <option value="partner_boat">Barco Parceiro (recebe 60%)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {pilotForm.pilot_type === 'partner_boat'
                    ? 'Dono do próprio barco. Split: 60% dono / 40% plataforma.'
                    : 'Funcionário Gamma dirigindo barco da plataforma. Split: 45% piloto / 45% dono Gamma / 10% plataforma.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pi-boat_type">Tipo de embarcacao</Label>
                <Input
                  id="pi-boat_type"
                  value={pilotForm.boat_type}
                  onChange={e => setPilotForm(f => ({ ...f, boat_type: e.target.value }))}
                  placeholder="Lancha, Veleiro, Catamarã..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pi-boat_identification">Identificacao da embarcacao</Label>
                <Input
                  id="pi-boat_identification"
                  value={pilotForm.boat_identification}
                  onChange={e => setPilotForm(f => ({ ...f, boat_identification: e.target.value }))}
                  placeholder="Placa ou numero de registro"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={closePilotModal} disabled={savingPilot}>
                Cancelar
              </Button>
              <Button onClick={handleSavePilot} disabled={savingPilot}>
                {savingPilot && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {pilotModal === 'create' ? 'Criar Perfil' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM — passenger ──────────────────────────────────────── */}
      {confirmDeletePassenger && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 space-y-3">
              <h2 className="text-base font-semibold text-foreground">Excluir passageiro</h2>
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir <span className="font-medium text-foreground">{confirmDeletePassenger.full_name}</span>? Esta acao nao pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setConfirmDeletePassenger(null)} disabled={!!deletingPassengerId}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeletePassenger(confirmDeletePassenger)}
                disabled={!!deletingPassengerId}
              >
                {deletingPassengerId && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM — pilot ───────────────────────────────────────────── */}
      {confirmDeletePilot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 space-y-3">
              <h2 className="text-base font-semibold text-foreground">Excluir piloto</h2>
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir <span className="font-medium text-foreground">{confirmDeletePilot.full_name}</span>? Esta acao nao pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setConfirmDeletePilot(null)} disabled={!!deletingPilotId}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeletePilot(confirmDeletePilot)}
                disabled={!!deletingPilotId}
              >
                {deletingPilotId && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
