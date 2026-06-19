import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://www.gamma.app.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    if (!MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: 'service_not_configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { rideId } = await req.json();
    if (!rideId) {
      return new Response(JSON.stringify({ error: 'rideId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch ride and payment
    const { data: ride } = await adminClient
      .from('rides')
      .select('*, payments(*)')
      .eq('id', rideId)
      .eq('passenger_user_id', user.id)
      .single();

    if (!ride) {
      return new Response(JSON.stringify({ error: 'ride_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payment = ride.payments?.[0];
    if (!payment?.mp_payment_id) {
      // Wallet payment — credit back to wallet
      if (ride.payment_method === 'wallet' && ride.payment_status === 'paid') {
        const { error: creditErr } = await adminClient.rpc('credit_wallet', {
          p_user_id: user.id,
          p_amount: Number(ride.price),
          p_description: `Reembolso corrida: ${rideId}`,
          p_transaction_id: crypto.randomUUID(),
        });
        if (creditErr) throw creditErr;
        await adminClient
          .from('rides')
          .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
          .eq('id', rideId);
        return new Response(JSON.stringify({ success: true, method: 'wallet_credit' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'no_payment_found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // MP card/pix refund with retry on transient "Invalid status to refund"
    async function attemptRefund(idempotencySuffix = '') {
      return await fetch(
        `https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}/refunds`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `refund-${rideId}${idempotencySuffix}`,
          },
          body: JSON.stringify({ amount: Number(ride.price) }),
        }
      );
    }

    let refundRes = await attemptRefund();
    let refundData = await refundRes.json();

    // Handle "Invalid status to refund" — common for cards in transient states.
    // Check MP payment status; if approved but refund still rejected, retry once
    // after a short delay (eventual consistency in MP backend).
    const invalidStatus = !refundRes.ok &&
      String(refundData?.message ?? '').toLowerCase().includes('invalid status to refund');

    if (invalidStatus) {
      console.warn('Got "Invalid status to refund" — checking MP payment status');
      const statusRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}`,
        { headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` } },
      );
      const statusData = await statusRes.json();
      console.log('MP payment current status:', statusData.status, statusData.status_detail);

      if (statusData.status === 'authorized') {
        // Card payment authorized but not captured — use cancel instead of refund
        console.log('Payment is authorized (not captured), attempting cancel');
        const cancelRes = await fetch(
          `https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `cancel-${rideId}`,
            },
            body: JSON.stringify({ status: 'cancelled' }),
          },
        );
        const cancelData = await cancelRes.json();
        console.log('Cancel result:', cancelRes.status, cancelData);
        if (cancelRes.ok) {
          refundRes = cancelRes;
          refundData = cancelData;
        } else {
          return new Response(
            JSON.stringify({ error: 'mp_cancel_failed', details: cancelData }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } else if (statusData.status === 'approved') {
        // Wait briefly and retry once with fresh idempotency key
        await new Promise(r => setTimeout(r, 1500));
        refundRes = await attemptRefund('-retry');
        refundData = await refundRes.json();
        console.log('Retry refund result:', refundRes.status, refundData);
      } else {
        // Payment not in a refundable state — caller should retry later
        console.warn('Payment not refundable yet, refund deferred. MP status:', statusData.status);
        return new Response(
          JSON.stringify({ error: 'payment_not_refundable_yet', mpStatus: statusData.status }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    if (!refundRes.ok) {
      console.error('MP refund failed:', refundData);
      return new Response(JSON.stringify({ error: 'mp_refund_failed', details: refundData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payment and ride status
    await Promise.all([
      adminClient
        .from('payments')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', payment.id),
      adminClient
        .from('rides')
        .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', rideId),
    ]);

    return new Response(JSON.stringify({ success: true, refundId: refundData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[mp-refund] Error:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
