-- Referral system
-- Each passenger gets a unique referral_code on signup
-- When someone signs up using a referral code, the referrer earns one 30% discount coupon

-- 1. Add referral_code column to passenger_profiles
ALTER TABLE passenger_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT; -- the referral_code of who invited them

-- 2. Generate referral codes for existing users
UPDATE passenger_profiles
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- 3. Referral discounts table — one row per earned coupon
CREATE TABLE IF NOT EXISTS referral_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_percent INTEGER NOT NULL DEFAULT 30,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_on_ride_id UUID REFERENCES rides(id),
  earned_from_user_id UUID REFERENCES auth.users(id), -- who signed up with their code
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- 4. RLS
ALTER TABLE referral_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passengers_own_discounts" ON referral_discounts
  FOR ALL USING (passenger_user_id = auth.uid());

-- 5. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_referral_discounts_passenger ON referral_discounts(passenger_user_id) WHERE is_used = FALSE;
CREATE INDEX IF NOT EXISTS idx_passenger_profiles_referral_code ON passenger_profiles(referral_code);
