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

    // MP card/pix refund
    const refundRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}/refunds`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `refund-${rideId}`,
        },
        body: JSON.stringify({ amount: Number(ride.price) }),
      }
    );

    const refundData = await refundRes.json();

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
