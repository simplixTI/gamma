import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  position: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

const POSITIONS: Record<string, string> = {
  home: 'Home do passageiro',
  completed: 'Tela de corrida concluída',
  searching: 'Aguardando piloto',
};

const emptyForm = { title: '', description: '', image_url: '', link_url: '', position: 'home', starts_at: '', ends_at: '' };

const AdminAds = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('partner_ads')
      .select('*')
      .order('created_at', { ascending: false });
    setAds(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (ad: Ad) => {
    setForm({
      title: ad.title,
      description: ad.description ?? '',
      image_url: ad.image_url ?? '',
      link_url: ad.link_url ?? '',
      position: ad.position,
      starts_at: ad.starts_at?.slice(0, 10) ?? '',
      ends_at: ad.ends_at?.slice(0, 10) ?? '',
    });
    setEditId(ad.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Título obrigatório'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim() || null,
        position: form.position,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        updated_at: new Date().toISOString(),
      };

      if (editId) {
        const { error } = await supabase.from('partner_ads').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success('Anúncio atualizado');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('partner_ads').insert({ ...payload, is_active: true, created_by: user?.id });
        if (error) throw error;
        toast.success('Anúncio criado');
      }
      setShowForm(false);
      await load();
    } catch {
      toast.error('Erro ao salvar anúncio');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ad: Ad) => {
    await supabase.from('partner_ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
    toast.success(ad.is_active ? 'Anúncio desativado' : 'Anúncio ativado');
    await load();
  };

  const deleteAd = async (id: string) => {
    if (!confirm('Excluir este anúncio?')) return;
    await supabase.from('partner_ads').delete().eq('id', id);
    toast.success('Anúncio excluído');
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anúncios</h1>
          <p className="text-sm text-muted-foreground">Gerencie anúncios de parceiros na plataforma</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Novo anúncio
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground">{editId ? 'Editar anúncio' : 'Novo anúncio'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Praia do Recreio — 20% off" />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Texto do anúncio..." rows={2} className="resize-none" />
            </div>
            <div>
              <Label>URL da imagem</Label>
              <Input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Link de destino</Label>
              <Input value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Posição</Label>
              <Select value={form.position} onValueChange={v => setForm(p => ({ ...p, position: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(POSITIONS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Início</Label>
                <Input type="date" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="date" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Salvar
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : ads.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          Nenhum anúncio cadastrado
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map(ad => (
            <div key={ad.id} className="bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3">
              {ad.image_url && (
                <img src={ad.image_url} alt={ad.title} className="w-14 h-10 object-cover rounded-lg shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{ad.title}</span>
                  <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">{POSITIONS[ad.position] ?? ad.position}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ad.is_active ? 'bg-green-500/10 text-green-600 border-green-500/30' : 'bg-muted text-muted-foreground border-border'}`}>
                    {ad.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {ad.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{ad.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => toggleActive(ad)} title={ad.is_active ? 'Desativar' : 'Ativar'}>
                  {ad.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(ad)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteAd(ad.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAds;
