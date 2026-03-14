-- Anti-fraud improvements for the referral system
-- 1. Add expires_at so discounts have a 30-day validity window
-- 2. Discount is now granted after the referred user's first completed ride (not on signup)
-- 3. A cap of 3 pending discounts per referrer is enforced at the DB level via trigger

-- Add expires_at column
ALTER TABLE public.referral_discounts
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Back-fill: existing unused discounts expire 30 days from now
UPDATE public.referral_discounts
SET expires_at = now() + INTERVAL '30 days'
WHERE is_used = false AND expires_at IS NULL;

-- Index for efficient expiry filtering
CREATE INDEX IF NOT EXISTS idx_referral_discounts_expires
  ON public.referral_discounts(expires_at)
  WHERE is_used = false;

-- Function to enforce max 3 pending (non-expired) discounts per referrer
CREATE OR REPLACE FUNCTION check_referral_discount_cap()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.referral_discounts
    WHERE passenger_user_id = NEW.passenger_user_id
      AND is_used = false
      AND (expires_at IS NULL OR expires_at > now())
  ) >= 3 THEN
    RAISE EXCEPTION 'Referral discount cap reached (max 3 pending discounts)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_referral_discount_cap ON public.referral_discounts;
CREATE TRIGGER enforce_referral_discount_cap
  BEFORE INSERT ON public.referral_discounts
  FOR EACH ROW
  EXECUTE FUNCTION check_referral_discount_cap();
