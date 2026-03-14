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
    console.log('MP payment-webhook received:', rawBody.substring(0, 200));

    // Verify signature if secret is configured (skip in dev if unset)
    if (MP_WEBHOOK_SECRET) {
      const valid = await verifyMpSignature(req, rawBody, MP_WEBHOOK_SECRET);
      if (!valid) {
        console.error('Invalid MP webhook signature');
        return ok({ error: 'invalid_signature' });
      }
    }

    const body = JSON.parse(rawBody);

    // Only process payment events
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
      console.error('Failed to fetch MP payment:', mpPaymentId, mpRes.status);
      return ok({ error: 'mp_fetch_failed' });
    }

    const mpPayment = await mpRes.json();
    console.log('MP payment status:', {
      id: mpPaymentId,
      status: mpPayment.status,
      ref: mpPayment.external_reference,
    });

    if (mpPayment.status !== 'approved') {
      const failedStatuses = ['rejected', 'cancelled', 'refunded', 'charged_back'];
      if (failedStatuses.includes(mpPayment.status)) {
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('mp_payment_id', String(mpPaymentId));
      }
      return ok({ status: mpPayment.status });
    }

    // Payment approved — parse external_reference: "ride-{rideId}"
    const externalRef: string = mpPayment.external_reference || '';
    if (!externalRef.startsWith('ride-')) {
      console.error('Unexpected external_reference format:', externalRef);
      return ok({ error: 'unexpected_ref_format' });
    }

    const rideId = externalRef.replace('ride-', '');

    const { error: paymentErr } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
      })
      .eq('mp_payment_id', String(mpPaymentId));

    if (paymentErr) {
      console.error('Error updating payment:', paymentErr);
    }

    const { error: rideErr } = await supabase
      .from('rides')
      .update({ payment_status: 'paid' })
      .eq('id', rideId);

    if (rideErr) {
      console.error('Error updating ride payment_status:', rideErr);
    } else {
      console.log(`Ride ${rideId} marked as paid`);
    }

    return ok({ success: true, rideId });

  } catch (error: unknown) {
    console.error('mp payment-webhook error:', error);
    return ok({ error: 'internal_error' });
  }
});
