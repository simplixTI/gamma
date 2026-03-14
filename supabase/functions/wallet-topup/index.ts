import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_API = 'https://api.mercadopago.com';

function getPixExpiry24h(): string {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  const pad = (n: number) => String(n).padStart(2, '0');
  let hour = d.getUTCHours() - 3;
  if (hour < 0) hour += 24;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(hour)}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.000-03:00`;
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

    const { userId, amount } = await req.json();

    if (!userId || !amount || Number(amount) < 5) {
      return new Response(JSON.stringify({
        success: false,
        error: 'userId and amount (min R$5) are required',
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

    console.log('Creating MP PIX for wallet top-up:', { userId, amount: totalAmount, txId: tx.id });

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
      console.error('MP API error for wallet top-up:', mpRes.status, mpData);
      await supabase.from('wallet_transactions').delete().eq('id', tx.id);
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

    console.log('Wallet top-up PIX created:', { mpId: mpData.id, txId: tx.id });

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
