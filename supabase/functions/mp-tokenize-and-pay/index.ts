import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_API = 'https://api.mercadopago.com';

function mapMpStatus(mpStatus: string): string {
  switch (mpStatus) {
    case 'approved': return 'completed';
    case 'pending':
    case 'in_process': return 'pending';
    default: return 'failed';
  }
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

    const {
      cardNumber,
      cardholderName,
      expiryMonth,
      expiryYear,
      cvv,
      rideId,
      amount,
      passengerEmail,
      passengerCpf,
      passengerName,
      passengerDeviceId,
      pilotId,
    } = await req.json();

    if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing card fields',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!rideId || !amount || !passengerEmail) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing rideId, amount, or passengerEmail',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 1: Tokenize card server-side
    const tokenPayload = {
      card_number: cardNumber.replace(/\s/g, ''),
      expiration_year: String(expiryYear).length === 2 ? `20${expiryYear}` : String(expiryYear),
      expiration_month: String(expiryMonth).padStart(2, '0'),
      security_code: cvv,
      cardholder: {
        name: cardholderName,
        identification: passengerCpf
          ? { type: 'CPF', number: passengerCpf.replace(/\D/g, '') }
          : undefined,
      },
    };

    console.log('Tokenizing card for ride:', rideId);

    const tokenRes = await fetch(`${MP_API}/v1/card_tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenPayload),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error('Card tokenization failed:', tokenRes.status, tokenData);
      return new Response(JSON.stringify({
        success: false,
        error: 'Dados do cartão inválidos. Verifique e tente novamente.',
        statusDetail: tokenData.cause?.[0]?.description || 'tokenization_error',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const cardToken = tokenData.id;
    const paymentMethodId = tokenData.payment_method_id;

    console.log('Card tokenized, payment_method_id:', paymentMethodId);

    // Step 2: Create payment
    const payer: Record<string, unknown> = { email: passengerEmail };
    if (passengerName) {
      const parts = passengerName.trim().split(' ');
      payer.first_name = parts[0];
      payer.last_name = parts.slice(1).join(' ') || parts[0];
    }
    if (passengerCpf) {
      payer.identification = { type: 'CPF', number: passengerCpf.replace(/\D/g, '') };
    }

    const mpPayload = {
      transaction_amount: Number(amount),
      token: cardToken,
      description: 'Corrida Gamma',
      installments: 1,
      payment_method_id: paymentMethodId,
      payer,
      external_reference: `ride-${rideId}`,
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
    };

    const mpRes = await fetch(`${MP_API}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `ride-${rideId}-card-${Date.now()}`,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('MP payment error:', mpRes.status, mpData);
      throw new Error(mpData.message || `Payment failed: ${mpRes.status}`);
    }

    console.log('MP card payment:', { id: mpData.id, status: mpData.status, detail: mpData.status_detail });

    // Save to payments table
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        ride_id: rideId,
        pilot_id: pilotId || null,
        passenger_device_id: passengerDeviceId || null,
        amount: Number(amount),
        status: mapMpStatus(mpData.status),
        payment_method: 'credit_card',
        mp_payment_id: String(mpData.id),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error saving payment to DB:', paymentError);
      // Don't throw — payment already processed at MP
    }

    if (mpData.status === 'approved') {
      await supabase
        .from('rides')
        .update({ payment_status: 'paid' })
        .eq('id', rideId);
    }

    return new Response(JSON.stringify({
      success: mpData.status === 'approved',
      paymentId: payment?.id || null,
      mpPaymentId: mpData.id,
      status: mpData.status,
      statusDetail: mpData.status_detail,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in mp-tokenize-and-pay:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
