-- =============================================================================
-- Migration: 20260317000026_security_critical_fixes.sql
-- Purpose: Fix multiple critical security vulnerabilities
-- Date: 2026-03-17
-- =============================================================================


-- =============================================================================
-- FIX 1: pay_ride_with_wallet — add auth.uid() ownership check + ride ownership
-- Vulnerability: any authenticated user could pass any p_user_id and drain
-- another user's wallet. The ride existence check also had no passenger filter.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.pay_ride_with_wallet(
  p_user_id    UUID,
  p_ride_id    UUID,
  p_amount     NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_ride    rides%ROWTYPE;
  v_desc    TEXT;
BEGIN
  -- SECURITY: caller must be the wallet owner
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  -- Validate ride exists and belongs to this passenger
  SELECT * INTO v_ride
  FROM rides
  WHERE id = p_ride_id
    AND passenger_user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ride_not_found');
  END IF;

  -- Check not already paid
  IF v_ride.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_paid');
  END IF;

  -- Get current balance with lock
  SELECT wallet_balance INTO v_balance
  FROM passenger_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance',
      'balance', v_balance, 'required', p_amount);
  END IF;

  v_desc := COALESCE(p_description, 'Corrida: ' || p_ride_id);

  -- Debit wallet
  UPDATE passenger_profiles
  SET wallet_balance = wallet_balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert wallet transaction
  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_after, description, status, completed_at
  ) VALUES (
    p_user_id, 'ride_payment', p_amount,
    v_balance - p_amount, v_desc, 'completed', NOW()
  );

  -- Mark ride as paid — ATOMIC with the debit above
  UPDATE rides
  SET payment_status = 'paid',
      payment_method = 'wallet',
      updated_at = NOW()
  WHERE id = p_ride_id;

  RETURN jsonb_build_object('success', true, 'balance_after', v_balance - p_amount);
END;
$$;

COMMENT ON FUNCTION public.pay_ride_with_wallet IS
  'Atomically debits the passenger wallet and marks the ride as paid.
   Enforces auth.uid() = p_user_id and ride ownership before any mutation.
   Both debit and ride update happen in a single transaction.';


-- =============================================================================
-- FIX 2: debit_wallet — add auth.uid() ownership check
-- Vulnerability: any authenticated user could call debit_wallet with any
-- p_user_id and drain another user's wallet balance.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id    UUID,
  p_amount     NUMERIC,
  p_description TEXT,
  p_ride_id    UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
  new_balance     NUMERIC;
BEGIN
  -- SECURITY: caller must be the wallet owner
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT wallet_balance INTO current_balance
  FROM passenger_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'Perfil de passageiro não encontrado';
  END IF;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  new_balance := current_balance - p_amount;

  UPDATE passenger_profiles
  SET wallet_balance = new_balance
  WHERE user_id = p_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, ride_id, status, completed_at)
  VALUES (p_user_id, 'ride_payment', p_amount, new_balance, p_description, p_ride_id, 'completed', now());

  RETURN new_balance;
END;
$$;


-- =============================================================================
-- FIX 3: ride_reviews INSERT policy — validate reviewee is actual ride participant
-- Vulnerability: the old policies only checked reviewer_id = auth.uid() but did
-- not verify that the reviewee was actually the other participant on that ride,
-- allowing users to submit fake reviews against arbitrary users.
-- =============================================================================
DROP POLICY IF EXISTS "passengers_can_review_pilots" ON public.ride_reviews;
DROP POLICY IF EXISTS "pilots_can_review_passengers" ON public.ride_reviews;
DROP POLICY IF EXISTS "Reviewer can insert own review" ON public.ride_reviews;

CREATE POLICY "ride_reviews_insert_validated" ON public.ride_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = ride_id
        AND r.status = 'completed'
        AND (
          (reviewer_role = 'passenger' AND r.passenger_user_id = auth.uid() AND r.pilot_user_id = reviewee_id)
          OR
          (reviewer_role = 'pilot' AND r.pilot_user_id = auth.uid() AND r.passenger_user_id = reviewee_id)
        )
    )
  );


-- =============================================================================
-- FIX 4: rides RLS — prevent passengers from setting status = 'completed' directly
-- Vulnerability: a passenger with an UPDATE policy could flip status to
-- 'completed' without going through the pilot confirmation flow.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.prevent_passenger_self_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- If passenger is setting status to completed directly (not via pilot), block it
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    IF auth.uid() = NEW.passenger_user_id AND auth.uid() != NEW.pilot_user_id THEN
      RAISE EXCEPTION 'Passengers cannot mark rides as completed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_passenger_self_complete ON public.rides;

CREATE TRIGGER trg_prevent_passenger_self_complete
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.prevent_passenger_self_complete();


-- =============================================================================
-- FIX 5: referral_discounts — replace FOR ALL policy with explicit SELECT/INSERT
-- Vulnerability: FOR ALL implicitly allowed UPDATE and DELETE, letting a
-- passenger mark their own discount as used (is_used = true -> false) or
-- reassign it to a different ride.
-- =============================================================================
DROP POLICY IF EXISTS "passengers_own_discounts" ON public.referral_discounts;

CREATE POLICY "referral_discounts_select" ON public.referral_discounts
  FOR SELECT TO authenticated
  USING (passenger_user_id = auth.uid());

CREATE POLICY "referral_discounts_insert" ON public.referral_discounts
  FOR INSERT TO authenticated
  WITH CHECK (passenger_user_id = auth.uid());

-- Admins can see all discount records
CREATE POLICY "referral_discounts_admin_read" ON public.referral_discounts
  FOR SELECT
  USING (public.is_admin());


-- =============================================================================
-- FIX 6: support_tickets — remove OR user_id IS NULL from INSERT policy
-- Vulnerability: any authenticated user could create a ticket with user_id = NULL,
-- making it impossible to attribute or audit the ticket to its real creator.
-- =============================================================================
DROP POLICY IF EXISTS "Users can create support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "authenticated_insert_own_ticket" ON public.support_tickets;

CREATE POLICY "authenticated_insert_own_ticket" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- =============================================================================
-- FIX 7: account_deletion_requests — add TO authenticated on both policies
-- Vulnerability: policies without a role clause apply to all roles including
-- anon, potentially allowing unauthenticated users to insert deletion requests.
-- =============================================================================
DROP POLICY IF EXISTS "user can request own deletion" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "user can view own deletion request" ON public.account_deletion_requests;

CREATE POLICY "user can request own deletion" ON public.account_deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user can view own deletion request" ON public.account_deletion_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- =============================================================================
-- FIX 8: pilot_earnings — add admin read policy (idempotent)
-- Gap: admins had no browser-client read access to pilot earnings, blocking
-- the admin panel from showing earnings data.
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pilot_earnings' AND policyname = 'admin_pilot_earnings_read'
  ) THEN
    CREATE POLICY "admin_pilot_earnings_read" ON public.pilot_earnings
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;


-- =============================================================================
-- FIX 9: pilot-documents storage bucket — create if missing + scoped policies
-- Gap: the bucket may not exist in all environments; pilots and admins need
-- correctly scoped storage policies to upload/read pilot documents.
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pilot-documents',
  'pilot-documents',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Pilots can upload documents to their own folder only
CREATE POLICY "pilot_documents_own_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pilot-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Pilots can read their own documents
CREATE POLICY "pilot_documents_own_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pilot-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read all pilot documents
CREATE POLICY "pilot_documents_admin_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pilot-documents'
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
