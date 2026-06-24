import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, CreditCard, Wallet, CheckCircle, Users, Building2, Anchor, Megaphone, Ticket, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Split constants — kept in sync with platform_config table
// Gamma boats (pilot_type='pilot'):       pilot 45% / owners 45% / simplix 10%
// Partner boats (pilot_type='partner_boat'): owner 60% / simplix 40%
const PILOT_PCT = 0.45;
const SIMPLIX_PCT = 0.10;
const OWNERS_PCT = 0.45;
const PARTNER_BOAT_PCT = 0.60;

type PilotType = 'pilot' | 'partner_boat';

const sharePercentFor = (t: PilotType | null | undefined): number =>
  t === 'partner_boat' ? PARTNER_BOAT_PCT : PILOT_PCT;

const PILOT_TYPE_LABEL: Record<PilotType, string> = {
  pilot: 'Piloto Gamma',
  partner_boat: 'Barco Parceiro',
};

interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  ride_id: string | null;
  mp_fee: number;
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

interface PilotDayPayout {
  key: string; // pilot_profile_id + ':' + date
  pilot_profile_id: string;
  pilot_user_id: string;
  pilot_name: string;
  pilot_type: PilotType;
  share_percent: number; // 0.45 ou 0.60
  pix_key: string | null;
  pix_key_type: string | null;
  date: string; // YYYY-MM-DD do created_at
  rides_count: number;
  gross: number;
  pilot_share: number;
  earning_ids: string[];
}

type PayoutMethod = 'pix' | 'cash' | 'transfer' | 'other';

interface PayoutFormState {
  paid_date: string; // YYYY-MM-DD
  method: PayoutMethod;
  reference: string;
  notes: string;
}

const PAYOUT_METHOD_LABEL: Record<PayoutMethod, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  transfer: 'Transferência bancária',
  other: 'Outro',
};

interface PayoutHistoryRow {
  key: string; // pilot_payouts.id
  payout_id: string;
  pilot_profile_id: string;
  pilot_name: string;
  pilot_type: PilotType;
  share_percent: number;
  pix_key: string | null;
  pix_key_type: string | null;
  paid_date: string; // YYYY-MM-DD do paid_at
  rides_count: number;
  gross: number;
  pilot_share: number;
  method: PayoutMethod | null;
  reference: string | null;
  notes: string | null;
}

interface AdSale {
  id: string;
  price: number;
  sold_at: string;
  duration_days: number | null;
  advertiser_name: string | null;
  title: string;
}

interface VoucherCostSummary {
  total_count: number;
  total_value: number;
  owner_count: number;
  owner_value: number;
  platform_count: number;
  platform_value: number;
  month_value: number;
  redeemed_value: number; // ja resgatado (virou saldo)
}

interface PaidRide {
  id: string;
  price: number;
  gross_price: number | null;
  discount_amount: number | null;
  voucher_discount_amount: number | null;
  voucher_sponsor: 'owner' | 'platform' | null;
  completed_at: string | null;
  pilot_type: PilotType; // 'pilot' (Gamma) ou 'partner_boat'
  mp_fee: number; // taxa MP daquele ride (0 se wallet)
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
  const [pilotPayouts, setPilotPayouts] = useState<PilotDayPayout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  // Filter by pilot
  const [selectedPilot, setSelectedPilot] = useState<string>('all');
  // Histórico de repasses já efetuados (últimos 30 dias)
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  // Custo de vouchers (cobrado na criação)
  const [voucherCosts, setVoucherCosts] = useState<VoucherCostSummary | null>(null);
  const [voucherCostsLoading, setVoucherCostsLoading] = useState(true);
  // Ad sales (100% platform revenue)
  const [adSales, setAdSales] = useState<AdSale[]>([]);
  // Paid rides — needed to compute fair split (pilot gets gross share, discount absorbed by owner+simplix)
  const [paidRides, setPaidRides] = useState<PaidRide[]>([]);

  const loadPilotPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    const { data } = await supabase
      .from('pilot_earnings')
      .select('id, pilot_profile_id, pilot_user_id, gross_amount, created_at, pilot_profiles(full_name, pix_key, pix_key_type, pilot_type)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      const grouped: Record<string, PilotDayPayout> = {};
      for (const row of data) {
        const id = row.pilot_profile_id as string;
        const userId = row.pilot_user_id as string;
        const profile = row.pilot_profiles as { full_name?: string; pix_key?: string | null; pix_key_type?: string | null; pilot_type?: PilotType } | null;
        const name = profile?.full_name ?? 'Piloto desconhecido';
        const ptype: PilotType = profile?.pilot_type ?? 'pilot';
        const sharePct = sharePercentFor(ptype);
        const date = String(row.created_at).slice(0, 10);
        const key = `${id}:${date}`;
        const gross = Number(row.gross_amount);
        if (!grouped[key]) {
          grouped[key] = {
            key,
            pilot_profile_id: id,
            pilot_user_id: userId,
            pilot_name: name,
            pilot_type: ptype,
            share_percent: sharePct,
            pix_key: profile?.pix_key ?? null,
            pix_key_type: profile?.pix_key_type ?? null,
            date,
            rides_count: 0,
            gross: 0,
            pilot_share: 0,
            earning_ids: [],
          };
        }
        grouped[key].rides_count += 1;
        grouped[key].gross += gross;
        grouped[key].pilot_share += gross * sharePct;
        grouped[key].earning_ids.push(row.id as string);
      }
      // Mais recente primeiro
      setPilotPayouts(Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date)));
    }
    setPayoutsLoading(false);
  }, []);

  const loadPayoutHistory = useCallback(async () => {
    setHistoryLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    // 1. Busca todos os payouts dos ultimos 30 dias com pilot info
    const { data: payouts } = await supabase
      .from('pilot_payouts')
      .select('id, pilot_profile_id, amount, paid_at, method, reference, notes, pilot_profiles(full_name, pix_key, pix_key_type, pilot_type)')
      .gte('paid_at', cutoff.toISOString())
      .order('paid_at', { ascending: false });

    if (!payouts) {
      setHistoryLoading(false);
      return;
    }

    // 2. Conta corridas (earnings) por payout
    const payoutIds = payouts.map(p => p.id as string);
    let earningsByPayout: Record<string, { rides_count: number; gross: number }> = {};
    if (payoutIds.length > 0) {
      const { data: earnings } = await supabase
        .from('pilot_earnings')
        .select('payout_id, gross_amount')
        .in('payout_id', payoutIds);
      if (earnings) {
        for (const e of earnings) {
          const pid = e.payout_id as string;
          if (!earningsByPayout[pid]) earningsByPayout[pid] = { rides_count: 0, gross: 0 };
          earningsByPayout[pid].rides_count += 1;
          earningsByPayout[pid].gross += Number(e.gross_amount);
        }
      }
    }

    const rows: PayoutHistoryRow[] = payouts.map(p => {
      const profile = p.pilot_profiles as { full_name?: string; pix_key?: string | null; pix_key_type?: string | null; pilot_type?: PilotType } | null;
      const ptype: PilotType = profile?.pilot_type ?? 'pilot';
      const aggr = earningsByPayout[p.id as string] ?? { rides_count: 0, gross: 0 };
      return {
        key: p.id as string,
        payout_id: p.id as string,
        pilot_profile_id: p.pilot_profile_id as string,
        pilot_name: profile?.full_name ?? 'Piloto desconhecido',
        pilot_type: ptype,
        share_percent: sharePercentFor(ptype),
        pix_key: profile?.pix_key ?? null,
        pix_key_type: profile?.pix_key_type ?? null,
        paid_date: String(p.paid_at).slice(0, 10),
        rides_count: aggr.rides_count,
        gross: aggr.gross,
        pilot_share: Number(p.amount),
        method: (p.method as PayoutMethod) ?? null,
        reference: (p.reference as string) ?? null,
        notes: (p.notes as string) ?? null,
      };
    });

    setPayoutHistory(rows);
    setHistoryLoading(false);
  }, []);

  const [payoutModalGroup, setPayoutModalGroup] = useState<PilotDayPayout | null>(null);
  const [payoutForm, setPayoutForm] = useState<PayoutFormState>({
    paid_date: new Date().toISOString().slice(0, 10),
    method: 'pix',
    reference: '',
    notes: '',
  });

  const openPayoutModal = (group: PilotDayPayout) => {
    setPayoutForm({
      paid_date: new Date().toISOString().slice(0, 10),
      method: 'pix',
      reference: '',
      notes: '',
    });
    setPayoutModalGroup(group);
  };

  const closePayoutModal = () => {
    setPayoutModalGroup(null);
  };

  const handleSubmitPayout = async () => {
    if (!payoutModalGroup) return;
    const group = payoutModalGroup;
    setMarkingPaid(group.key);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // 1. INSERT payout
      const { data: payout, error: payoutError } = await supabase
        .from('pilot_payouts')
        .insert({
          pilot_profile_id: group.pilot_profile_id,
          pilot_user_id: group.pilot_user_id,
          amount: Number(group.pilot_share.toFixed(2)),
          paid_at: new Date(payoutForm.paid_date + 'T12:00:00').toISOString(),
          method: payoutForm.method,
          reference: payoutForm.reference.trim() || null,
          notes: payoutForm.notes.trim() || null,
          created_by: user?.id ?? null,
        })
        .select('id, paid_at')
        .single();
      if (payoutError) throw payoutError;

      // 2. UPDATE earnings — vincula ao payout + marca pago
      const { error: updateError } = await supabase
        .from('pilot_earnings')
        .update({ status: 'paid', paid_at: payout.paid_at, payout_id: payout.id })
        .in('id', group.earning_ids);
      if (updateError) throw updateError;

      setPilotPayouts((prev) => prev.filter((p) => p.key !== group.key));
      closePayoutModal();
      loadPayoutHistory();
    } catch (err) {
      console.error('Error registering payout:', err);
      alert('Erro ao registrar pagamento. Tente novamente.');
    } finally {
      setMarkingPaid(null);
    }
  };

  const downloadCSV = (filename: string, rows: Record<string, string | number>[]) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(';'),
      ...rows.map(r => headers.map(h => esc(r[h])).join(';')),
    ].join('\n');
    // BOM pra Excel reconhecer UTF-8
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openReceiptWindow = (title: string, html: string) => {
    const win = window.open('', '_blank', 'width=720,height=900');
    if (!win) {
      alert('Permita janelas pop-up pra abrir o recibo.');
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; padding: 32px; }
  .header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 22px; font-weight: 800; }
  .header .meta { font-size: 12px; color: #666; text-align: right; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  .row .label { color: #666; }
  .row .value { font-weight: 600; }
  .total { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f5f5f5; border-radius: 8px; margin-top: 24px; }
  .total .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .total .value { font-size: 28px; font-weight: 800; color: #0066cc; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
  .actions { margin-top: 24px; text-align: center; }
  .actions button { padding: 10px 20px; background: #0066cc; color: white; border: 0; border-radius: 6px; font-weight: 600; cursor: pointer; }
  @media print { .actions { display: none; } body { padding: 16px; } }
</style>
</head>
<body>
${html}
<div class="actions">
  <button onclick="window.print()">Salvar como PDF / Imprimir</button>
</div>
</body>
</html>`);
    win.document.close();
  };

  const buildReceiptHtml = (params: {
    pilotName: string;
    pilotType: PilotType;
    sharePercent: number; // 0.45 ou 0.60
    pixKey: string | null;
    pixKeyType: string | null;
    refDate: string; // YYYY-MM-DD
    refLabel: string; // "Data do serviço" ou "Data do repasse"
    ridesCount: number;
    gross: number;
    pilotShare: number;
    status: string;
    method?: PayoutMethod | null;
    reference?: string | null;
    notes?: string | null;
  }) => {
    const fmtBR = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;
    const dateLabel = new Date(params.refDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const generatedAt = new Date().toLocaleString('pt-BR');
    const pixLine = params.pixKey
      ? `${params.pixKeyType ? params.pixKeyType.toUpperCase() : 'PIX'}: ${params.pixKey}`
      : '<em style="color:#c87800">Sem PIX cadastrado</em>';
    const pctLabel = `${(params.sharePercent * 100).toFixed(0)}%`;
    const recipientLabel = params.pilotType === 'partner_boat' ? 'Repasse barco parceiro' : 'Comissão piloto';
    return `
<div class="header">
  <h1>Recibo de Repasse — Gamma</h1>
  <div class="meta">Gerado em<br/>${generatedAt}</div>
</div>
<div class="row"><span class="label">Piloto</span><span class="value">${params.pilotName}</span></div>
<div class="row"><span class="label">Tipo</span><span class="value">${PILOT_TYPE_LABEL[params.pilotType]}</span></div>
<div class="row"><span class="label">${params.refLabel}</span><span class="value">${dateLabel}</span></div>
<div class="row"><span class="label">Corridas realizadas</span><span class="value">${params.ridesCount}</span></div>
<div class="row"><span class="label">Total bruto</span><span class="value">${fmtBR(params.gross)}</span></div>
<div class="row"><span class="label">${recipientLabel}</span><span class="value">${pctLabel}</span></div>
<div class="row"><span class="label">Chave PIX</span><span class="value">${pixLine}</span></div>
${params.method ? `<div class="row"><span class="label">Método</span><span class="value">${({pix:'PIX',cash:'Dinheiro',transfer:'Transferência',other:'Outro'} as Record<string,string>)[params.method]}</span></div>` : ''}
${params.reference ? `<div class="row"><span class="label">Referência</span><span class="value" style="font-family:monospace;font-size:11px">${params.reference}</span></div>` : ''}
${params.notes ? `<div class="row"><span class="label">Observações</span><span class="value" style="text-align:right;max-width:60%">${params.notes}</span></div>` : ''}
<div class="row"><span class="label">Status</span><span class="value">${params.status}</span></div>
<div class="total">
  <span class="label">Valor a receber</span>
  <span class="value">${fmtBR(params.pilotShare)}</span>
</div>
<div class="footer">Documento gerado pelo painel administrativo Gamma. Use como comprovante de repasse para o piloto.</div>
`;
  };

  const handleExportPendingCSV = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const visible = selectedPilot === 'all' ? pilotPayouts : pilotPayouts.filter(p => p.pilot_profile_id === selectedPilot);
    const rows = visible.map(p => ({
      Data: p.date,
      Piloto: p.pilot_name,
      Tipo: PILOT_TYPE_LABEL[p.pilot_type],
      '%': `${(p.share_percent * 100).toFixed(0)}%`,
      Corridas: p.rides_count,
      'Bruto (R$)': p.gross.toFixed(2).replace('.', ','),
      'Repasse (R$)': p.pilot_share.toFixed(2).replace('.', ','),
      PIX: p.pix_key ?? '',
      'Tipo PIX': p.pix_key_type ?? '',
      Status: 'Pendente',
    }));
    downloadCSV(`repasses-pendentes-${stamp}.csv`, rows);
  };

  const handleExportHistoryCSV = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const visible = selectedPilot === 'all' ? payoutHistory : payoutHistory.filter(h => h.pilot_profile_id === selectedPilot);
    const rows = visible.map(h => ({
      'Data do repasse': h.paid_date,
      Piloto: h.pilot_name,
      Tipo: PILOT_TYPE_LABEL[h.pilot_type],
      '%': `${(h.share_percent * 100).toFixed(0)}%`,
      Corridas: h.rides_count,
      'Bruto (R$)': h.gross.toFixed(2).replace('.', ','),
      'Repassado (R$)': h.pilot_share.toFixed(2).replace('.', ','),
      Método: h.method ? PAYOUT_METHOD_LABEL[h.method] : '',
      Referência: h.reference ?? '',
      Observações: h.notes ?? '',
      PIX: h.pix_key ?? '',
      'Tipo PIX': h.pix_key_type ?? '',
    }));
    downloadCSV(`repasses-historico-${stamp}.csv`, rows);
  };

  const handleOpenReceipt = (p: PilotDayPayout) => {
    const html = buildReceiptHtml({
      pilotName: p.pilot_name,
      pilotType: p.pilot_type,
      sharePercent: p.share_percent,
      pixKey: p.pix_key,
      pixKeyType: p.pix_key_type,
      refDate: p.date,
      refLabel: 'Data do serviço',
      ridesCount: p.rides_count,
      gross: p.gross,
      pilotShare: p.pilot_share,
      status: 'Pendente — aguardando repasse',
    });
    openReceiptWindow(`Recibo ${p.pilot_name} — ${p.date}`, html);
  };

  const handleOpenHistoryReceipt = (h: PayoutHistoryRow) => {
    const html = buildReceiptHtml({
      pilotName: h.pilot_name,
      pilotType: h.pilot_type,
      sharePercent: h.share_percent,
      pixKey: h.pix_key,
      pixKeyType: h.pix_key_type,
      refDate: h.paid_date,
      refLabel: 'Data do repasse',
      ridesCount: h.rides_count,
      gross: h.gross,
      pilotShare: h.pilot_share,
      status: 'Repassado',
      method: h.method,
      reference: h.reference,
      notes: h.notes,
    });
    openReceiptWindow(`Recibo ${h.pilot_name} — ${h.paid_date}`, html);
  };

  const handleCopyPix = (pixKey: string) => {
    navigator.clipboard?.writeText(pixKey).catch(() => {
      // Fallback: cria textarea e copia
      const ta = document.createElement('textarea');
      ta.value = pixKey;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    });
  };

  const loadVoucherCosts = useCallback(async () => {
    setVoucherCostsLoading(true);
    const { data } = await supabase
      .from('vouchers')
      .select('value, sponsor, created_at, is_used');
    if (data) {
      const monthStartIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const summary: VoucherCostSummary = {
        total_count: 0, total_value: 0,
        owner_count: 0, owner_value: 0,
        platform_count: 0, platform_value: 0,
        month_value: 0, redeemed_value: 0,
      };
      for (const v of data) {
        const value = Number(v.value);
        summary.total_count += 1;
        summary.total_value += value;
        if (v.sponsor === 'owner') {
          summary.owner_count += 1;
          summary.owner_value += value;
        } else if (v.sponsor === 'platform') {
          summary.platform_count += 1;
          summary.platform_value += value;
        }
        if (v.created_at && v.created_at >= monthStartIso) {
          summary.month_value += value;
        }
        if (v.is_used) summary.redeemed_value += value;
      }
      setVoucherCosts(summary);
    }
    setVoucherCostsLoading(false);
  }, []);

  useEffect(() => {
    loadPilotPayouts();
    loadPayoutHistory();
    loadVoucherCosts();
  }, [loadPilotPayouts, loadPayoutHistory, loadVoucherCosts]);

  useEffect(() => {
    const load = async () => {
      // Carrega cada fonte separadamente — se uma falhar, nao derruba as outras
      const safeQuery = async <T,>(label: string, p: Promise<{ data: T | null; error: unknown }>): Promise<T[]> => {
        try {
          const { data, error } = await p;
          if (error) {
            console.error(`[AdminFinancial] ${label} query error:`, error);
            return [];
          }
          return (data ?? []) as unknown as T[];
        } catch (e) {
          console.error(`[AdminFinancial] ${label} crashed:`, e);
          return [];
        }
      };

      const [pData, wData, adsData, ridesData] = await Promise.all([
        safeQuery<PaymentRow>('payments', supabase.from('payments')
          .select('id, amount, status, paid_at, created_at, ride_id, mp_fee')
          .order('created_at', { ascending: false })
          .limit(100) as unknown as Promise<{ data: PaymentRow[] | null; error: unknown }>),
        safeQuery<WalletTx>('wallet_transactions', supabase.from('wallet_transactions')
          .select('id, amount, type, status, created_at, description')
          .order('created_at', { ascending: false })
          .limit(100) as unknown as Promise<{ data: WalletTx[] | null; error: unknown }>),
        safeQuery<AdSale>('partner_ads', supabase.from('partner_ads')
          .select('id, price, sold_at, duration_days, advertiser_name, title')
          .not('sold_at', 'is', null)
          .order('sold_at', { ascending: false })
          .limit(50) as unknown as Promise<{ data: AdSale[] | null; error: unknown }>),
        safeQuery<{
          id: string;
          price: number;
          gross_price: number | null;
          discount_amount: number | null;
          voucher_discount_amount: number | null;
          completed_at: string | null;
          pilot_user_id: string | null;
        }>('rides', supabase.from('rides')
          .select('id, price, gross_price, discount_amount, voucher_discount_amount, completed_at, pilot_user_id')
          .eq('payment_status', 'paid')
          .order('completed_at', { ascending: false })
          .limit(500) as unknown as Promise<{ data: unknown[] | null; error: unknown }>),
      ]);

      const pRes = { data: pData };
      const wRes = { data: wData };
      const adsRes = { data: adsData };
      const ridesRes = { data: ridesData };

      const pmts = pRes.data ?? [];
      setPayments(pmts);
      setWalletTxs(wRes.data ?? []);
      setAdSales((adsRes.data ?? []) as AdSale[]);
      // Flatten the joined voucher relation for easier consumption downstream.
      const ridesRaw = (ridesRes.data ?? []) as Array<{
        id: string;
        price: number;
        gross_price: number | null;
        discount_amount: number | null;
        voucher_discount_amount: number | null;
        completed_at: string | null;
        pilot_user_id: string | null;
      }>;

      // Batch-fetch pilot_type para os pilotos das rides
      const pilotUserIds = Array.from(new Set(ridesRaw.map(r => r.pilot_user_id).filter(Boolean) as string[]));
      const pilotTypeMap = new Map<string, PilotType>();
      if (pilotUserIds.length > 0) {
        const { data: pilotProfiles } = await supabase
          .from('pilot_profiles')
          .select('user_id, pilot_type')
          .in('user_id', pilotUserIds);
        (pilotProfiles ?? []).forEach((p: { user_id: string; pilot_type: PilotType }) => {
          pilotTypeMap.set(p.user_id, p.pilot_type ?? 'pilot');
        });
      }

      // Batch-fetch mp_fee por ride_id (so paga MP, wallet eh zero)
      const rideIds = ridesRaw.map(r => r.id);
      const mpFeeMap = new Map<string, number>();
      if (rideIds.length > 0) {
        const { data: paidPayments } = await supabase
          .from('payments')
          .select('ride_id, mp_fee')
          .in('ride_id', rideIds)
          .eq('status', 'completed');
        (paidPayments ?? []).forEach((p: { ride_id: string; mp_fee: number }) => {
          const prev = mpFeeMap.get(p.ride_id) ?? 0;
          mpFeeMap.set(p.ride_id, prev + Number(p.mp_fee ?? 0));
        });
      }

      setPaidRides(ridesRaw.map(r => ({
        id: r.id,
        price: r.price,
        gross_price: r.gross_price,
        discount_amount: r.discount_amount,
        voucher_discount_amount: r.voucher_discount_amount,
        voucher_sponsor: null, // join removido — buscar separadamente quando necessario
        completed_at: r.completed_at,
        pilot_type: r.pilot_user_id ? (pilotTypeMap.get(r.pilot_user_id) ?? 'pilot') : 'pilot',
        mp_fee: mpFeeMap.get(r.id) ?? 0,
      })));

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
  const mpRevenue = completedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => ['pending', 'in_process'].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0);
  // Corridas pagas via carteira (wallet_transactions.type='ride_payment')
  const walletRidePayments = walletTxs.filter(t => t.type === 'ride_payment' && t.status === 'completed');
  const walletRideRevenue = walletRidePayments.reduce((s, t) => s + Number(t.amount), 0);
  // Receita total = MP + carteira (bruto recebido em corridas, independente do meio)
  const totalRevenue = mpRevenue + walletRideRevenue;
  // Recargas de carteira (passageiro pos saldo via PIX)
  const walletTopups = walletTxs.filter(t => t.type === 'topup' && t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0);
  const todayRevenue = daily.find(d => d.date === new Date().toISOString().slice(0, 10))?.total ?? 0;
  const paidRidesCount = paidRides.length;

  // Revenue split totals — fair-discount model
  // Pilot Gamma sempre recebe 45% do bruto intacto; Barco Parceiro 60%.
  // Voucher discount eh integralmente absorvido pelo sponsor declarado;
  // referral discount eh dividido proporcionalmente entre owner e simplix.
  // Taxa MP eh deduzida do pool owner+simplix (Gamma) ou simplix (parceiro)
  // pra que o saldo MP confira com o sistema.
  const ownerSimplixSum = OWNERS_PCT + SIMPLIX_PCT; // 0.55
  const partnerPlatformSum = PARTNER_BOAT_PCT + (1 - PARTNER_BOAT_PCT); // 1.0
  let totalPilot = 0;
  let totalOwners = 0;
  let totalSimplix = 0;
  let totalDiscount = 0;
  let totalVoucherOwner = 0;
  let totalVoucherPlatform = 0;
  let totalMpFee = 0;

  for (const r of paidRides) {
    const gross = Number(r.gross_price ?? r.price);
    const totalDisc = Number(r.discount_amount ?? 0);
    const voucherDisc = Number(r.voucher_discount_amount ?? 0);
    const referralDisc = Math.max(0, totalDisc - voucherDisc);
    const mpFee = Number(r.mp_fee ?? 0);
    const isPartnerBoat = r.pilot_type === 'partner_boat';

    let pilotShare: number;
    let ownerShare: number;
    let simplixShare: number;

    if (isPartnerBoat) {
      // Barco Parceiro: 60% parceiro / 40% plataforma — sem dono separado
      pilotShare = gross * PARTNER_BOAT_PCT;
      ownerShare = 0;
      simplixShare = gross - pilotShare;
      // MP fee toda em cima de simplix (so existe ele do lado da plataforma)
      simplixShare -= mpFee;
      // Voucher sponsor=owner nesse modelo nao faz sentido — fallback simplix
      if (voucherDisc > 0) simplixShare -= voucherDisc;
      if (referralDisc > 0) simplixShare -= referralDisc;
    } else {
      // Piloto Gamma: 45/45/10
      pilotShare = gross * PILOT_PCT;
      ownerShare = gross * OWNERS_PCT;
      simplixShare = gross * SIMPLIX_PCT;

      // Voucher: sponsor paga integral
      if (voucherDisc > 0 && r.voucher_sponsor === 'owner') {
        ownerShare -= voucherDisc;
      } else if (voucherDisc > 0 && r.voucher_sponsor === 'platform') {
        simplixShare -= voucherDisc;
      }

      // Referral: rateio proporcional 45:10 entre owner e simplix
      if (referralDisc > 0) {
        ownerShare -= referralDisc * (OWNERS_PCT / ownerSimplixSum);
        simplixShare -= referralDisc * (SIMPLIX_PCT / ownerSimplixSum);
      }

      // Taxa MP: rateio proporcional 45:10 entre owner e simplix
      if (mpFee > 0) {
        ownerShare -= mpFee * (OWNERS_PCT / ownerSimplixSum);
        simplixShare -= mpFee * (SIMPLIX_PCT / ownerSimplixSum);
      }
    }

    totalPilot += pilotShare;
    totalOwners += ownerShare;
    totalSimplix += simplixShare;
    totalDiscount += totalDisc;
    totalMpFee += mpFee;
    if (r.voucher_sponsor === 'owner') totalVoucherOwner += voucherDisc;
    if (r.voucher_sponsor === 'platform') totalVoucherPlatform += voucherDisc;
  }
  // partnerPlatformSum is used implicitly above via PARTNER_BOAT_PCT; reference
  // to satisfy unused-var lint without changing semantics
  void partnerPlatformSum;

  // Ad sales (100% platform extra revenue)
  const totalAdRevenue = adSales.reduce((s, a) => s + Number(a.price), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthAdRevenue = adSales
    .filter(a => new Date(a.sold_at) >= monthStart)
    .reduce((s, a) => s + Number(a.price), 0);

  // Pilot filter options — deduplicar (varias linhas dia x piloto)
  const uniquePilots = Array.from(
    new Map(pilotPayouts.map(p => [p.pilot_profile_id, p.pilot_name])).entries()
  ).map(([id, name]) => ({ id, name }));
  const pilotOptions = [{ id: 'all', name: 'Todos os pilotos' }, ...uniquePilots];
  const filteredPayouts = selectedPilot === 'all' ? pilotPayouts : pilotPayouts.filter(p => p.pilot_profile_id === selectedPilot);
  const filteredHistory = selectedPilot === 'all' ? payoutHistory : payoutHistory.filter(p => p.pilot_profile_id === selectedPilot);
  const totalPendingPayout = filteredPayouts.reduce((s, p) => s + p.pilot_share, 0);
  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

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
            <StatCard
              icon={DollarSign}
              label="Receita total bruta"
              value={fmt(totalRevenue)}
              sub={`${paidRidesCount} ${paidRidesCount === 1 ? 'corrida paga' : 'corridas pagas'} · MP ${fmt(mpRevenue)} + carteira ${fmt(walletRideRevenue)}`}
              color="green"
            />
            <StatCard
              icon={TrendingUp}
              label="Receita hoje (MP)"
              value={fmt(todayRevenue)}
              sub="Soma das tabela payments concluídos"
              color="blue"
            />
            <StatCard
              icon={CreditCard}
              label="Pagamentos pendentes"
              value={fmt(totalPending)}
              sub="Mercado Pago"
              color="orange"
            />
            <StatCard
              icon={Wallet}
              label="Recargas de carteira"
              value={fmt(walletTopups)}
              sub="PIX para saldo (não inclui voucher)"
              color="purple"
            />
          </div>

          {/* Ad sales — 100% platform revenue */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Receita de Anúncios <span className="text-xs font-normal text-muted-foreground">— 100% plataforma</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <StatCard icon={Megaphone} label="Total vendido (anúncios)" value={fmt(totalAdRevenue)} sub={`${adSales.length} ${adSales.length === 1 ? 'venda' : 'vendas'}`} color="green" />
              <StatCard icon={TrendingUp} label="Anúncios — este mês" value={fmt(monthAdRevenue)} color="blue" />
            </div>
            {adSales.length > 0 && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Data</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Cliente</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Anúncio</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Pacote</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adSales.slice(0, 10).map(a => (
                      <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(a.sold_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-foreground">{a.advertiser_name ?? <span className="text-muted-foreground italic">—</span>}</td>
                        <td className="px-4 py-3 text-foreground truncate max-w-[200px]">{a.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.duration_days ? `${a.duration_days} dias` : '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 tabular-nums">{fmt(Number(a.price))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Custos de Vouchers — cobrados na criacao */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Custos de Vouchers <span className="text-xs font-normal text-muted-foreground">— cobrado na criação</span>
            </h2>
            {voucherCostsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : !voucherCosts || voucherCosts.total_count === 0 ? (
              <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground text-sm">
                Nenhum voucher emitido ainda.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                  <StatCard
                    icon={Ticket}
                    label="Total emitido"
                    value={fmt(voucherCosts.total_value)}
                    sub={`${voucherCosts.total_count} ${voucherCosts.total_count === 1 ? 'voucher' : 'vouchers'}`}
                    color="orange"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Emitido este mês"
                    value={fmt(voucherCosts.month_value)}
                    color="blue"
                  />
                  <StatCard
                    icon={Users}
                    label="Patrocinado por Dono"
                    value={fmt(voucherCosts.owner_value)}
                    sub={`${voucherCosts.owner_count} ${voucherCosts.owner_count === 1 ? 'voucher' : 'vouchers'}`}
                    color="green"
                  />
                  <StatCard
                    icon={Building2}
                    label="Patrocinado por Plataforma"
                    value={fmt(voucherCosts.platform_value)}
                    sub={`${voucherCosts.platform_count} ${voucherCosts.platform_count === 1 ? 'voucher' : 'vouchers'}`}
                    color="purple"
                  />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-700">
                  <strong>Como funciona:</strong> o custo do voucher é registrado na hora da criação. Já resgatado (virou saldo): <span className="font-bold tabular-nums">{fmt(voucherCosts.redeemed_value)}</span>. A diferença é "responsabilidade futura" — voucher emitido mas ainda não usado pelo passageiro.
                </div>
              </>
            )}
          </div>

          {/* Taxa Mercado Pago — afeta owner+simplix proporcionalmente */}
          {totalMpFee > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Taxa Mercado Pago <span className="text-xs font-normal text-muted-foreground">— deduzida do pool dono+Simplix</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard
                  icon={CreditCard}
                  label="Total cobrado pela MP"
                  value={fmt(totalMpFee)}
                  sub="Capturado do webhook (real) ou estimado no backfill"
                  color="orange"
                />
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-center">
                  <p>
                    <strong>Como funciona:</strong> Piloto Gamma recebe 45% do bruto intacto. A taxa MP é dividida entre dono do barco (~81.8%) e Simplix (~18.2%) na razão 45:10. Para Barco Parceiro, a Simplix absorve a taxa toda.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Revenue split */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Divisão de Receita</h2>
              {totalDiscount > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Descontos absorvidos:</span>{' '}
                  <span className="font-bold text-amber-600 tabular-nums">{fmt(totalDiscount)}</span>
                  <span className="ml-1">(donos + Simplix)</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Anchor className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">PILOTOS (45%)</p>
                    <p className="text-xl font-bold text-foreground">{fmt(totalPilot)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">45% do valor bruto (antes do desconto)</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">DONOS DO BARCO (45%)</p>
                    <p className="text-xl font-bold text-foreground">{fmt(totalOwners)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Após descontos absorvidos proporcionalmente</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">SIMPLIX (10%)</p>
                    <p className="text-xl font-bold text-foreground">{fmt(totalSimplix)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Após descontos absorvidos proporcionalmente</p>
              </div>
            </div>
          </div>

          {/* Pilot Payouts — repasses diarios pendentes */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pagamentos a Pilotos</h2>
                <p className="text-xs text-muted-foreground">
                  Repasses pendentes agrupados por dia. {filteredPayouts.length > 0 && (
                    <span className="font-semibold text-foreground">
                      Total a pagar: <span className="text-blue-600 tabular-nums">{fmt(totalPendingPayout)}</span>
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedPilot}
                  onChange={e => setSelectedPilot(e.target.value)}
                  className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground"
                >
                  {pilotOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportPendingCSV}
                  disabled={filteredPayouts.length === 0}
                  className="gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </div>
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
              <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Dia</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Piloto</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Tipo</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Corridas</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Bruto</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-blue-600">Repassar</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">PIX</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayouts.map((p) => (
                      <tr key={p.key} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">{fmtDate(p.date)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{p.pilot_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${p.pilot_type === 'partner_boat' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : 'bg-blue-500/10 text-blue-600 border-blue-500/30'}`}>
                            {PILOT_TYPE_LABEL[p.pilot_type]} {(p.share_percent * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{p.rides_count}</td>
                        <td className="px-4 py-3 text-right text-foreground tabular-nums">{fmt(p.gross)}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">{fmt(p.pilot_share)}</td>
                        <td className="px-4 py-3">
                          {p.pix_key ? (
                            <button
                              onClick={() => handleCopyPix(p.pix_key!)}
                              className="text-xs font-mono text-foreground hover:text-blue-600 underline decoration-dotted"
                              title="Clique para copiar"
                            >
                              {p.pix_key_type ? `${p.pix_key_type}: ` : ''}{p.pix_key}
                            </button>
                          ) : (
                            <span className="text-xs text-amber-600 italic">sem PIX cadastrado</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenReceipt(p)}
                              className="gap-1 h-8 px-2"
                              title="Gerar recibo PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Recibo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPayoutModal(p)}
                              disabled={markingPaid === p.key}
                              className="gap-1.5"
                            >
                              {markingPaid === p.key ? (
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Registrar Pagamento
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Histórico de Repasses — últimos 30 dias */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Histórico de Repasses</h2>
                <p className="text-xs text-muted-foreground">Últimos 30 dias. Usa o filtro de piloto acima.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportHistoryCSV}
                disabled={filteredHistory.length === 0}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </Button>
            </div>
            {historyLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground text-sm">
                Nenhum repasse marcado como pago nos últimos 30 dias.
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Data do repasse</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Piloto</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Método</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Corridas</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-blue-600">Repassado</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Recibo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((h) => (
                      <tr key={h.key} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">{fmtDate(h.paid_date)}</td>
                        <td className="px-4 py-3 text-foreground">{h.pilot_name}</td>
                        <td className="px-4 py-3 text-xs">
                          {h.method ? (
                            <span className="font-medium text-foreground">{PAYOUT_METHOD_LABEL[h.method]}</span>
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                          {h.reference && (
                            <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[160px]" title={h.reference}>
                              {h.reference}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{h.rides_count}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600 tabular-nums">{fmt(h.pilot_share)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenHistoryReceipt(h)}
                            className="gap-1 h-8 px-2"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Recibo
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
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-blue-600">Pilotos (45%)</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-green-600">Donos (45%)</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-purple-600">Simplix (10%)</th>
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
                        <td className="px-4 py-3 text-green-600">{fmt(d.total * OWNERS_PCT)}</td>
                        <td className="px-4 py-3 text-purple-600">{fmt(d.total * SIMPLIX_PCT)}</td>
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
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Piloto (45%)</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Dono + Simplix (55%)</th>
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

      {/* Modal: Registrar Pagamento */}
      {payoutModalGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closePayoutModal}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Registrar Pagamento</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {payoutModalGroup.pilot_name} — {fmtDate(payoutModalGroup.date)}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Valor (read-only) */}
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Valor a pagar</p>
                  <p className="text-2xl font-bold text-blue-600 tabular-nums">{fmt(payoutModalGroup.pilot_share)}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{payoutModalGroup.rides_count} corrida{payoutModalGroup.rides_count !== 1 ? 's' : ''}</p>
                  <p>{(payoutModalGroup.share_percent * 100).toFixed(0)}% de {fmt(payoutModalGroup.gross)}</p>
                </div>
              </div>

              {/* Data do pagamento */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Data do pagamento</label>
                <input
                  type="date"
                  value={payoutForm.paid_date}
                  onChange={(e) => setPayoutForm(f => ({ ...f, paid_date: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Método */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Método</label>
                <select
                  value={payoutForm.method}
                  onChange={(e) => setPayoutForm(f => ({ ...f, method: e.target.value as PayoutMethod }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="pix">PIX</option>
                  <option value="cash">Dinheiro</option>
                  <option value="transfer">Transferência bancária</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              {/* Referência (TX id) */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Referência <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={payoutForm.reference}
                  onChange={(e) => setPayoutForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="ID da transação PIX, número do recibo..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Observações <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Anotação interna..."
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={closePayoutModal} disabled={markingPaid === payoutModalGroup.key}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitPayout} disabled={markingPaid === payoutModalGroup.key}>
                {markingPaid === payoutModalGroup.key ? (
                  <span className="w-3.5 h-3.5 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 mr-2" />
                )}
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinancial;
