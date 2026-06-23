import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight, Upload, DollarSign, TrendingUp, CheckCircle2, Calendar, Zap, Sparkles, Crown, MousePointerClick } from 'lucide-react';
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
  price: number | null;
  duration_days: number | null;
  advertiser_name: string | null;
  advertiser_contact: string | null;
  sold_at: string | null;
}

const POSITIONS: Record<string, string> = {
  home: 'Home do passageiro',
  completed: 'Tela de corrida concluída',
  searching: 'Aguardando piloto',
};

const PACKAGES = [
  { days: 7,  label: '1 semana', tagline: 'Teste rápido',  icon: Zap,      bg: 'bg-sky-500/10',    text: 'text-sky-600',    border: 'border-sky-500/40',    ring: 'ring-sky-500' },
  { days: 15, label: '15 dias',  tagline: 'Campanha curta', icon: Sparkles, bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/40', ring: 'ring-violet-500' },
  { days: 30, label: '30 dias',  tagline: 'Maior alcance',  icon: Crown,    bg: 'bg-amber-500/10',  text: 'text-amber-600',  border: 'border-amber-500/40',  ring: 'ring-amber-500' },
] as const;

const emptyForm = {
  title: '',
  description: '',
  image_url: '',
  link_url: '',
  position: 'home',
  durationDays: null as number | null,
  price: '',
  advertiserName: '',
  advertiserContact: '',
};

const parsePrice = (s: string): number | null => {
  if (!s.trim()) return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const formatBRL = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

const daysRemaining = (endsAt: string | null): number | null => {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

const AdminAds = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const { data, error } = await supabase.storage.from('ad-images').upload(`${Date.now()}-${file.name}`, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('ad-images').getPublicUrl(data.path);
      setForm(p => ({ ...p, image_url: urlData.publicUrl }));
    } catch {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setImageUploading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const [adsRes, clicksRes] = await Promise.all([
      supabase.from('partner_ads').select('*').order('created_at', { ascending: false }),
      supabase.from('ad_clicks').select('ad_id'),
    ]);
    setAds(adsRes.data ?? []);
    // Aggregate counts client-side (small volume per admin session)
    const counts: Record<string, number> = {};
    (clicksRes.data ?? []).forEach((c: { ad_id: string }) => {
      counts[c.ad_id] = (counts[c.ad_id] ?? 0) + 1;
    });
    setClickCounts(counts);
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
      durationDays: ad.duration_days,
      price: ad.price != null ? String(ad.price).replace('.', ',') : '',
      advertiserName: ad.advertiser_name ?? '',
      advertiserContact: ad.advertiser_contact ?? '',
    });
    setEditId(ad.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Título do anúncio obrigatório'); return; }

    const priceValue = parsePrice(form.price);
    const isPaid = form.durationDays !== null;

    if (isPaid && priceValue === null) {
      toast.error('Informe o preço do pacote');
      return;
    }

    setSaving(true);
    try {
      // For paid ads: starts NOW, ends NOW + duration. For internal/courtesy: no schedule.
      const now = new Date();
      const endsAt = isPaid && form.durationDays
        ? new Date(now.getTime() + form.durationDays * 24 * 60 * 60 * 1000)
        : null;

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim() || null,
        position: form.position,
        starts_at: isPaid ? now.toISOString() : null,
        ends_at: endsAt ? endsAt.toISOString() : null,
        price: isPaid ? priceValue : null,
        duration_days: form.durationDays,
        advertiser_name: form.advertiserName.trim() || null,
        advertiser_contact: form.advertiserContact.trim() || null,
        updated_at: now.toISOString(),
      };

      if (editId) {
        const { error } = await supabase.from('partner_ads').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success('Anúncio atualizado');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('partner_ads').insert({
          ...payload,
          is_active: true,
          created_by: user?.id,
          sold_at: isPaid ? now.toISOString() : null,
        });
        if (error) throw error;
        toast.success(isPaid ? `Venda registrada — ${formatBRL(priceValue!)}` : 'Anúncio criado');
      }
      setShowForm(false);
      await load();
    } catch {
      toast.error('Erro ao salvar anúncio');
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalRevenue = ads.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRevenue = ads
    .filter(a => a.sold_at && new Date(a.sold_at) >= monthStart)
    .reduce((sum, a) => sum + Number(a.price || 0), 0);
  const activePaidCount = ads.filter(a => a.price != null && a.ends_at && new Date(a.ends_at) > now).length;
  const pricePerDay = (() => {
    const price = parsePrice(form.price);
    if (!price || !form.durationDays) return null;
    return price / form.durationDays;
  })();

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anúncios</h1>
          <p className="text-sm text-muted-foreground">Venda de espaço publicitário — 100% receita plataforma</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Vender espaço
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Receita total</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatBRL(totalRevenue)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Este mês</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatBRL(monthRevenue)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Anúncios ativos</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{activePaidCount}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <MousePointerClick className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Cliques totais</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{Object.values(clickCounts).reduce((s, n) => s + n, 0)}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-transparent px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">{editId ? 'Editar anúncio' : 'Nova venda de espaço'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cliente → Pacote → Criativo</p>
          </div>

          <div className="p-5 space-y-6">
            {/* 1. Cliente */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Cliente</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome do anunciante</Label>
                  <Input value={form.advertiserName} onChange={e => setForm(p => ({ ...p, advertiserName: e.target.value }))} placeholder="Ex: Restaurante do João" />
                </div>
                <div>
                  <Label>Contato (telefone ou e-mail)</Label>
                  <Input value={form.advertiserContact} onChange={e => setForm(p => ({ ...p, advertiserContact: e.target.value }))} placeholder="Ex: (21) 9xxxx-xxxx" />
                </div>
              </div>
            </section>

            {/* 2. Pacote */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Pacote</h3>
                <span className="text-xs text-muted-foreground font-normal normal-case">— deixe vazio para anúncio interno/cortesia</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {PACKAGES.map(pkg => {
                  const Icon = pkg.icon;
                  const selected = form.durationDays === pkg.days;
                  return (
                    <button
                      type="button"
                      key={pkg.days}
                      onClick={() => setForm(p => ({ ...p, durationDays: selected ? null : pkg.days }))}
                      className={`relative rounded-xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
                        selected
                          ? `${pkg.border} ${pkg.bg} ring-2 ${pkg.ring} ring-offset-2 ring-offset-card`
                          : 'border-border bg-background hover:border-foreground/20'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${pkg.bg} ${pkg.text} flex items-center justify-center mb-2`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`text-lg font-bold ${selected ? pkg.text : 'text-foreground'}`}>{pkg.label}</p>
                      <p className="text-xs text-muted-foreground">{pkg.tagline}</p>
                      {selected && (
                        <div className={`absolute top-2 right-2 ${pkg.text}`}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {form.durationDays !== null && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <Label>Preço cobrado</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                      <Input
                        value={form.price}
                        onChange={e => setForm(p => ({ ...p, price: e.target.value.replace(/[^\d.,]/g, '') }))}
                        placeholder="0,00"
                        inputMode="decimal"
                        className="pl-10 font-bold tabular-nums text-lg"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    {pricePerDay !== null && (
                      <div className="bg-muted/40 rounded-lg px-3 py-2.5 text-sm">
                        <span className="text-muted-foreground">Equivale a </span>
                        <span className="font-bold text-foreground tabular-nums">{formatBRL(pricePerDay)}</span>
                        <span className="text-muted-foreground"> / dia</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* 3. Criativo */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Criativo</h3>
              </div>
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
                  <Label>Imagem do banner <span className="text-muted-foreground font-normal">(1200×600 px ideal)</span></Label>
                  <Input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">ou fazer upload:</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={imageUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-1.5"
                    >
                      {imageUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {imageUploading ? 'Enviando...' : 'Escolher arquivo'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                    />
                  </div>
                  {form.image_url && (
                    <img src={form.image_url} alt="Preview" className="mt-2 w-full aspect-[2/1] object-contain rounded-lg bg-white border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Link de destino</Label>
                    <Input value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div>
                    <Label>Posição na tela</Label>
                    <Select value={form.position} onValueChange={v => setForm(p => ({ ...p, position: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(POSITIONS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button onClick={save} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {form.durationDays ? `Registrar venda${parsePrice(form.price) ? ' — ' + formatBRL(parsePrice(form.price)!) : ''}` : 'Salvar anúncio'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : ads.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Sparkles className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">Nenhum anúncio ainda</p>
          <p className="text-sm text-muted-foreground">Clique em "Vender espaço" para registrar a primeira venda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map(ad => {
            const remaining = daysRemaining(ad.ends_at);
            const pkg = PACKAGES.find(p => p.days === ad.duration_days);
            const isPaid = ad.price != null;
            const isExpired = ad.ends_at && new Date(ad.ends_at) < now;
            return (
              <div key={ad.id} className="bg-card rounded-xl border border-border overflow-hidden flex">
                {/* Color stripe */}
                <div className={`w-1 shrink-0 ${pkg ? pkg.bg.replace('/10', '') : 'bg-muted'}`} />
                {/* Thumbnail */}
                {ad.image_url ? (
                  <img src={ad.image_url} alt={ad.title} className="w-24 h-24 object-cover shrink-0 bg-white" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-24 h-24 shrink-0 bg-muted flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                {/* Body */}
                <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-medium text-foreground">{ad.title}</span>
                      {pkg && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pkg.bg} ${pkg.text} uppercase tracking-wide`}>
                          {pkg.label}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 uppercase tracking-wide">
                        {POSITIONS[ad.position] ?? ad.position}
                      </span>
                      {isExpired ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive uppercase">Expirado</span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${ad.is_active ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                          {ad.is_active ? 'Ativo' : 'Pausado'}
                        </span>
                      )}
                    </div>
                    {ad.advertiser_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        Cliente: <span className="text-foreground font-medium">{ad.advertiser_name}</span>
                        {ad.advertiser_contact && <span className="text-muted-foreground/70"> · {ad.advertiser_contact}</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    {isPaid && (
                      <span className="font-bold text-emerald-600 tabular-nums">{formatBRL(Number(ad.price))}</span>
                    )}
                    {remaining !== null && !isExpired && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {remaining} {remaining === 1 ? 'dia restante' : 'dias restantes'}
                      </span>
                    )}
                    {!ad.starts_at && !ad.ends_at && (
                      <span className="text-muted-foreground/70 italic">Cortesia · sem prazo</span>
                    )}
                    <span className="flex items-center gap-1 text-rose-600 font-semibold tabular-nums">
                      <MousePointerClick className="w-3 h-3" />
                      {clickCounts[ad.id] ?? 0} {(clickCounts[ad.id] ?? 0) === 1 ? 'clique' : 'cliques'}
                    </span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-0.5 px-2 shrink-0 border-l border-border bg-muted/20">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(ad)} title={ad.is_active ? 'Pausar' : 'Ativar'}>
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminAds;
