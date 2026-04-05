import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://www.gamma.app.br';
// NOTE: Set ALLOWED_ORIGIN env var in Supabase secrets for production
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_API = 'https://api.mercadopago.com';

function getPixExpiry24h(): string {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  // Subtract 3h for BRT, then print as if UTC with -03:00 suffix
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${brt.getUTCFullYear()}-${pad(brt.getUTCMonth() + 1)}-${pad(brt.getUTCDate())}T${pad(brt.getUTCHours())}:${pad(brt.getUTCMinutes())}:${pad(brt.getUTCSeconds())}.000-03:00`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MP_ACCESS_TOKEN) {
      throw new Error('Payment service not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Authenticate caller — userId must come from JWT, not request body (CWE-639)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amount } = await req.json();
    // userId is always taken from the authenticated session — never from the request body
    const userId = user.id;

    if (!amount || Number(amount) < 5 || Number(amount) > 5000) {
      return new Response(JSON.stringify({
        success: false,
        error: 'amount must be between R$5 and R$5000',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const totalAmount = Number(amount);

    // Fetch passenger profile for payer data
    const { data: profile } = await supabase
      .from('passenger_profiles')
      .select('full_name, email, cpf')
      .eq('user_id', userId)
      .single();

    const payer: Record<string, unknown> = {
      email: profile?.email || `user-${userId}@gamma.app`,
    };
    if (profile?.full_name) {
      const parts = (profile.full_name as string).trim().split(' ');
      payer.first_name = parts[0];
      payer.last_name = parts.slice(1).join(' ') || parts[0];
    }
    if (profile?.cpf) {
      payer.identification = {
        type: 'CPF',
        number: (profile.cpf as string).replace(/\D/g, ''),
      };
    }

    // Create a pending wallet transaction first to use its ID in external_reference
    const { data: tx, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'topup',
        amount: totalAmount,
        balance_after: 0,
        description: 'Recarga via PIX',
        status: 'pending',
      })
      .select()
      .single();

    if (txError || !tx) {
      console.error('Error creating wallet transaction:', txError);
      throw new Error('Failed to create wallet transaction');
    }

    const externalRef = `wallet-${userId}-${tx.id}`;

    const mpPayload = {
      transaction_amount: totalAmount,
      payment_method_id: 'pix',
      payer,
      description: 'Recarga Gamma Cash',
      external_reference: externalRef,
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      date_of_expiration: getPixExpiry24h(),
    };

    console.log('Creating MP PIX for wallet top-up');

    const mpRes = await fetch(`${MP_API}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `wallet-${tx.id}`,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('MP API error for wallet top-up:', mpRes.status);
      // FIX [MEDIUM]: Mark as 'failed' instead of deleting — preserves the audit trail.
      // Previously used DELETE which silently dropped the record if the DELETE also failed.
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', tx.id);
      throw new Error(mpData.message || `MP API error: ${mpRes.status}`);
    }

    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || null;
    const copyPaste = mpData.point_of_interaction?.transaction_data?.qr_code || null;

    await supabase
      .from('wallet_transactions')
      .update({
        pix_qr_code: qrCode,
        pix_copy_paste: copyPaste,
        pix_transaction_id: String(mpData.id),
        mp_payment_id: String(mpData.id),
      })
      .eq('id', tx.id);

    console.log('Wallet top-up PIX created successfully');

    return new Response(JSON.stringify({
      success: true,
      qrCode,
      copyPaste,
      transactionId: tx.id,
      mpPaymentId: mpData.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('wallet-topup error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
