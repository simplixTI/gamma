-- Referral discount fair split: pilot always receives 45% of GROSS price.
-- Owner + Simplix absorb the discount proportionally (45:10 ratio).
-- Previously: rides.price stored the discounted amount, so pilot lost part of
-- the referral discount unfairly. New gross_price column preserves the original
-- fare for accurate pilot earnings; price keeps being what the passenger paid.

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS gross_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_discount_id UUID REFERENCES public.referral_discounts(id);

-- Sanity constraint: discount cannot exceed gross when both are set
ALTER TABLE public.rides
  DROP CONSTRAINT IF EXISTS rides_discount_amount_check;
ALTER TABLE public.rides
  ADD CONSTRAINT rides_discount_amount_check
  CHECK (discount_amount >= 0 AND (gross_price IS NULL OR discount_amount <= gross_price));

-- Update pilot earnings RPC to use gross_price for the gross_amount calculation.
-- COALESCE means rides without gross_price (historical or undiscounted) behave
-- identically to before (gross_amount = price).
CREATE OR REPLACE FUNCTION public.record_pilot_earning(p_ride_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC(10,2);
  v_tip   NUMERIC(10,2);
  v_pilot_user_id UUID;
  v_pilot_profile_id UUID;
  v_pilot_pct   NUMERIC(5,2) := 45.00;
  v_commission  NUMERIC(5,2);
BEGIN
  -- Pilot share is computed on the GROSS price (pre-discount) so the pilot
  -- is paid in full regardless of referral discounts.
  SELECT
    COALESCE(r.gross_price, r.price),
    COALESCE(r.tip, 0),
    r.pilot_user_id,
    pp.id
  INTO
    v_price,
    v_tip,
    v_pilot_user_id,
    v_pilot_profile_id
  FROM public.rides r
  LEFT JOIN public.pilot_profiles pp ON pp.user_id = r.pilot_user_id
  WHERE r.id = p_ride_id;

  IF v_pilot_user_id IS NULL THEN
    RETURN; -- ride not found or no pilot assigned
  END IF;

  BEGIN
    SELECT value::NUMERIC(5,2)
    INTO v_pilot_pct
    FROM public.platform_config
    WHERE key = 'pilot_percent'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_pilot_pct := 45.00;
  END;

  v_commission := 100.00 - v_pilot_pct;

  INSERT INTO public.pilot_earnings (
    ride_id,
    pilot_user_id,
    pilot_profile_id,
    gross_amount,
    commission_percent,
    tip_amount,
    status
  ) VALUES (
    p_ride_id,
    v_pilot_user_id,
    v_pilot_profile_id,
    v_price,
    v_commission,
    v_tip,
    'pending'
  )
  ON CONFLICT (ride_id) DO NOTHING;
END;
$$;
