import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2, Copy, Check, Ticket, Building2, Users, Calendar, CheckCircle2, XCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Voucher {
  id: string;
  code: string;
  value: number;
  sponsor: 'owner' | 'platform';
  partner_name: string | null;
  created_at: string;
  expires_at: string | null;
  is_used: boolean;
  used_at: string | null;
  used_on_ride_id: string | null;
}

const VALUE_OPTIONS = [5, 10, 15] as const;

const SPONSORS = [
  { value: 'owner',    label: 'Dono do Barco', icon: Users,     bg: 'bg-green-500/10',  text: 'text-green-600' },
  { value: 'platform', label: 'Plataforma',    icon: Building2, bg: 'bg-purple-500/10', text: 'text-purple-600' },
] as const;

const formatBRL = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

// Generates a friendly voucher code (GAMMA-XXXXXX) using crypto-strong RNG.
const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omitted I/O/0/1 for legibility
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += chars[b % chars.length];
  return `GAMMA-${out}`;
};

const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [form, setForm] = useState({
    value: 10 as 5 | 10 | 15,
    sponsor: 'platform' as 'owner' | 'platform',
    partnerName: '',
    quantity: 5,
    expiresAt: '',
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setVouchers((data ?? []) as Voucher[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (form.quantity < 1 || form.quantity > 100) {
      toast.error('Quantidade entre 1 e 100');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = Array.from({ length: form.quantity }).map(() => ({
        code: generateCode(),
        value: form.value,
        sponsor: form.sponsor,
        partner_name: form.partnerName.trim() || null,
        expires_at: form.expiresAt || null,
        created_by: user?.id,
      }));
      const { error } = await supabase.from('vouchers').insert(rows);
      if (error) throw error;
      toast.success(`${form.quantity} ${form.quantity === 1 ? 'voucher gerado' : 'vouchers gerados'}`);
      setShowForm(false);
      setForm(p => ({ ...p, quantity: 5, partnerName: '', expiresAt: '' }));
      await load();
    } catch (err) {
      console.error('voucher create failed:', err);
      toast.error('Erro ao gerar vouchers');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const exportCSV = (rows: Voucher[]) => {
    const header = 'codigo,valor,sponsor,parceiro,validade,usado_em\n';
    const body = rows.map(v =>
      [
        v.code,
        v.value.toFixed(2).replace('.', ','),
        v.sponsor,
        (v.partner_name ?? '').replace(/,/g, ' '),
        v.expires_at ? new Date(v.expires_at).toLocaleDateString('pt-BR') : '',
        v.used_at ? new Date(v.used_at).toLocaleDateString('pt-BR') : '',
      ].join(',')
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vouchers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const totalIssued = vouchers.length;
  const totalUsed = vouchers.filter(v => v.is_used).length;
  const totalUsedValue = vouchers.filter(v => v.is_used).reduce((s, v) => s + Number(v.value), 0);
  const platformBurden = vouchers.filter(v => v.is_used && v.sponsor === 'platform').reduce((s, v) => s + Number(v.value), 0);
  const ownerBurden    = vouchers.filter(v => v.is_used && v.sponsor === 'owner').reduce((s, v) => s + Number(v.value), 0);

  const filtered = vouchers.filter(v => {
    if (filter === 'unused') return !v.is_used;
    if (filter === 'used') return v.is_used;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vouchers Gamma Cash</h1>
          <p className="text-sm text-muted-foreground">Códigos pra parceiros comerciais distribuírem</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0} className="gap-1.5">
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Gerar lote
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Emitidos</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{totalIssued}</p>
            <p className="text-xs text-muted-foreground">{totalUsed} usados</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total bancado</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatBRL(totalUsedValue)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Plataforma bancou</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatBRL(platformBurden)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Donos bancaram</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatBRL(ownerBurden)}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-transparent px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Gerar novo lote de vouchers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cada voucher é único e válido para 1 uso</p>
          </div>
          <div className="p-5 space-y-5">
            {/* Valor */}
            <div>
              <Label>Valor de cada voucher</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {VALUE_OPTIONS.map(v => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setForm(p => ({ ...p, value: v }))}
                    className={`rounded-xl border-2 px-4 py-5 text-center transition-all active:scale-[0.98] ${
                      form.value === v
                        ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-card'
                        : 'border-border bg-background hover:border-foreground/20'
                    }`}
                  >
                    <p className={`text-3xl font-bold tabular-nums ${form.value === v ? 'text-primary' : 'text-foreground'}`}>R${v}</p>
                    <p className="text-xs text-muted-foreground mt-1">Gamma Cash</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sponsor */}
            <div>
              <Label>Quem banca o desconto?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {SPONSORS.map(s => {
                  const Icon = s.icon;
                  const selected = form.sponsor === s.value;
                  return (
                    <button
                      type="button"
                      key={s.value}
                      onClick={() => setForm(p => ({ ...p, sponsor: s.value }))}
                      className={`rounded-xl border-2 p-4 text-left flex items-center gap-3 transition-all active:scale-[0.98] ${
                        selected
                          ? `border-foreground/40 ${s.bg} ring-2 ring-foreground/30 ring-offset-2 ring-offset-card`
                          : 'border-border bg-background hover:border-foreground/20'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${s.bg} ${s.text} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.value === 'owner' ? 'Sai do repasse dos donos' : 'Sai da receita Simplix'}</p>
                      </div>
                      {selected && <CheckCircle2 className="w-5 h-5 text-foreground shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantidade + Parceiro + Validade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Quantidade <span className="text-muted-foreground font-normal">(1-100)</span></Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))}
                />
              </div>
              <div>
                <Label>Parceiro <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  value={form.partnerName}
                  onChange={e => setForm(p => ({ ...p, partnerName: e.target.value }))}
                  placeholder="Ex: Restaurante X"
                />
              </div>
              <div>
                <Label>Validade <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} />
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground border border-border">
              <span className="font-medium text-foreground">Total a emitir: </span>
              {form.quantity} × {formatBRL(form.value)} =
              <span className="font-bold text-foreground"> {formatBRL(form.quantity * form.value)}</span>
              <span className="text-muted-foreground/70"> (custo máximo se 100% usados, bancado por {form.sponsor === 'owner' ? 'donos dos barcos' : 'Simplix'})</span>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button onClick={save} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                Gerar {form.quantity} {form.quantity === 1 ? 'voucher' : 'vouchers'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'unused', 'used'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {f === 'all' ? `Todos (${vouchers.length})` : f === 'unused' ? `Não usados (${vouchers.length - totalUsed})` : `Usados (${totalUsed})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Ticket className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">Nenhum voucher</p>
          <p className="text-sm text-muted-foreground">Gere um lote para começar.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Código</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Valor</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Sponsor</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Parceiro</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Validade</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const sponsor = SPONSORS.find(s => s.value === v.sponsor);
                const isExpired = v.expires_at && new Date(v.expires_at) < new Date() && !v.is_used;
                return (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{v.code}</td>
                    <td className="px-4 py-3 font-bold text-foreground tabular-nums">{formatBRL(Number(v.value))}</td>
                    <td className="px-4 py-3">
                      {sponsor && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sponsor.bg} ${sponsor.text}`}>
                          <sponsor.icon className="w-3 h-3" />
                          {sponsor.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.partner_name ?? <span className="italic text-muted-foreground/60">—</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {v.expires_at ? (
                        <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(v.expires_at).toLocaleDateString('pt-BR')}</span>
                      ) : (
                        <span className="italic text-muted-foreground/60">Sem validade</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {v.is_used ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Usado {v.used_at ? `em ${new Date(v.used_at).toLocaleDateString('pt-BR')}` : ''}
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                          <XCircle className="w-3 h-3" />
                          Expirado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                          Disponível
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => copyCode(v.code)} className="gap-1.5" disabled={v.is_used}>
                        {copiedCode === v.code ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminVouchers;
