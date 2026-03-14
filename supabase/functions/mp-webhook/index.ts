import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_API = 'https://api.mercadopago.com';

async function verifyMpSignature(
  req: Request,
  rawBody: string,
  secret: string,
): Promise<boolean> {
  const xSignature = req.headers.get('x-signature');
  if (!xSignature) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => p.trim().split('=')),
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const message = `${ts}.${rawBody}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const computed = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === v1;
}

function ok(body: Record<string, unknown> = { received: true }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleRidePayment(
  supabase: ReturnType<typeof createClient>,
  mpPayment: Record<string, unknown>,
  mpPaymentId: string,
): Promise<Response> {
  const externalRef = String(mpPayment.external_reference || '');
  const rideId = externalRef.replace('ride-', '');

  const failedStatuses = ['rejected', 'cancelled', 'refunded', 'charged_back'];

  if (mpPayment.status !== 'approved') {
    if (failedStatuses.includes(String(mpPayment.status))) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('mp_payment_id', mpPaymentId);
    }
    return ok({ status: mpPayment.status });
  }

  await supabase
    .from('payments')
    .update({ status: 'completed', paid_at: new Date().toISOString() })
    .eq('mp_payment_id', mpPaymentId);

  await supabase
    .from('rides')
    .update({ payment_status: 'paid' })
    .eq('id', rideId);

  console.log(`Ride ${rideId} marked as paid`);
  return ok({ success: true, type: 'ride', rideId });
}

async function handleWalletTopup(
  supabase: ReturnType<typeof createClient>,
  mpPayment: Record<string, unknown>,
  mpPaymentId: string,
): Promise<Response> {
  if (mpPayment.status !== 'approved') {
    return ok({ status: mpPayment.status });
  }

  // Find pending wallet transaction by mp_payment_id
  let { data: tx } = await supabase
    .from('wallet_transactions')
    .select('id, user_id, amount')
    .eq('mp_payment_id', mpPaymentId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!tx) {
    const { data: txByPix } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount')
      .eq('pix_transaction_id', mpPaymentId)
      .eq('status', 'pending')
      .maybeSingle();
    tx = txByPix;
  }

  if (!tx) {
    console.error('Wallet transaction not found for MP payment:', mpPaymentId);
    return ok({ error: 'transaction_not_found' });
  }

  const { error: creditError } = await supabase.rpc('credit_wallet', {
    p_user_id: tx.user_id,
    p_amount: tx.amount,
    p_description: 'Recarga via PIX',
    p_transaction_id: tx.id,
  });

  if (creditError) {
    console.error('Error crediting wallet:', creditError);
    return ok({ error: 'credit_failed' });
  }

  console.log(`Wallet credited: user ${tx.user_id}, amount ${tx.amount}`);
  return ok({ success: true, type: 'wallet' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Always return 200 — MP retries on non-200
  try {
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const rawBody = await req.text();
    console.log('mp-webhook received:', rawBody.substring(0, 200));

    // Verify HMAC signature (skip in dev if secret not configured)
    if (MP_WEBHOOK_SECRET) {
      const valid = await verifyMpSignature(req, rawBody, MP_WEBHOOK_SECRET);
      if (!valid) {
        console.error('Invalid MP webhook signature');
        return ok({ error: 'invalid_signature' });
      }
    }

    const body = JSON.parse(rawBody);

    if (body.type !== 'payment') {
      console.log('Ignoring non-payment event:', body.type);
      return ok();
    }

    const mpPaymentId = String(body.data?.id || '');
    if (!mpPaymentId) {
      console.error('Missing data.id in webhook payload');
      return ok({ error: 'missing_payment_id' });
    }

    // Fetch full payment details from MP (single API call for both routes)
    const mpRes = await fetch(`${MP_API}/v1/payments/${mpPaymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      console.error('Failed to fetch MP payment:', mpPaymentId, mpRes.status);
      return ok({ error: 'mp_fetch_failed' });
    }

    const mpPayment = await mpRes.json();
    const externalRef = String(mpPayment.external_reference || '');

    console.log('MP payment:', {
      id: mpPaymentId,
      status: mpPayment.status,
      ref: externalRef,
    });

    // Route by external_reference prefix
    if (externalRef.startsWith('ride-')) {
      return await handleRidePayment(supabase, mpPayment, mpPaymentId);
    } else if (externalRef.startsWith('wallet-')) {
      return await handleWalletTopup(supabase, mpPayment, mpPaymentId);
    } else {
      console.error('Unknown external_reference format:', externalRef);
      return ok({ error: 'unknown_ref_format' });
    }

  } catch (error: unknown) {
    console.error('mp-webhook error:', error);
    return ok({ error: 'internal_error' });
  }
});
