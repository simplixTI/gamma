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

  // Constant-time comparison to prevent timing attacks on signature verification
  if (computed.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return diff === 0;
}

function ok(body: Record<string, unknown> = { received: true }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

    if (!MP_WEBHOOK_SECRET) {
      console.error('[wallet-webhook] MP_WEBHOOK_SECRET not configured — rejecting all webhook calls');
      return ok({ error: 'webhook_not_configured' });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const rawBody = await req.text();
    console.log('MP wallet-webhook received');

    const valid = await verifyMpSignature(req, rawBody, MP_WEBHOOK_SECRET);
    if (!valid) {
      console.error('Invalid MP webhook signature');
      return ok({ error: 'invalid_signature' });
    }

    const body = JSON.parse(rawBody);

    if (body.type !== 'payment') {
      console.log('Ignoring non-payment event:', body.type);
      return ok();
    }

    const mpPaymentId = body.data?.id;
    if (!mpPaymentId) {
      console.error('Missing data.id in webhook payload');
      return ok({ error: 'missing_payment_id' });
    }

    // Fetch full payment details from MP
    const mpRes = await fetch(`${MP_API}/v1/payments/${mpPaymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      console.error('Failed to fetch MP payment:', mpRes.status);
      return ok({ error: 'mp_fetch_failed' });
    }

    const mpPayment = await mpRes.json();
    console.log('MP wallet payment status:', mpPayment.status);

    if (mpPayment.status !== 'approved') {
      return ok({ status: mpPayment.status });
    }

    // Parse external_reference: "wallet-{userId}-{transactionId}"
    const externalRef: string = mpPayment.external_reference || '';
    const refParts = externalRef.split('-');
    if (refParts.length < 3 || refParts[0] !== 'wallet') {
      console.error('Unexpected external_reference format:', externalRef);
      return ok({ error: 'unexpected_ref_format' });
    }

    // Find the pending wallet transaction by mp_payment_id or pix_transaction_id
    let { data: tx } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount')
      .eq('mp_payment_id', String(mpPaymentId))
      .eq('status', 'pending')
      .maybeSingle();

    if (!tx) {
      // Fallback: look up by pix_transaction_id
      const { data: txByPix } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, amount')
        .eq('pix_transaction_id', String(mpPaymentId))
        .eq('status', 'pending')
        .maybeSingle();
      tx = txByPix;
    }

    if (!tx) {
      console.error('Wallet transaction not found for MP payment');
      return ok({ error: 'transaction_not_found' });
    }

    // Idempotency guard: atomically claim the transaction before crediting.
    // If another webhook already claimed it, this update will match 0 rows.
    const { count } = await supabase
      .from('wallet_transactions')
      .update({ status: 'processing' })
      .eq('id', tx.id)
      .eq('status', 'pending')
      .select('id', { count: 'exact', head: true });

    if (!count || count === 0) {
      console.log('Wallet transaction already processed (duplicate webhook), skipping');
      return ok({ success: true, duplicate: true });
    }

    // Credit the wallet using the DB function
    const { error: creditError } = await supabase.rpc('credit_wallet', {
      p_user_id: tx.user_id,
      p_amount: tx.amount,
      p_description: 'Recarga via PIX',
      p_transaction_id: tx.id,
    });

    if (creditError) {
      // Rollback so webhook can retry
      await supabase
        .from('wallet_transactions')
        .update({ status: 'pending' })
        .eq('id', tx.id);
      console.error('Error crediting wallet:', creditError);
      return ok({ error: 'credit_failed' });
    }

    console.log('Wallet credited successfully');
    return ok({ success: true });

  } catch (error: unknown) {
    console.error('mp wallet-webhook error:', error);
    return ok({ error: 'internal_error' });
  }
});
