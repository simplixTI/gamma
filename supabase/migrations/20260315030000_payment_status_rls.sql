-- Block client-side escalation of rides.payment_status to 'paid'
-- Only service_role (MP webhook) may set payment_status = 'paid'

-- Drop and recreate the passenger/pilot UPDATE policy on rides with a WITH CHECK
-- that prevents setting payment_status to 'paid' directly from the client.

DROP POLICY IF EXISTS "Passengers and pilots can update own rides" ON public.rides;
DROP POLICY IF EXISTS "rides_update_authenticated" ON public.rides;

-- Recreate a combined UPDATE policy for authenticated users that:
--   1. Allows the passenger or pilot to update their own ride
--   2. Blocks setting payment_status = 'paid' (must come via service_role webhook)
CREATE POLICY "rides_update_authenticated"
ON public.rides
FOR UPDATE
TO authenticated
USING (
  passenger_user_id = auth.uid()
  OR pilot_user_id = auth.uid()
)
WITH CHECK (
  (passenger_user_id = auth.uid() OR pilot_user_id = auth.uid())
  AND payment_status IS DISTINCT FROM 'paid'
);

-- service_role bypasses RLS entirely, so the webhook can still set payment_status = 'paid'
