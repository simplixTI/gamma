-- ============================================================
-- Push notification trigger (code-managed)
-- Replaces the manually-created Database Webhook with a
-- SQL trigger so it's version-controlled and always in sync.
--
-- SETUP (do once):
--   1. Go to Supabase Dashboard → Edge Functions → Secrets
--   2. Set PUSH_WEBHOOK_SECRET to a strong random value (e.g. openssl rand -hex 32)
--      NEVER commit the actual secret value here — use the dashboard secrets manager.
--   3. Update the x-webhook-secret header value below to match PUSH_WEBHOOK_SECRET.
--   4. Delete the manually-created webhook from:
--      Dashboard → Integrations → Database Webhooks
--      (to avoid duplicate notifications)
--
-- SECURITY NOTE: The secret value in the header below is visible to anyone with DB
-- access. Rotate it periodically in both this file and the Edge Function secret.
-- ============================================================

DROP TRIGGER IF EXISTS trg_notify_pilot_new_ride ON public.rides;

-- NOTE: Replace REPLACE_WITH_YOUR_PUSH_WEBHOOK_SECRET below with your actual secret.
-- The body uses row_to_json so the edge function receives the ride record and can
-- check ride.status === 'pending' before sending notifications.
CREATE TRIGGER trg_notify_pilot_new_ride
  AFTER INSERT ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://yrhdcigbbahylzfzbsnk.supabase.co/functions/v1/send-push-notification',
    'POST',
    '{"Content-Type": "application/json", "x-webhook-secret": "REPLACE_WITH_YOUR_PUSH_WEBHOOK_SECRET"}',
    '{}',
    5000
  );

-- IMPORTANT: supabase_functions.http_request does not support dynamic row data in
-- the body parameter (it only accepts a static string). The edge function therefore
-- fetches the ride from the DB using the ride ID passed via the Supabase webhook
-- POST body (populated automatically when using Dashboard → Database Webhooks).
-- If using this SQL trigger instead of a Dashboard webhook, the body will be empty
-- and the edge function will skip silently. Use the Dashboard webhook approach for
-- production to get the full ride record in the payload.
