-- Server-side fallback: auto-cancel pending rides abandoned by passenger.
-- Client modal asks "keep waiting?" at 3min; if passenger closes the app
-- without responding, this cron job cleans up rides stuck in 'pending'
-- for more than 30 minutes. The 30-min threshold is intentionally much
-- longer than the client timeout so it only catches abandoned rides.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.expire_abandoned_pending_rides()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.rides
  SET
    status = 'cancelled',
    cancelled_by = 'passenger',
    updated_at = NOW()
  WHERE
    status = 'pending'
    AND created_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Unschedule any previous job with same name to make this migration idempotent
DO $$
BEGIN
  PERFORM cron.unschedule('expire-abandoned-pending-rides');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'expire-abandoned-pending-rides',
  '*/5 * * * *',
  $$SELECT public.expire_abandoned_pending_rides();$$
);
