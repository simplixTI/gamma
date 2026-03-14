import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_API = 'https://api.mercadopago.com';

function getPixExpiry(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  // Format as ISO with -03:00 offset (Brazil)
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  // subtract 3h for BRT
  let hour = d.getUTCHours() - 3;
  if (hour < 0) hour += 24;
  const minute = pad(d.getUTCMinutes());
  const second = pad(d.getUTCSeconds());
  return `${year}-${month}-${day}T${pad(hour)}:${minute}:${second}.000-03:00`;
}

function mapMpStatus(mpStatus: string): string {
  switch (mpStatus) {
    case 'approved': return 'completed';
    case 'pending':
    case 'in_process': return 'pending';
    case 'rejected':
    case 'cancelled':
    case 'refunded':
    case 'charged_back': return 'failed';
    default: return 'pending';
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
      rideId,
      amount,
      paymentMethod,
      cardToken,
      paymentMethodId,
      installments = 1,
      passengerEmail,
      passengerName,
      passengerCpf,
      passengerDeviceId,
      pilotId,
    } = await req.json();

    if (!rideId || !amount || !paymentMethod) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: rideId, amount, paymentMethod',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // MP requires a valid email — use fallback if not provided
    const effectiveEmail = passengerEmail && passengerEmail.includes('@')
      ? passengerEmail
      : `passenger-${rideId.slice(0, 8)}@gamma.app`;

    if (paymentMethod === 'credit_card' && (!cardToken || !paymentMethodId)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing cardToken or paymentMethodId for credit card payment',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const totalAmount = Number(amount);
    const notificationUrl = `${SUPABASE_URL}/functions/v1/mp-webhook`;
    // Single webhook URL for all MP events — routes internally by external_reference prefix

    const payer: Record<string, unknown> = {
      email: effectiveEmail,
    };
    if (passengerName) {
      const parts = passengerName.trim().split(' ');
      payer.first_name = parts[0];
      payer.last_name = parts.slice(1).join(' ') || parts[0];
    }
    if (passengerCpf) {
      payer.identification = {
        type: 'CPF',
        number: passengerCpf.replace(/\D/g, ''),
      };
    }

    let mpPayload: Record<string, unknown>;

    if (paymentMethod === 'pix') {
      mpPayload = {
        transaction_amount: totalAmount,
        payment_method_id: 'pix',
        payer,
        description: `Corrida Gamma`,
        external_reference: `ride-${rideId}`,
        notification_url: notificationUrl,
        date_of_expiration: getPixExpiry(),
      };
    } else {
      mpPayload = {
        transaction_amount: totalAmount,
        token: cardToken,
        description: `Corrida Gamma`,
        installments: Number(installments),
        payment_method_id: paymentMethodId,
        payer,
        external_reference: `ride-${rideId}`,
        notification_url: notificationUrl,
      };
    }

    console.log('Creating MP payment:', {
      rideId,
      amount: totalAmount,
      paymentMethod,
      hasToken: !!cardToken,
    });

    const mpResponse = await fetch(`${MP_API}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `ride-${rideId}-${Date.now()}`,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('MP API error:', mpResponse.status, mpData);
      throw new Error(mpData.message || `MP API error: ${mpResponse.status}`);
    }

    console.log('MP payment created:', { id: mpData.id, status: mpData.status });

    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || null;
    const copyPaste = mpData.point_of_interaction?.transaction_data?.qr_code || null;
    const expiresAt = mpData.date_of_expiration || null;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        ride_id: rideId,
        pilot_id: pilotId || null,
        passenger_device_id: passengerDeviceId || null,
        amount: totalAmount,
        status: mapMpStatus(mpData.status),
        payment_method: paymentMethod,
        mp_payment_id: String(mpData.id),
        pix_qr_code: qrCode,
        pix_copy_paste: copyPaste,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error saving payment:', paymentError);
      throw new Error(paymentError.message || JSON.stringify(paymentError));
    }

    const response: Record<string, unknown> = {
      success: true,
      paymentId: payment.id,
      mpPaymentId: mpData.id,
      status: mpData.status,
    };

    if (paymentMethod === 'pix') {
      response.qrCode = qrCode;
      response.copyPaste = copyPaste;
      response.expiresAt = expiresAt;
    } else {
      response.statusDetail = mpData.status_detail;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in mp-create-payment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
