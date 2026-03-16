import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_API = 'https://api.mercadopago.com';

/**
 * Verify Mercado Pago webhook signature.
 *
 * MP signs using: HMAC-SHA256( key=secret, message="id:{data.id};request-id:{x-request-id};ts:{ts};" )
 * Reference: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 *
 * FIX [HIGH]: The original implementation used the Stripe-style `{ts}.{rawBody}` format,
 * which is incorrect for Mercado Pago. This caused all valid MP webhooks to fail signature
 * verification (if the secret was set), silently dropping all payment confirmations.
 */
async function verifyMpSignature(
  req: Request,
  rawBody: string,
  secret: string,
): Promise<boolean> {
  const xSignature = req.headers.get('x-signature');
  if (!xSignature) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const idx = p.indexOf('=');
      return idx === -1 ? [p.trim(), ''] : [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
    }),
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // Parse data.id from the body for the MP signature scheme
  let dataId = '';
  try {
    const parsed = JSON.parse(rawBody);
    dataId = String(parsed?.data?.id || '');
  } catch {
    // ignore parse errors — will fail verification
  }

  // x-request-id header from MP
  const requestId = req.headers.get('x-request-id') || '';

  // MP canonical message format
  const message = `id:${dataId};request-id:${requestId};ts:${ts};`;

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handleRidePayment(
  supabase: ReturnType<typeof createClient>,
  mpPayment: Record<string, unknown>,
  mpPaymentId: string,
): Promise<Response> {
  const externalRef = String(mpPayment.external_reference || '');
  const rideId = externalRef.startsWith('ride-') ? externalRef.slice(5) : '';

  if (!UUID_RE.test(rideId)) {
    console.error('Invalid rideId in external_reference:', externalRef);
    return ok({ error: 'invalid_ride_id_format' });
  }

  const failedStatuses = ['rejected', 'cancelled', 'refunded', 'charged_back'];

  if (mpPayment.status !== 'approved') {
    if (failedStatuses.includes(String(mpPayment.status))) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('mp_payment_id', mpPaymentId);
      // Flag completed payments for refund (MP issued refund or chargeback)
      if (mpPayment.status === 'refunded' || mpPayment.status === 'charged_back') {
        await supabase.rpc('request_payment_refund', {
          p_ride_id: rideId,
          p_reason: String(mpPayment.status),
        });
      }
    }
    return ok({ status: mpPayment.status });
  }

  // Atomic claim: transition pending/in_process → processing.
  // Two simultaneous webhooks both attempt this; only one gets count > 0.
  const { count: claimed } = await supabase
    .from('payments')
    .update({ status: 'processing' })
    .eq('mp_payment_id', mpPaymentId)
    .in('status', ['pending', 'in_process'])
    .select('id', { count: 'exact', head: true });

  if (!claimed || claimed === 0) {
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('status')
      .eq('mp_payment_id', mpPaymentId)
      .maybeSingle();

    if (existingPayment?.status === 'completed') {
      return ok({ success: true, type: 'ride', duplicate: true });
    }
    return ok({ error: 'payment_not_claimable', paymentStatus: existingPayment?.status ?? 'not_found' });
  }

  // Verify ride exists and amount matches
  // FIX [MEDIUM]: Previously both !rideRow and amount mismatch returned 'amount_mismatch'.
  // Now each case returns the correct error. Both also roll back payment to 'failed'.
  const { data: rideRow } = await supabase
    .from('rides')
    .select('price')
    .eq('id', rideId)
    .single();

  if (!rideRow) {
    console.error('Ride not found for webhook payment:', rideId);
    await supabase.from('payments').update({ status: 'failed' }).eq('mp_payment_id', mpPaymentId);
    return ok({ error: 'ride_not_found' });
  }

  const paidAmount = Number(mpPayment.transaction_amount);
  const expectedAmount = Number(rideRow.price);

  if (Math.abs(paidAmount - expectedAmount) > 0.01) {
    console.error('Amount mismatch for ride payment. Paid:', paidAmount, 'Expected:', expectedAmount);
    await supabase.from('payments').update({ status: 'failed' }).eq('mp_payment_id', mpPaymentId);
    return ok({ error: 'amount_mismatch' });
  }

  await supabase
    .from('payments')
    .update({ status: 'completed', paid_at: new Date().toISOString() })
    .eq('mp_payment_id', mpPaymentId);

  await supabase
    .from('rides')
    .update({ payment_status: 'paid' })
    .eq('id', rideId);

  return ok({ success: true, type: 'ride', rideId });
}

async function handleWalletTopup(
  supabase: ReturnType<typeof createClient>,
  mpPayment: Record<string, unknown>,
  mpPaymentId: string,
): Promise<Response> {
  if (mpPayment.status !== 'approved') {
    const failedTopupStatuses = ['rejected', 'cancelled', 'refunded', 'charged_back'];
    if (failedTopupStatuses.includes(String(mpPayment.status))) {
      // Mark the pending wallet transaction as failed so it doesn't stay orphaned
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('mp_payment_id', mpPaymentId)
        .eq('status', 'pending');
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('pix_transaction_id', mpPaymentId)
        .eq('status', 'pending');
    }
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
    console.error('Wallet transaction not found for MP payment');
    return ok({ error: 'transaction_not_found' });
  }

  // Idempotency guard: atomically claim the transaction before crediting
  // If another webhook already claimed it, this update will match 0 rows
  const { count } = await supabase
    .from('wallet_transactions')
    .update({ status: 'processing' })
    .eq('id', tx.id)
    .eq('status', 'pending')
    .select('id', { count: 'exact', head: true });

  if (!count || count === 0) {
    console.log('Wallet transaction already processed (duplicate webhook), skipping');
    return ok({ success: true, type: 'wallet', duplicate: true });
  }

  const { error: creditError } = await supabase.rpc('credit_wallet', {
    p_user_id: tx.user_id,
    p_amount: tx.amount,
    p_description: 'Recarga via PIX',
    p_transaction_id: tx.id,
  });

  if (creditError) {
    // Rollback status to pending so webhook can retry
    await supabase
      .from('wallet_transactions')
      .update({ status: 'pending' })
      .eq('id', tx.id);
    console.error('Error crediting wallet:', creditError);
    return ok({ error: 'credit_failed' });
  }

  console.log('Wallet credited successfully');
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

    if (!MP_ACCESS_TOKEN) {
      console.error('MP_ACCESS_TOKEN not configured');
      return ok({ error: 'service_not_configured' });
    }

    if (!MP_WEBHOOK_SECRET) {
      console.error('MP_WEBHOOK_SECRET not configured — rejecting all webhook calls');
      return ok({ error: 'webhook_not_configured' });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const rawBody = await req.text();
    console.log('mp-webhook received');

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
      console.error('Failed to fetch MP payment:', mpRes.status);
      return ok({ error: 'mp_fetch_failed' });
    }

    const mpPayment = await mpRes.json();
    const externalRef = String(mpPayment.external_reference || '');

    console.log('MP payment status:', mpPayment.status);

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
    // Return 500 so Mercado Pago retries on transient failures (DB down, network errors).
    // Only return 200 for known business-logic errors handled inside the handlers above.
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
