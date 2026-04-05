-- Fix: Ensure service_role can always update rides.payment_status
-- The existing WITH CHECK clause blocks setting payment_status='paid' for authenticated users
-- but service_role should bypass RLS. Adding explicit policy as safety net.

-- Drop and recreate the restrictive policy to be less aggressive
DROP POLICY IF EXISTS "rides_update_authenticated" ON public.rides;

-- Authenticated users can update their own rides (no restriction on payment_status values)
CREATE POLICY "rides_update_own"
ON public.rides
FOR UPDATE
TO authenticated
USING (
  passenger_user_id = auth.uid()
  OR pilot_user_id = auth.uid()
);

-- Explicit service_role policy (belt-and-suspenders)
DROP POLICY IF EXISTS "rides_service_role_update" ON public.rides;
CREATE POLICY "rides_service_role_update"
ON public.rides
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
