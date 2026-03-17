import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://gamma.app.br';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendPushBody {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const WEBHOOK_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET');
    if (!WEBHOOK_SECRET) {
      console.error('[send-push-notification] PUSH_WEBHOOK_SECRET env var not set — refusing all requests');
      return new Response(JSON.stringify({ error: 'service_not_configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Accept calls from:
    // 1. Supabase Database Webhooks (x-webhook-secret header)
    // 2. Authenticated user sessions (Authorization: Bearer <token>)
    const webhookSecret = req.headers.get('x-webhook-secret');
    const authHeader = req.headers.get('Authorization');

    // Constant-time comparison to prevent timing attacks on webhook secret
    const isWebhook = (() => {
      if (!webhookSecret) return false;
      if (webhookSecret.length !== WEBHOOK_SECRET.length) return false;
      let diff = 0;
      for (let i = 0; i < webhookSecret.length; i++) {
        diff |= webhookSecret.charCodeAt(i) ^ WEBHOOK_SECRET.charCodeAt(i);
      }
      return diff === 0;
    })();

    if (!isWebhook) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing authorization' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // For authenticated (non-webhook) requests, capture the caller's identity
    let callerUserId: string | undefined;
    if (!isWebhook && authHeader) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user: callerUser } } = await userClient.auth.getUser();
      callerUserId = callerUser?.id;
    }

    let userId: string | undefined;
    let title: string;
    let body: string;
    let data: Record<string, string> | undefined;
    let targetUserIds: string[] = [];

    if (isWebhook) {
      // Supabase Database Webhook payload: { type, table, record, schema, old_record }
      const payload = await req.json();
      const ride = payload.record;

      if (!ride || ride.status !== 'pending') {
        // Only notify on new pending rides
        return new Response(JSON.stringify({ skipped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      title = '🚤 Nova corrida disponível!';
      body = `${ride.origin_name} → ${ride.destination_name ?? 'Destino'} · R$ ${Number(ride.price).toFixed(2)}`;
      data = { type: 'new_ride', rideId: ride.id };

      // Step 1: get available pilot location records
      const { data: availableLocations } = await adminClient
        .from('locations')
        .select('pilot_id, lat, lng')
        .eq('is_available', true);

      if (!availableLocations || availableLocations.length === 0) {
        return new Response(JSON.stringify({ sent: false, reason: 'no_available_pilots' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Step 2: filter by distance if origin coords are available (~5km radius)
      const originLat = ride.origin_lat as number | null | undefined;
      const originLng = ride.origin_lng as number | null | undefined;
      let filteredPilotIds: string[] = availableLocations.map((l: { pilot_id: string }) => l.pilot_id);

      if (originLat != null && originLng != null) {
        filteredPilotIds = availableLocations
          .filter((l: { pilot_id: string; lat: number; lng: number }) => {
            const R = 6371000;
            const dLat = (l.lat - originLat) * Math.PI / 180;
            const dLng = (l.lng - originLng) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(originLat*Math.PI/180)*Math.cos(l.lat*Math.PI/180)*Math.sin(dLng/2)**2;
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return dist <= 5000; // 5km
          })
          .map((l: { pilot_id: string }) => l.pilot_id);

        if (filteredPilotIds.length === 0) {
          return new Response(JSON.stringify({ sent: false, reason: 'no_pilots_within_range' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Step 3: resolve pilot_profiles.user_id for the filtered pilot profile IDs
      const { data: filteredPilots } = await adminClient
        .from('pilot_profiles')
        .select('user_id')
        .in('id', filteredPilotIds);

      const filteredUserIds: string[] = filteredPilots?.map((p: { user_id: string }) => p.user_id) ?? [];

      // Step 4: get push tokens for the filtered user IDs
      const { data: pilotTokens } = filteredUserIds.length > 0
        ? await adminClient.from('push_tokens').select('user_id, token, platform').in('user_id', filteredUserIds)
        : { data: [] };

      if (!pilotTokens || pilotTokens.length === 0) {
        return new Response(JSON.stringify({ sent: false, reason: 'no_pilot_tokens' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Send to available nearby pilots and return early
      const FCM_PROJECT_ID_WH = Deno.env.get('FCM_PROJECT_ID');
      const FCM_SERVICE_ACCOUNT_WH = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
      if (!FCM_PROJECT_ID_WH || !FCM_SERVICE_ACCOUNT_WH) throw new Error('FCM env vars not set');

      const sa = JSON.parse(FCM_SERVICE_ACCOUNT_WH);
      const now2 = Math.floor(Date.now() / 1000);
      const hdr = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const pay = btoa(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now2, exp: now2 + 3600 }));
      const kd = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\n/g, '');
      const kb = Uint8Array.from(atob(kd), c => c.charCodeAt(0));
      const ck = await globalThis.crypto.subtle.importKey('pkcs8', kb, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
      const si = `${hdr}.${pay}`;
      const sig = await globalThis.crypto.subtle.sign('RSASSA-PKCS1-v1_5', ck, new TextEncoder().encode(si));
      const jwt = `${si}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
      const tkRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
      const { access_token: at } = await tkRes.json();

      const staleWebhookTokens: string[] = [];
      const results = await Promise.all(pilotTokens.map(async (row: { token: string; platform: string }) => {
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID_WH}/messages:send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: { token: row.token, notification: { title, body }, data: data ?? {} } }),
        });
        // FCM 404 = token is no longer registered (app uninstalled or token rotated)
        if (res.status === 404) staleWebhookTokens.push(row.token);
        return { platform: row.platform, status: res.status };
      }));

      // Clean up stale tokens so future sends skip them
      if (staleWebhookTokens.length > 0) {
        await adminClient.from('push_tokens').delete().in('token', staleWebhookTokens);
        console.log(`[send-push-notification] Removed ${staleWebhookTokens.length} stale webhook token(s)`);
      }

      return new Response(JSON.stringify({ sent: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Direct API call: expects { userId, title, body, data }
      // For non-webhook authenticated callers, the target userId MUST be the caller's own
      // user ID unless the caller is an admin. This prevents any user from spamming pushes
      // to arbitrary targets (CWE-639).
      const parsed: SendPushBody = await req.json();
      if (!parsed.userId || !parsed.title || !parsed.body) {
        return new Response(
          JSON.stringify({ error: 'userId, title and body are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Enforce: authenticated users can only push to themselves
      if (callerUserId && parsed.userId !== callerUserId) {
        // Check if caller is an admin before allowing cross-user push
        const { data: adminRow } = await adminClient
          .from('admin_users')
          .select('id')
          .eq('user_id', callerUserId)
          .eq('is_active', true)
          .maybeSingle();

        if (!adminRow) {
          console.error(`[send-push-notification] User ${callerUserId} attempted to push to ${parsed.userId}`);
          return new Response(
            JSON.stringify({ error: 'Forbidden: cannot push to another user' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      userId = parsed.userId;
      title = parsed.title;
      body = parsed.body;
      data = parsed.data;
      targetUserIds = [userId];
    }

    const { data: rows, error: tokenError } = await adminClient
      .from('push_tokens')
      .select('token, platform')
      .in('user_id', targetUserIds);

    if (tokenError) throw tokenError;

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'no_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FCM HTTP v1 API via service account
    const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID');
    const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');

    if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT) {
      throw new Error('FCM_PROJECT_ID and FCM_SERVICE_ACCOUNT_JSON env vars must be set');
    }

    // Get OAuth2 access token for FCM v1
    const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT);
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const jwtPayload = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }));

    // Sign JWT with RS256 using the service account private key
    const { subtle } = globalThis.crypto;
    const keyData = serviceAccount.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\n/g, '');
    const keyBuffer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    const cryptoKey = await subtle.importKey(
      'pkcs8', keyBuffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
    );
    const signingInput = `${jwtHeader}.${jwtPayload}`;
    const signature = await subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );
    const signedJwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
    });
    const { access_token: accessToken } = await tokenRes.json();

    // Send to each token via FCM HTTP v1
    const staleTokens: string[] = [];
    const results = await Promise.all(
      rows.map(async (row: { token: string; platform: string }) => {
        const message = {
          message: {
            token: row.token,
            notification: { title, body },
            data: data ?? {},
          },
        };
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          }
        );
        // FCM 404 = token is no longer registered (app uninstalled or token rotated)
        if (res.status === 404) staleTokens.push(row.token);
        return { platform: row.platform, status: res.status };
      })
    );

    // Clean up stale tokens so future sends skip them
    if (staleTokens.length > 0) {
      await adminClient.from('push_tokens').delete().in('token', staleTokens);
      console.log(`[send-push-notification] Removed ${staleTokens.length} stale token(s)`);
    }

    return new Response(
      JSON.stringify({ sent: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-push-notification]', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
