-- =============================================================================
-- Migration: 20260320000027_security_post_audit.sql
-- Purpose: Security fixes identified in post-swarm audit (2026-03-20)
-- =============================================================================


-- =============================================================================
-- FIX 1 (M-02): Add UPDATE RLS policy on referral_discounts
-- Without this, is_used = true updates silently fail (0 rows updated),
-- allowing discounts to be reused indefinitely.
-- =============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "referral_discounts_update_own" ON public.referral_discounts;
END $$;

CREATE POLICY "referral_discounts_update_own" ON public.referral_discounts
  FOR UPDATE TO authenticated
  USING (passenger_user_id = auth.uid())
  WITH CHECK (passenger_user_id = auth.uid() AND is_used = true);


-- =============================================================================
-- FIX 2 (M-01): Generate referral codes server-side via trigger
-- First 8 chars of user UUID are predictable — use random hex instead.
-- Only overwrites if referral_code is NULL (idempotent on existing rows).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(md5(gen_random_uuid()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.passenger_profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.passenger_profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();


-- =============================================================================
-- FIX 3 (M-04): BEFORE UPDATE trigger to prevent pilots from changing their
-- own approval_status (belt-and-suspenders on top of the RLS WITH CHECK).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.guard_pilot_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block non-admins from changing approval_status
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND auth.uid() = OLD.user_id
     AND NOT public.is_admin()
  THEN
    RAISE EXCEPTION 'pilots cannot change approval_status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pilot_approval_status ON public.pilot_profiles;
CREATE TRIGGER trg_guard_pilot_approval_status
  BEFORE UPDATE ON public.pilot_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_pilot_approval_status();
