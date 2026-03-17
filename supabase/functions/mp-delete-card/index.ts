import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://gamma.app.br';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_API = 'https://api.mercadopago.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');

    // Require authenticated caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { cardId } = await req.json();
    if (!cardId) {
      return new Response(JSON.stringify({ error: 'cardId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify card belongs to authenticated user and get MP IDs
    const { data: card, error: cardErr } = await adminClient
      .from('saved_cards')
      .select('id, mp_card_id, mp_customer_id')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single();

    if (cardErr || !card) {
      return new Response(JSON.stringify({ error: 'Card not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Revoke card token in Mercado Pago if we have the MP IDs
    if (MP_ACCESS_TOKEN && card.mp_customer_id && card.mp_card_id) {
      const mpRes = await fetch(
        `${MP_API}/v1/customers/${card.mp_customer_id}/cards/${card.mp_card_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
        },
      );
      if (!mpRes.ok) {
        // Log but don't block — DB deletion is more important for UX
        console.warn('[mp-delete-card] MP card deletion failed:', mpRes.status, await mpRes.text());
      }
    }

    // Delete from DB
    const { error: deleteErr } = await adminClient
      .from('saved_cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', user.id);

    if (deleteErr) throw deleteErr;

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[mp-delete-card]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
