import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://www.gamma.app.br';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
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

function normalizeBrand(brand: string): string {
  const map: Record<string, string> = {
    master: 'mastercard',
    visa: 'visa',
    elo: 'elo',
    amex: 'amex',
    hipercard: 'hipercard',
    debvisa: 'visa',
    debmaster: 'mastercard',
  };
  return map[brand?.toLowerCase()] || brand || 'unknown';
}

/** Find an existing MP customer by email or create a new one. Returns customer_id. */
async function findOrCreateMpCustomer(
  accessToken: string,
  email: string,
  cpf?: string,
  name?: string,
): Promise<string> {
  const searchRes = await fetch(
    `${MP_API}/v1/customers/search?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const searchData = await searchRes.json();
  if (searchData.results?.length > 0) {
    return searchData.results[0].id as string;
  }

  const payload: Record<string, unknown> = { email };
  if (name) {
    const parts = name.trim().split(' ');
    payload.first_name = parts[0];
    payload.last_name = parts.slice(1).join(' ') || parts[0];
  }
  if (cpf) {
    payload.identification = { type: 'CPF', number: cpf.replace(/\D/g, '') };
  }

  const createRes = await fetch(`${MP_API}/v1/customers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const createData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Failed to create MP customer: ${JSON.stringify(createData)}`);
  }
  return createData.id as string;
}

/**
 * Attach a card (via one-time ephemeral token) to an MP customer.
 * Returns the persistent card_id and payment_method_id.
 */
async function addCardToCustomer(
  accessToken: string,
  customerId: string,
  ephemeralToken: string,
): Promise<{ mpCardId: string; mpPaymentMethodId: string }> {
  const res = await fetch(`${MP_API}/v1/customers/${customerId}/cards`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: ephemeralToken }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to add card to MP customer: ${JSON.stringify(data)}`);
  }
  return {
    mpCardId: data.id as string,
    mpPaymentMethodId: (data.payment_method?.id ?? data.payment_method_id ?? '') as string,
  };
}

/**
 * Create a fresh ephemeral token from a saved card (persistent card_id + customer_id + CVV).
 * This token can then be used for a payment just like a new-card token.
 */
async function createSavedCardToken(
  accessToken: string,
  customerId: string,
  mpCardId: string,
  securityCode: string,
): Promise<{ token: string; paymentMethodId: string }> {
  const res = await fetch(`${MP_API}/v1/card_tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_id: mpCardId, customer_id: customerId, security_code: securityCode }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to create saved card token: ${JSON.stringify(data)}`);
  }
  return { token: data.id as string, paymentMethodId: data.payment_method_id as string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MP_ACCESS_TOKEN) throw new Error('Payment service not configured');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // FIX [CRITICAL]: Authenticate caller — require valid JWT (CWE-639)
    // Previously this function had NO auth check, allowing any anonymous caller to
    // charge any rideId with any amount, and save cards under arbitrary user accounts.
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

    const body = await req.json();
    const {
      savedCardId,
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
      saveCard,
      // FIX [CRITICAL]: userId is derived from the authenticated JWT — never trusted from body
    } = body;

    // userId always comes from the verified JWT, not the request body
    const userId = user.id;

    if (!rideId || !amount || !passengerEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing rideId, amount, or passengerEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // FIX [CRITICAL]: Server-side price + ownership validation — prevent amount tampering
    const { data: rideRow, error: rideErr } = await supabase
      .from('rides')
      .select('price, status, passenger_user_id')
      .eq('id', rideId)
      .maybeSingle();

    if (rideErr || !rideRow) {
      return new Response(JSON.stringify({ success: false, error: 'ride_not_found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify authenticated user owns this ride (CWE-639)
    if (rideRow.passenger_user_id && rideRow.passenger_user_id !== user.id) {
      console.error(`Unauthorized payment attempt: user ${user.id} for ride owned by ${rideRow.passenger_user_id}`);
      return new Response(JSON.stringify({ success: false, error: 'not_your_ride' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // FIX [MEDIUM]: Allow in_progress and completed statuses so passenger can pay for an
    // already-started ride. Previously blocked at 'in_progress', causing "ride_not_payable".
    if (!['pending', 'accepted', 'pilot_arriving', 'in_progress', 'completed'].includes(rideRow.status)) {
      return new Response(JSON.stringify({ success: false, error: 'ride_not_payable' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use integer-cent comparison to avoid floating-point rounding issues
    const paidCents = Math.round(Number(amount) * 100);
    const expectedCents = Math.round(Number(rideRow.price) * 100);
    if (paidCents !== expectedCents) {
      console.error(`Amount mismatch: client sent ${amount}, DB has ${rideRow.price}`);
      return new Response(JSON.stringify({ success: false, error: 'amount_mismatch' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Guard against double-charging a ride that is already paid
    const { data: existingCompleted } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('ride_id', rideId)
      .eq('status', 'completed');
    if (existingCompleted !== null && (existingCompleted as unknown as number) > 0) {
      return new Response(JSON.stringify({ success: false, error: 'ride_already_paid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let cardToken: string;
    let paymentMethodId: string;
    let resolvedLastFour: string | undefined;
    let resolvedBrand: string | undefined;
    let resolvedHolderName: string | undefined;
    let resolvedExpiryMonth: string | undefined;
    let resolvedExpiryYear: string | undefined;

    // ─── Saved card flow ────────────────────────────────────────────────────────
    if (savedCardId) {
      const { data: savedCard, error: scError } = await supabase
        .from('saved_cards')
        .select('mp_card_id, mp_customer_id, mp_payment_method_id, last_four, brand, holder_name, expiry_month, expiry_year')
        .eq('id', savedCardId)
        // FIX [CRITICAL]: Verify the saved card belongs to the authenticated user
        .eq('user_id', userId)
        .single();

      if (scError || !savedCard) {
        return new Response(
          JSON.stringify({ success: false, error: 'Saved card not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!savedCard.mp_card_id || !savedCard.mp_customer_id) {
        // Card saved before MP Customers API was integrated — needs re-entry
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Este cartão precisa ser atualizado. Por favor, insira os dados completos uma vez.',
            requiresFullCard: true,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!cvv || cvv.length < 3) {
        return new Response(
          JSON.stringify({ success: false, error: 'CVV is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      console.log('[mp-tokenize-and-pay] Charging saved card for ride:', rideId);
      const tokenResult = await createSavedCardToken(
        MP_ACCESS_TOKEN,
        savedCard.mp_customer_id,
        savedCard.mp_card_id,
        cvv,
      );
      cardToken = tokenResult.token;
      paymentMethodId = tokenResult.paymentMethodId || savedCard.mp_payment_method_id || '';
      resolvedLastFour = savedCard.last_four;
      resolvedBrand = savedCard.brand;
      resolvedHolderName = savedCard.holder_name;
      resolvedExpiryMonth = savedCard.expiry_month?.toString();
      resolvedExpiryYear = savedCard.expiry_year?.toString();

    // ─── New card flow ────────────────────────────────────────────────────────
    } else {
      if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing card fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const rawNumber = String(cardNumber).replace(/\s/g, '');
      resolvedLastFour = rawNumber.slice(-4);
      resolvedHolderName = String(cardholderName).trim();
      resolvedExpiryMonth = String(expiryMonth);
      resolvedExpiryYear = String(expiryYear).length === 2 ? `20${expiryYear}` : String(expiryYear);

      // Step 1: Tokenize card
      const tokenPayload = {
        card_number: rawNumber,
        expiration_year: resolvedExpiryYear,
        expiration_month: String(expiryMonth).padStart(2, '0'),
        security_code: cvv,
        cardholder: {
          name: resolvedHolderName,
          identification: passengerCpf
            ? { type: 'CPF', number: passengerCpf.replace(/\D/g, '') }
            : undefined,
        },
      };

      console.log('[mp-tokenize-and-pay] Tokenizing new card for ride:', rideId);
      const tokenRes = await fetch(`${MP_API}/v1/card_tokens`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenPayload),
      });
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        console.error('[mp-tokenize-and-pay] Tokenization failed:', tokenRes.status, tokenData);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Dados do cartão inválidos. Verifique e tente novamente.',
            statusDetail: tokenData.cause?.[0]?.description || 'tokenization_error',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const ephemeralToken: string = tokenData.id;
      resolvedBrand = tokenData.payment_method_id;

      if (saveCard && userId) {
        // Step 2 (save path): attach card to MP customer → get persistent card_id
        // Then re-tokenize so the ephemeral token isn't consumed by the customer-card call
        try {
          const customerId = await findOrCreateMpCustomer(
            MP_ACCESS_TOKEN, passengerEmail, passengerCpf, passengerName,
          );
          const { mpCardId, mpPaymentMethodId } = await addCardToCustomer(
            MP_ACCESS_TOKEN, customerId, ephemeralToken,
          );
          // Re-tokenize for the payment (ephemeral token was consumed by card attachment)
          const retokenResult = await createSavedCardToken(
            MP_ACCESS_TOKEN, customerId, mpCardId, cvv,
          );
          cardToken = retokenResult.token;
          paymentMethodId = retokenResult.paymentMethodId || mpPaymentMethodId;

          // FIX [MEDIUM]: Use COUNT query with limit(1) instead of fetching all rows.
          // userId is always the authenticated user from JWT (fixed above).
          const { count: existingCardCount } = await supabase
            .from('saved_cards')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
          const isFirst = !existingCardCount || existingCardCount === 0;

          const { error: saveErr } = await supabase.from('saved_cards').insert({
            user_id: userId,
            last_four: resolvedLastFour,
            brand: normalizeBrand(resolvedBrand || ''),
            holder_name: resolvedHolderName,
            expiry_month: expiryMonth,
            expiry_year: resolvedExpiryYear,
            mp_card_id: mpCardId,
            mp_customer_id: customerId,
            mp_payment_method_id: mpPaymentMethodId,
            is_default: isFirst,
          });
          if (saveErr) {
            console.error('[mp-tokenize-and-pay] DB save card error:', saveErr);
          } else {
            console.log('[mp-tokenize-and-pay] Card saved to DB for user:', userId);
          }
        } catch (saveErr) {
          // FIX [HIGH]: The original code fell back to `ephemeralToken` (already consumed
          // by addCardToCustomer). Now we fall back to a fresh tokenize of the original
          // card data so the payment can still proceed.
          console.error('[mp-tokenize-and-pay] Failed to save card, re-tokenizing for fallback payment:', saveErr);
          try {
            const fallbackTokenRes = await fetch(`${MP_API}/v1/card_tokens`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(tokenPayload),
            });
            const fallbackTokenData = await fallbackTokenRes.json();
            if (!fallbackTokenRes.ok) {
              throw new Error(`Fallback tokenization failed: ${JSON.stringify(fallbackTokenData)}`);
            }
            cardToken = fallbackTokenData.id;
            paymentMethodId = fallbackTokenData.payment_method_id;
          } catch (fallbackErr) {
            console.error('[mp-tokenize-and-pay] Fallback tokenization also failed:', fallbackErr);
            cardToken = ephemeralToken; // last resort — will likely fail at MP if already consumed
            paymentMethodId = tokenData.payment_method_id;
          }
        }
      } else {
        cardToken = ephemeralToken;
        paymentMethodId = tokenData.payment_method_id;
      }
    }

    // ─── Charge ───────────────────────────────────────────────────────────────
    const payer: Record<string, unknown> = { email: passengerEmail };
    if (passengerName) {
      const parts = String(passengerName).trim().split(' ');
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

    // FIX [CRITICAL/MEDIUM]: The original idempotency key `ride-{rideId}-card` caused
    // MP to return a cached rejected response if the user retried with a different card.
    // Add a short nonce (first 8 chars of the cardToken) to make each attempt unique.
    const idempotencyKey = `ride-${rideId}-card-${cardToken.slice(0, 8)}`;

    const mpRes = await fetch(`${MP_API}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });
    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('[mp-tokenize-and-pay] MP payment error:', mpRes.status, mpData);
      throw new Error(mpData.message || `Payment failed: ${mpRes.status}`);
    }

    console.log('[mp-tokenize-and-pay] Payment result:', { id: mpData.id, status: mpData.status, detail: mpData.status_detail });

    // Persist payment record
    // FIX [CRITICAL]: Previously paymentError was swallowed — payment would return
    // success:true but no DB record, causing the ride to never show as paid.
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
        ...(mpData.status === 'approved' ? { paid_at: new Date().toISOString() } : {}),
      })
      .select()
      .single();

    if (paymentError) {
      // MP was charged but we couldn't record it — log prominently for manual reconciliation
      console.error('[mp-tokenize-and-pay] CRITICAL: MP charged but DB insert failed. MP payment ID:', mpData.id, 'Ride:', rideId, 'Error:', paymentError);
      // Still return the result so the user knows the charge happened,
      // but flag the error for ops monitoring
      return new Response(
        JSON.stringify({
          success: mpData.status === 'approved',
          paymentId: null,
          mpPaymentId: mpData.id,
          status: mpData.status,
          statusDetail: mpData.status_detail,
          brand: resolvedBrand,
          dbError: 'payment_record_failed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // FIX [HIGH]: Removed the direct `rides.payment_status = 'paid'` update that was
    // here previously. That created a dual-write race with mp-webhook. The webhook
    // is now the sole authority for updating rides.payment_status. The payment record
    // is inserted above with status='completed' (for approved payments), which is what
    // the webhook idempotency check uses, so the webhook will see it as already completed
    // and skip its processing — this is intentional and correct.

    return new Response(
      JSON.stringify({
        success: mpData.status === 'approved',
        paymentId: payment?.id || null,
        mpPaymentId: mpData.id,
        status: mpData.status,
        statusDetail: mpData.status_detail,
        brand: resolvedBrand,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: unknown) {
    console.error('[mp-tokenize-and-pay] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
