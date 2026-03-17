-- Push notification database webhook trigger
-- Replaces the broken trigger from 20260316000005 that had a hardcoded placeholder secret.
-- This trigger calls the send-push-notification edge function via Supabase's built-in
-- http_request helper whenever a new ride enters 'pending' status.
--
-- IMPORTANT: The PUSH_WEBHOOK_SECRET must be set in Supabase Edge Function secrets
-- before this trigger will work. Run:
--   npx supabase secrets set PUSH_WEBHOOK_SECRET=<your-secret> --project-ref <ref>
--
-- The secret is stored in a Postgres setting (app.push_webhook_secret) that is
-- populated by a separate manual step or by the Supabase Dashboard webhook UI.
-- Using the Dashboard webhook is the recommended approach as it avoids embedding
-- the secret value in a migration file.
--
-- Drop the old broken trigger first
DROP TRIGGER IF EXISTS on_ride_created_notify_pilots ON public.rides;
DROP FUNCTION IF EXISTS public.notify_pilots_on_new_ride();

-- The new trigger function reads the webhook secret from app settings, allowing
-- it to be set externally without being hardcoded in the migration.
CREATE OR REPLACE FUNCTION public.notify_pilots_on_new_ride()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
  v_url    TEXT;
BEGIN
  -- Only fire for new rides with pending status
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Read secret from app settings (set via Supabase Dashboard or CLI)
  BEGIN
    v_secret := current_setting('app.push_webhook_secret', true);
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING 'notify_pilots_on_new_ride: app.push_webhook_secret not set — skipping push';
    RETURN NEW;
  END IF;

  v_url := current_setting('app.supabase_functions_url', true);
  IF v_url IS NULL OR v_url = '' THEN
    -- Fallback: construct URL from the supabase URL
    v_url := 'https://yrhdcigbbahylzfzbsnk.supabase.co/functions/v1/send-push-notification';
  END IF;

  -- Fire and forget — any error here must not break the ride INSERT
  BEGIN
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type',      'application/json',
        'x-webhook-secret',  v_secret
      ),
      body    := jsonb_build_object(
        'type',       'INSERT',
        'table',      'rides',
        'schema',     'public',
        'record',     row_to_json(NEW)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_pilots_on_new_ride: http_post failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ride_created_notify_pilots
  AFTER INSERT ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pilots_on_new_ride();

COMMENT ON FUNCTION public.notify_pilots_on_new_ride IS
  'Fires send-push-notification edge function when a new pending ride is created.
   Requires app.push_webhook_secret to be set via:
     ALTER DATABASE postgres SET app.push_webhook_secret = ''<secret>'';
   Or use Supabase Dashboard > Database > Webhooks for a fully managed alternative.';
