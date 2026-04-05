import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://www.gamma.app.br';
// NOTE: Set ALLOWED_ORIGIN env var in Supabase secrets for production
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate caller via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Admin client to bypass RLS and delete auth user
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Reject if passenger has an active or in-progress ride
    const { data: activeRide } = await adminClient
      .from('rides')
      .select('id')
      .eq('passenger_user_id', userId)
      .in('status', ['pending', 'accepted', 'pilot_arriving', 'in_progress'])
      .maybeSingle();

    if (activeRide) {
      return new Response(JSON.stringify({ success: false, error: 'active_ride_exists' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete in foreign-key-safe order
    await adminClient.from('user_settings').delete().eq('user_id', userId);
    await adminClient.from('payment_audit_log').delete().eq('user_id', userId);
    await adminClient.from('wallet_transactions').delete().eq('user_id', userId);

    // Payments linked via passenger_profiles.device_id
    const { data: profiles } = await adminClient
      .from('passenger_profiles')
      .select('id')
      .eq('user_id', userId);
    if (profiles && profiles.length > 0) {
      const profileIds = profiles.map((p: { id: string }) => p.id);
      await adminClient.from('payments').delete().in('passenger_profile_id', profileIds);
    }

    await adminClient.from('favorite_locations').delete().eq('user_id', userId);
    // referral_discounts: remove entries where this user earned the discount OR was the referred user
    await adminClient.from('referral_discounts').delete().eq('passenger_user_id', userId);
    await adminClient.from('referral_discounts').delete().eq('earned_from_user_id', userId);
    await adminClient.from('support_tickets').delete().eq('user_id', userId);
    // ride_reviews uses reviewer_id / reviewee_id
    await adminClient.from('ride_reviews').delete().or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`);
    await adminClient.from('push_tokens').delete().eq('user_id', userId);
    await adminClient.from('saved_cards').delete().eq('user_id', userId);
    await adminClient.from('rides').delete().eq('passenger_user_id', userId);
    await adminClient.from('passenger_profiles').delete().eq('user_id', userId);

    // Hard-delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
