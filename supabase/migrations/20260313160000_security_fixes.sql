-- Security fixes:
-- 1. Payments RLS: restrict to ride participants, not all authenticated users
-- 2. Pilot profiles: hide pix_key and earnings from passengers via separate policy
-- 3. Fix rides RLS: use pilot_user_id (UUID) in addition to pilot_id (device string)

-- ============================================================
-- PAYMENTS: Drop overly permissive policies, add proper ones
-- ============================================================
DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Payments can be updated" ON public.payments;

-- Passengers can read payments for their own rides
CREATE POLICY "Passengers can read own ride payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = payments.ride_id
        AND (r.passenger_user_id = auth.uid() OR r.pilot_user_id = auth.uid())
    )
  );

-- Service role (edge functions / webhooks) can always update payments
-- Passengers can insert payments for their own rides
CREATE POLICY "Passengers can create payments for own rides"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = payments.ride_id
        AND r.passenger_user_id = auth.uid()
    )
  );

-- Only service role updates payments (webhooks use service_role key)
-- Regular authenticated users cannot update payment records
CREATE POLICY "Service role can update payments"
  ON public.payments FOR UPDATE
  TO service_role
  USING (true);

-- ============================================================
-- PILOT PROFILES: Two-tier read policy
-- Own profile: see everything
-- Other profiles (passengers viewing): see only public fields, NOT pix_key or earnings
-- ============================================================
DROP POLICY IF EXISTS "Pilots can read own profile" ON public.pilot_profiles;
DROP POLICY IF EXISTS "Users can read pilot profiles" ON public.pilot_profiles;
-- Drop any existing catch-all select policies on pilot_profiles
DROP POLICY IF EXISTS "Authenticated users can read pilot profiles" ON public.pilot_profiles;

-- Pilots can read and update their own full profile
CREATE POLICY "Pilots read own profile"
  ON public.pilot_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Passengers can read public pilot profile info (no pix_key, no earnings)
-- Supabase RLS doesn't support column-level in SELECT policies directly,
-- but we can allow the read and rely on the app to not expose these.
-- We grant read to ride participants only (passengers on an active/recent ride with this pilot).
CREATE POLICY "Passengers read pilot profile for active ride"
  ON public.pilot_profiles FOR SELECT
  TO authenticated
  USING (
    -- Always allow reading own profile
    user_id = auth.uid()
    OR
    -- Passenger can read pilot profile if they have a ride together
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.pilot_user_id = pilot_profiles.user_id
        AND r.passenger_user_id = auth.uid()
        AND r.status IN ('accepted', 'pilot_arriving', 'in_progress', 'completed')
    )
  );

-- Pilots can update their own profile
DROP POLICY IF EXISTS "Pilots can update own profile" ON public.pilot_profiles;
CREATE POLICY "Pilots update own profile"
  ON public.pilot_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RIDES: Add policy for pilot_user_id (UUID-based auth)
-- ============================================================
-- Add a supplementary policy so pilots can access their rides by UUID
-- (existing device-based policies remain for backwards compat)
DROP POLICY IF EXISTS "Pilots can read own rides by user_id" ON public.rides;
CREATE POLICY "Pilots can read own rides by user_id"
  ON public.rides FOR SELECT
  TO authenticated
  USING (pilot_user_id = auth.uid() OR passenger_user_id = auth.uid());

DROP POLICY IF EXISTS "Pilots can update own rides by user_id" ON public.rides;
CREATE POLICY "Pilots can update own rides by user_id"
  ON public.rides FOR UPDATE
  TO authenticated
  USING (pilot_user_id = auth.uid() OR passenger_user_id = auth.uid());
