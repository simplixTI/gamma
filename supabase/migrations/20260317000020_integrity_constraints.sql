-- ============================================================
-- Migration: Data integrity constraints & security fixes
-- Date: 2026-03-17
-- ============================================================

-- 1. WALLET BALANCE: Prevent negative balances at DB level
ALTER TABLE public.passenger_profiles
  DROP CONSTRAINT IF EXISTS wallet_balance_non_negative;
ALTER TABLE public.passenger_profiles
  ADD CONSTRAINT wallet_balance_non_negative CHECK (wallet_balance >= 0);

-- 2. RATINGS: Enforce valid 1–5 range on profile averages
ALTER TABLE public.pilot_profiles
  DROP CONSTRAINT IF EXISTS pilot_rating_range;
ALTER TABLE public.pilot_profiles
  ADD CONSTRAINT pilot_rating_range CHECK (rating >= 1.0 AND rating <= 5.0);

ALTER TABLE public.passenger_profiles
  DROP CONSTRAINT IF EXISTS passenger_rating_range;
ALTER TABLE public.passenger_profiles
  ADD CONSTRAINT passenger_rating_range CHECK (rating >= 1.0 AND rating <= 5.0);

-- 3. TIP: Add column if missing, prevent negative
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS tip NUMERIC DEFAULT 0;
ALTER TABLE public.rides
  DROP CONSTRAINT IF EXISTS rides_tip_non_negative;
ALTER TABLE public.rides
  ADD CONSTRAINT rides_tip_non_negative CHECK (tip IS NULL OR tip >= 0);

-- 4. CANCELLATION FEE: Add column if missing, default to 0, prevent negative
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC DEFAULT 0.00;
ALTER TABLE public.rides
  ALTER COLUMN cancellation_fee SET DEFAULT 0.00;
ALTER TABLE public.rides
  DROP CONSTRAINT IF EXISTS rides_cancellation_fee_non_negative;
ALTER TABLE public.rides
  ADD CONSTRAINT rides_cancellation_fee_non_negative CHECK (cancellation_fee IS NULL OR cancellation_fee >= 0);

-- 5. RIDE_MESSAGES RLS: Restrict to ride participants only
-- Drop overly permissive legacy policies
DROP POLICY IF EXISTS "Anyone can view messages for rides they are part of" ON public.ride_messages;
DROP POLICY IF EXISTS "Anyone can send messages" ON public.ride_messages;
DROP POLICY IF EXISTS "Participants can view ride messages" ON public.ride_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.ride_messages;
DROP POLICY IF EXISTS "ride_messages_participant_select" ON public.ride_messages;
DROP POLICY IF EXISTS "ride_messages_participant_insert" ON public.ride_messages;

CREATE POLICY "ride_messages_participant_select"
  ON public.ride_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = ride_id
        AND (r.passenger_user_id = auth.uid() OR r.pilot_user_id = auth.uid())
    )
  );

-- ride_messages has no sender_id column (uses sender_device_id + sender_type).
-- Restrict inserts to authenticated ride participants only.
CREATE POLICY "ride_messages_participant_insert"
  ON public.ride_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = ride_id
        AND (r.passenger_user_id = auth.uid() OR r.pilot_user_id = auth.uid())
    )
  );

-- 6. Compound index for admin pilot approval workflow
CREATE INDEX IF NOT EXISTS idx_pilot_profiles_approval_submitted
  ON public.pilot_profiles(approval_status, submitted_at DESC NULLS LAST);

-- 7. Drop legacy overly-permissive rides INSERT policy if still present
DROP POLICY IF EXISTS "Anyone can create rides" ON public.rides;
