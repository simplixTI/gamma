-- =============================================================================
-- Security Hardening Migration
-- Created: 2026-03-15
--
-- Fixes 6 security issues in the Gamma boat-taxi app:
--   1. rides: add server-side CHECK constraints (coordinates, price, capacity)
--   2. passenger_profiles: replace overly-permissive RLS with scoped policies
--   3. storage: replace open upload policies with path-scoped upload policies
--   4. payments: prevent passengers from self-escalating status to 'completed'
--   5. payment_audit_log: new table + trigger to record all status changes
--   6. wallet_transactions: fix UPDATE policy missing TO clause (any user bug)
-- =============================================================================


-- =============================================================================
-- 1. RIDES: Server-side CHECK constraints
-- =============================================================================

-- passenger_count: 1–16 (maximum boat capacity)
ALTER TABLE public.rides
  ADD CONSTRAINT check_passenger_count
  CHECK (passenger_count >= 1 AND passenger_count <= 16);

-- price must be positive
ALTER TABLE public.rides
  ADD CONSTRAINT check_price_positive
  CHECK (price > 0);

-- origin coordinates must be valid for Brazil (approximate bounding box)
ALTER TABLE public.rides
  ADD CONSTRAINT check_origin_lat
  CHECK (origin_lat BETWEEN -35 AND 5);

ALTER TABLE public.rides
  ADD CONSTRAINT check_origin_lng
  CHECK (origin_lng BETWEEN -75 AND -34);

-- destination coordinates: nullable, but if supplied must be valid for Brazil
ALTER TABLE public.rides
  ADD CONSTRAINT check_dest_lat
  CHECK (destination_lat IS NULL OR destination_lat BETWEEN -35 AND 5);

ALTER TABLE public.rides
  ADD CONSTRAINT check_dest_lng
  CHECK (destination_lng IS NULL OR destination_lng BETWEEN -75 AND -34);


-- =============================================================================
-- 2. PASSENGER PROFILES: Replace broad/conflicting RLS policies
-- =============================================================================

-- Ensure RLS is on (idempotent)
ALTER TABLE public.passenger_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies that may be too permissive or conflicting
DROP POLICY IF EXISTS "Users can read own profile"                          ON public.passenger_profiles;
DROP POLICY IF EXISTS "Users can update own profile"                        ON public.passenger_profiles;
DROP POLICY IF EXISTS "Authenticated users can read passenger profiles"     ON public.passenger_profiles;
-- From migration 20251212221714: overly-broad pilot read policy
DROP POLICY IF EXISTS "Pilots can view passenger profiles for rides"        ON public.passenger_profiles;
-- From migration 20251212221714: individual passenger policies (will recreate with better names)
DROP POLICY IF EXISTS "Passengers can view their own profile"               ON public.passenger_profiles;
DROP POLICY IF EXISTS "Passengers can insert their own profile"             ON public.passenger_profiles;
DROP POLICY IF EXISTS "Passengers can update their own profile"             ON public.passenger_profiles;

-- Own profile: full read/write access
CREATE POLICY "Passengers read own profile"
  ON public.passenger_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Passengers update own profile"
  ON public.passenger_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Passengers insert own profile"
  ON public.passenger_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Pilots can read a passenger's profile only when they share an active or
-- recently-completed ride — prevents pilots from enumerating all passengers.
-- Note: the SELECT policy is a UNION of conditions, so the own-read policy
-- above would overlap.  We consolidate into one combined SELECT policy that
-- covers both cases in a single policy object.
DROP POLICY IF EXISTS "Passengers read own profile" ON public.passenger_profiles;

CREATE POLICY "Passengers read own profile"
  ON public.passenger_profiles FOR SELECT
  TO authenticated
  USING (
    -- Passenger reads their own profile
    user_id = auth.uid()
    OR
    -- Pilot reads the passenger profile for a shared ride
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.passenger_user_id = passenger_profiles.user_id
        AND r.pilot_user_id = auth.uid()
        AND r.status IN ('accepted', 'pilot_arriving', 'in_progress', 'completed')
    )
  );


-- =============================================================================
-- 3. STORAGE: Replace open upload policies with path-scoped upload policies
-- =============================================================================

-- ----- avatars bucket -----
DROP POLICY IF EXISTS "Authenticated users can upload their avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to avatars"        ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars"                       ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars"                           ON storage.objects;

-- Uploads: authenticated, must use their own UID as the top-level folder,
-- and the object path must be reasonably short (prevents path-stuffing).
CREATE POLICY "Allow authenticated uploads to avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND octet_length(encode(name::bytea, 'escape')) < 256
  );

-- Public reads (pilots are displayed to passengers via public avatar URLs)
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- ----- boat-photos bucket -----
DROP POLICY IF EXISTS "Pilots can upload boat photos"                   ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to boat-photos"      ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view boat photos"                     ON storage.objects;
DROP POLICY IF EXISTS "Public read boat-photos"                         ON storage.objects;

-- Uploads: authenticated, must use their own UID as the top-level folder
CREATE POLICY "Allow authenticated uploads to boat-photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'boat-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public reads
CREATE POLICY "Public read boat-photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'boat-photos');


-- =============================================================================
-- 4. PAYMENTS: Prevent passengers from self-escalating status to 'completed'
-- =============================================================================

-- Drop the old unconstrained passenger update policy if it exists
DROP POLICY IF EXISTS "Passengers can update own ride payments" ON public.payments;

-- Passengers may only update their own ride's payment row
-- (e.g. to set a tip), and they are blocked from setting status = 'completed'.
-- Status escalation to 'completed' is reserved for service_role (webhooks).
CREATE POLICY "Passengers can update tip on own ride payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = payments.ride_id
        AND r.passenger_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = payments.ride_id
        AND r.passenger_user_id = auth.uid()
    )
    -- Passengers cannot escalate payment status to 'completed'
    AND status != 'completed'
  );


-- =============================================================================
-- 5. PAYMENT AUDIT LOG: Table + trigger for all payment status changes
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT        NOT NULL,
  ride_id       UUID        REFERENCES public.rides(id),
  payment_id    UUID        REFERENCES public.payments(id),
  user_id       UUID,
  amount        NUMERIC(10,2),
  old_status    TEXT,
  new_status    TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read only their own audit entries; inserts are done exclusively
-- by the trigger function (SECURITY DEFINER — bypasses RLS for the write).
CREATE POLICY "Users can read own audit log"
  ON public.payment_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger function: fires AFTER UPDATE on payments whenever status changes.
-- SECURITY DEFINER so that it can write to payment_audit_log regardless of
-- the caller's role, without granting direct INSERT to authenticated users.
CREATE OR REPLACE FUNCTION public.trg_log_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.payment_audit_log (
      event_type,
      ride_id,
      payment_id,
      amount,
      old_status,
      new_status,
      metadata
    ) VALUES (
      'payment_status_change',
      NEW.ride_id,
      NEW.id,
      NEW.amount,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'mp_payment_id',   NEW.mp_payment_id,
        'payment_method',  NEW.payment_method
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_payment_status_change ON public.payments;

CREATE TRIGGER trg_log_payment_status_change
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_payment_status_change();


-- =============================================================================
-- 6. WALLET TRANSACTIONS: Fix UPDATE policy missing the TO clause
--    The original policy in 20260313120000_wallet.sql omitted "TO service_role",
--    which caused ANY authenticated user to be able to UPDATE any wallet row.
-- =============================================================================

DROP POLICY IF EXISTS "Service role can update wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Service role can update wallet transactions"
  ON public.wallet_transactions FOR UPDATE
  TO service_role
  USING (true);
