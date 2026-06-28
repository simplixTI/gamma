import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://www.gamma.app.br';
const PUBLIC_SITE_URL = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://www.gamma.app.br';
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'Gamma <noreply@gamma.app.br>';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Role = 'passenger' | 'pilot';
type PilotType = 'pilot' | 'partner_boat';

interface CreateUserBody {
  role: Role;
  full_name: string;
  email: string;
  phone?: string;
  cpf?: string;
  boat_type?: string;
  boat_identification?: string;
  pilot_type?: PilotType;
}

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

const buildCredentialsHtml = (params: {
  fullName: string;
  role: Role;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): string => {
  const roleLabel = params.role === 'pilot' ? 'piloto' : 'passageiro';
  const ctaLabel = params.role === 'pilot' ? 'Acessar app de piloto' : 'Acessar app Gamma';
  const intro = params.role === 'pilot'
    ? 'Sua conta de piloto da Gamma foi criada pela equipe administrativa.'
    : 'Sua conta da Gamma foi criada pela equipe administrativa.';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bem-vindo à Gamma</title>
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
        <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;">Olá, ${params.fullName}!</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#3a3a3c;line-height:1.5;">${intro}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#3a3a3c;line-height:1.5;">
          Use as credenciais abaixo para entrar como ${roleLabel}. Recomendamos trocar a senha nas configurações apos o primeiro login.
        </p>

        <div style="background:#f5f5f7;border-radius:10px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#86868b;">Email</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;word-break:break-all;">${params.email}</p>
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#86868b;">Senha temporaria</p>
          <p style="margin:0;font-size:18px;font-weight:700;font-family:'Courier New',monospace;color:#00A8E8;">${params.tempPassword}</p>
        </div>

        <div style="text-align:center;margin:32px 0;">
          <a href="${params.loginUrl}"
             style="display:inline-block;background:#00A8E8;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 32px;border-radius:10px;">
            ${ctaLabel}
          </a>
        </div>

        <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;" />

        <p style="margin:0;font-size:11px;color:#86868b;text-align:center;line-height:1.6;">
          Se voce nao esperava este email, pode ignorar.<br/>
          Gamma — Transporte aquatico na Ilha da Gigoia<br/>
          <a href="https://gamma.app.br" style="color:#86868b;text-decoration:underline;">gamma.app.br</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// Generates a 12-char password: 4 lower + 4 upper + 3 digits + 1 symbol
const generateTempPassword = (): string => {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbol = '!@#$';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars: string[] = [];
  for (let i = 0; i < 4; i++) chars.push(pick(lower));
  for (let i = 0; i < 4; i++) chars.push(pick(upper));
  for (let i = 0; i < 3; i++) chars.push(pick(digits));
  chars.push(pick(symbol));
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
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

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('user_id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!adminRow) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as CreateUserBody;

    if (!body.email || !body.full_name || !body.role) {
      return new Response(JSON.stringify({ success: false, error: 'email, full_name e role sao obrigatorios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.role !== 'passenger' && body.role !== 'pilot') {
      return new Response(JSON.stringify({ success: false, error: 'role invalido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userMetadata: Record<string, string> = {
      role: body.role,
      full_name: body.full_name,
      phone: body.phone ?? '',
      cpf: body.cpf ?? '',
    };
    if (body.role === 'pilot') {
      userMetadata.boat_type = body.boat_type ?? '';
      userMetadata.boat_identification = body.boat_identification ?? '';
    }

    const tempPassword = generateTempPassword();

    // 1. Cria o auth.user com senha temporaria, email ja confirmado (sem invite OTP)
    const { data: createdData, error: createdError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createdError || !createdData?.user) {
      return new Response(JSON.stringify({ success: false, error: createdError?.message ?? 'create_failed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = createdData.user.id;

    // 2a. Garante user_roles + profile (nao depende do trigger handle_new_gamma_user)
    await adminClient.from('user_roles').upsert(
      { user_id: newUserId, role: body.role },
      { onConflict: 'user_id' },
    );

    if (body.role === 'passenger') {
      await adminClient.from('passenger_profiles').upsert({
        user_id: newUserId,
        full_name: body.full_name,
        phone: body.phone ?? '',
        email: body.email,
        cpf: body.cpf ?? '',
      }, { onConflict: 'user_id' });
    } else {
      await adminClient.from('pilot_profiles').upsert({
        user_id: newUserId,
        full_name: body.full_name,
        phone: body.phone ?? '',
        email: body.email,
        cpf: body.cpf ?? '',
        boat_type: body.boat_type ?? '',
        boat_identification: body.boat_identification ?? '',
        pilot_type: body.pilot_type ?? 'pilot',
        approval_status: 'pending',
        is_active: false,
      }, { onConflict: 'user_id' });
    }

    // 3. Envia email branded via Resend (sem token OTP, evita prefetch de Gmail)
    const loginUrl = body.role === 'pilot'
      ? `${PUBLIC_SITE_URL}/auth/pilot`
      : `${PUBLIC_SITE_URL}/auth/passenger`;

    const html = buildCredentialsHtml({
      fullName: body.full_name,
      role: body.role,
      email: body.email,
      tempPassword,
      loginUrl,
    });

    const subject = body.role === 'pilot'
      ? 'Ative sua conta de piloto Gamma'
      : 'Sua conta Gamma está pronta';

    const sendResult = await sendViaResend(RESEND_API_KEY, MAIL_FROM, body.email, subject, html);

    if (sendResult.error) {
      return new Response(JSON.stringify({
        success: false,
        user_id: newUserId,
        error: `Usuario criado mas falha no envio do email: ${sendResult.error}`,
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId, email_id: sendResult.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
