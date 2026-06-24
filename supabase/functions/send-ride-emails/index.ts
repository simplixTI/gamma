// Envia 2 emails apos corrida concluida: passageiro (resumo Uber-like) e
// piloto (recibo com bruto/comissao/liquido). Idempotente via ride_emails_sent.
// Chamado pela tela Completed.tsx ou via botao admin de reenvio.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://www.gamma.app.br';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendBody {
  ride_id: string;
  force?: boolean; // admin reenvio mesmo se ja enviado
}

const fmtBR = (n: number) => `R$ ${Number(n).toFixed(2).replace('.', ',')}`;

const fmtDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const paymentMethodLabel = (m: string | null | undefined): string => {
  switch (m) {
    case 'pix': return 'PIX';
    case 'card': case 'credit_card': return 'Cartão';
    case 'wallet': return 'Gamma Cash (saldo)';
    default: return m ?? 'Não informado';
  }
};

interface PassengerEmailParams {
  passengerName: string;
  pilotName: string;
  origin: string;
  destination: string;
  date: string;
  durationMin: number | null;
  price: number;
  paymentMethod: string;
}

const buildPassengerHtml = (p: PassengerEmailParams): string => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sua viagem com a Gamma</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1c1e;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:24px;">
    <tr>
      <td style="background:#000;padding:24px 32px;text-align:center;">
        <img src="https://gamma.app.br/logo.dark.png" alt="Gamma" width="120" style="display:inline-block;max-width:120px;height:auto;" />
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;">Obrigado pela viagem, ${p.passengerName}!</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#6e6e73;">Sua corrida com <strong style="color:#1c1c1e">${p.pilotName}</strong> foi concluída.</p>

        <div style="background:#f5f5f7;border-radius:10px;padding:20px;margin-bottom:24px;">
          <table cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td valign="top" width="22" style="padding-top:6px;"><div style="width:10px;height:10px;border-radius:50%;background:#34c759;"></div></td>
              <td>
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#86868b;">Embarque</p>
                <p style="margin:2px 0 12px;font-size:15px;font-weight:600;">${p.origin}</p>
              </td>
            </tr>
            <tr>
              <td valign="top" width="22" style="padding-top:6px;"><div style="width:10px;height:10px;border-radius:50%;background:#1c1c1e;"></div></td>
              <td>
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#86868b;">Destino</p>
                <p style="margin:2px 0 0;font-size:15px;font-weight:600;">${p.destination}</p>
              </td>
            </tr>
          </table>
        </div>

        <table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6e6e73;">Data e hora</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;">${p.date}</td></tr>
          ${p.durationMin != null ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6e6e73;">Tempo estimado</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;">${p.durationMin} min</td></tr>` : ''}
          <tr><td style="padding:8px 0;font-size:13px;color:#6e6e73;">Forma de pagamento</td><td style="padding:8px 0;font-size:13px;text-align:right;font-weight:600;">${p.paymentMethod}</td></tr>
        </table>

        <div style="background:#000;color:#fff;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
          <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.7;">Valor total</p>
          <p style="margin:4px 0 0;font-size:32px;font-weight:800;">${fmtBR(p.price)}</p>
        </div>

        <p style="margin:0 0 8px;font-size:14px;color:#6e6e73;text-align:center;">Como foi sua experiência? Avalie no app.</p>
        <p style="margin:0;font-size:11px;color:#86868b;text-align:center;">
          Gamma — Transporte aquático na Ilha da Gigoia<br/>
          <a href="https://gamma.app.br" style="color:#86868b;text-decoration:underline;">gamma.app.br</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

interface PilotEmailParams {
  pilotName: string;
  passengerName: string;
  rideShortId: string;
  origin: string;
  destination: string;
  date: string;
  durationMin: number | null;
  gross: number;
  sharePercent: number; // 0.45 ou 0.60
  net: number;
  isPartnerBoat: boolean;
  pixKey: string | null;
  pixKeyType: string | null;
}

const buildPilotHtml = (p: PilotEmailParams): string => {
  const sharePctLabel = `${(p.sharePercent * 100).toFixed(0)}%`;
  const platformCutPct = `${(100 - p.sharePercent * 100).toFixed(0)}%`;
  const platformCut = p.gross - p.net;
  const pixLine = p.pixKey
    ? `${(p.pixKeyType ?? 'PIX').toUpperCase()}: ${p.pixKey}`
    : 'Sem chave PIX cadastrada — atualize no app';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Recibo da Corrida #${p.rideShortId}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1c1e;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:24px;">
    <tr>
      <td style="background:#000;padding:24px 32px;text-align:center;">
        <img src="https://gamma.app.br/logo.dark.png" alt="Gamma" width="120" style="display:inline-block;max-width:120px;height:auto;" />
        <p style="margin:8px 0 0;color:#a1a1a6;font-size:13px;">Recibo de corrida</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Olá, ${p.pilotName}</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#6e6e73;">Recibo da corrida <strong style="color:#1c1c1e;">#${p.rideShortId}</strong> com ${p.passengerName}.</p>

        <div style="background:#f5f5f7;border-radius:10px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#86868b;">Trajeto</p>
          <p style="margin:6px 0 0;font-size:14px;font-weight:600;">${p.origin}</p>
          <p style="margin:2px 0;font-size:18px;color:#86868b;">↓</p>
          <p style="margin:0;font-size:14px;font-weight:600;">${p.destination}</p>
        </div>

        <table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
          <tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6e6e73;">Data e hora</td><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;">${p.date}</td></tr>
          ${p.durationMin != null ? `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6e6e73;">Tempo estimado</td><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;">${p.durationMin} min</td></tr>` : ''}
          <tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6e6e73;">Modelo</td><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;">${p.isPartnerBoat ? 'Barco Parceiro' : 'Piloto Gamma'}</td></tr>
        </table>

        <div style="background:#fafafa;border-radius:10px;padding:20px;margin-bottom:20px;">
          <table cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr><td style="padding:6px 0;font-size:13px;color:#6e6e73;">Valor bruto da corrida</td><td style="padding:6px 0;text-align:right;font-size:14px;font-weight:600;">${fmtBR(p.gross)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#6e6e73;">${p.isPartnerBoat ? 'Retenção plataforma' : 'Plataforma + dono do barco'} (${platformCutPct})</td><td style="padding:6px 0;text-align:right;font-size:14px;color:#d70015;">− ${fmtBR(platformCut)}</td></tr>
          </table>
        </div>

        <div style="background:#000;color:#fff;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
          <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.7;">Você recebe (${sharePctLabel})</p>
          <p style="margin:4px 0 0;font-size:32px;font-weight:800;">${fmtBR(p.net)}</p>
        </div>

        <div style="border:1px solid #e5e5ea;border-radius:10px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#86868b;">Repasse via</p>
          <p style="margin:6px 0 0;font-size:14px;font-weight:600;font-family:monospace;">${pixLine}</p>
        </div>

        <p style="margin:0 0 4px;font-size:12px;color:#6e6e73;text-align:center;">Status: aguardando repasse do administrador.</p>
        <p style="margin:0;font-size:11px;color:#86868b;text-align:center;">
          Gamma — Transporte aquático na Ilha da Gigoia<br/>
          <a href="https://gamma.app.br" style="color:#86868b;text-decoration:underline;">gamma.app.br</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

interface ResendSuccess { id: string }
interface ResendError { name: string; message: string }

const sendViaResend = async (
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<{ id?: string; error?: string }> => {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const json = await res.json();
    if (!res.ok) {
      const err = json as ResendError;
      return { error: `${res.status} ${err.name ?? 'error'}: ${err.message ?? 'unknown'}` };
    }
    return { id: (json as ResendSuccess).id };
  } catch (e) {
    return { error: String(e) };
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'Gamma <noreply@gamma.app.br>';

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'missing_auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { ride_id, force } = await req.json() as SendBody;
    if (!ride_id) {
      return new Response(JSON.stringify({ error: 'ride_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Carrega corrida + checa permissao
    const { data: ride, error: rideError } = await adminClient
      .from('rides')
      .select('id, origin_name, destination_name, price, estimated_time, completed_at, payment_method, payment_status, passenger_user_id, pilot_user_id, passenger_name, pilot_name')
      .eq('id', ride_id)
      .single();
    if (rideError || !ride) {
      return new Response(JSON.stringify({ error: 'ride_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Permissao: passageiro, piloto da corrida ou admin
    const isParticipant = ride.passenger_user_id === user.id || ride.pilot_user_id === user.id;
    let isAdmin = false;
    if (!isParticipant) {
      const { data: adminRow } = await adminClient
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      isAdmin = !!adminRow;
    }
    if (!isParticipant && !isAdmin) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Checa idempotencia
    const { data: existing } = await adminClient
      .from('ride_emails_sent')
      .select('passenger_sent_at, pilot_sent_at')
      .eq('ride_id', ride_id)
      .maybeSingle();

    const needPassenger = force || !existing?.passenger_sent_at;
    const needPilot = force || !existing?.pilot_sent_at;

    if (!needPassenger && !needPilot) {
      return new Response(JSON.stringify({ skipped: true, reason: 'already_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Carrega profiles + earning
    const [passengerRes, pilotRes, earningRes] = await Promise.all([
      ride.passenger_user_id
        ? adminClient.from('passenger_profiles').select('full_name, email').eq('user_id', ride.passenger_user_id).maybeSingle()
        : Promise.resolve({ data: null }),
      ride.pilot_user_id
        ? adminClient.from('pilot_profiles').select('full_name, email, pix_key, pix_key_type, pilot_type').eq('user_id', ride.pilot_user_id).maybeSingle()
        : Promise.resolve({ data: null }),
      adminClient.from('pilot_earnings').select('gross_amount, commission_percent').eq('ride_id', ride_id).maybeSingle(),
    ]);

    const passenger = passengerRes.data as { full_name?: string; email?: string } | null;
    const pilot = pilotRes.data as { full_name?: string; email?: string; pix_key?: string | null; pix_key_type?: string | null; pilot_type?: string } | null;
    const earning = earningRes.data as { gross_amount?: number; commission_percent?: number } | null;

    const passengerName = passenger?.full_name ?? (ride.passenger_name as string | undefined) ?? 'Cliente';
    const pilotName = pilot?.full_name ?? (ride.pilot_name as string | undefined) ?? 'Piloto';
    const rideShortId = String(ride.id).slice(0, 8).toUpperCase();
    const dateLabel = fmtDateTime(ride.completed_at as string | null);
    const origin = (ride.origin_name as string | undefined) ?? '—';
    const destination = (ride.destination_name as string | undefined) ?? '—';
    const durationMin = ride.estimated_time != null ? Number(ride.estimated_time) : null;
    const price = Number(ride.price);
    const paymentMethod = paymentMethodLabel(ride.payment_method as string | null | undefined);

    const results: { passenger?: { id?: string; error?: string }; pilot?: { id?: string; error?: string } } = {};

    // Envia para passageiro
    if (needPassenger && passenger?.email) {
      const html = buildPassengerHtml({
        passengerName, pilotName,
        origin, destination, date: dateLabel,
        durationMin,
        price, paymentMethod,
      });
      results.passenger = await sendViaResend(RESEND_API_KEY, MAIL_FROM, passenger.email, 'Sua viagem com a Gamma', html);
    }

    // Envia para piloto
    if (needPilot && pilot?.email && earning) {
      const grossAmount = Number(earning.gross_amount);
      const commission = Number(earning.commission_percent);
      const sharePercent = (100 - commission) / 100; // 45% para pilot, 60% para partner_boat
      const net = Number((grossAmount * sharePercent).toFixed(2));
      const isPartnerBoat = pilot.pilot_type === 'partner_boat';
      const html = buildPilotHtml({
        pilotName, passengerName, rideShortId,
        origin, destination, date: dateLabel,
        durationMin,
        gross: grossAmount, sharePercent, net,
        isPartnerBoat,
        pixKey: pilot.pix_key ?? null,
        pixKeyType: pilot.pix_key_type ?? null,
      });
      results.pilot = await sendViaResend(RESEND_API_KEY, MAIL_FROM, pilot.email, `Recibo da corrida #${rideShortId}`, html);
    }

    // Persiste resultado (UPSERT)
    const upsertRow: Record<string, unknown> = {
      ride_id,
      updated_at: new Date().toISOString(),
    };
    if (results.passenger?.id) {
      upsertRow.passenger_email = passenger?.email;
      upsertRow.passenger_sent_at = new Date().toISOString();
      upsertRow.passenger_resend_id = results.passenger.id;
    }
    if (results.pilot?.id) {
      upsertRow.pilot_email = pilot?.email;
      upsertRow.pilot_sent_at = new Date().toISOString();
      upsertRow.pilot_resend_id = results.pilot.id;
    }
    const errs = [results.passenger?.error, results.pilot?.error].filter(Boolean).join(' | ');
    if (errs) upsertRow.last_error = errs;

    await adminClient.from('ride_emails_sent').upsert(upsertRow, { onConflict: 'ride_id' });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-ride-emails]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
