-- Migration: pilot_earnings table + commission system
-- Creates earnings ledger for pilots with automatic commission deduction

-- 1. Create pilot_earnings table
CREATE TABLE IF NOT EXISTS public.pilot_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  pilot_user_id UUID NOT NULL REFERENCES auth.users(id),
  pilot_profile_id UUID NOT NULL REFERENCES public.pilot_profiles(id),
  gross_amount NUMERIC(10,2) NOT NULL CHECK (gross_amount >= 0),
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  net_amount NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(gross_amount * (100 - commission_percent) / 100, 2)) STORED,
  tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tip_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'disputed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  UNIQUE (ride_id)
);

-- 2. Enable RLS
ALTER TABLE public.pilot_earnings ENABLE ROW LEVEL SECURITY;

-- 3. Policy: pilots can read their own earnings
CREATE POLICY "pilot_earnings_pilot_select"
  ON public.pilot_earnings
  FOR SELECT
  TO authenticated
  USING (pilot_user_id = auth.uid());

-- 4. Policy: service_role can do everything (bypasses RLS by default, but explicit for clarity)
CREATE POLICY "pilot_earnings_service_role_all"
  ON public.pilot_earnings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_pilot_earnings_pilot_user_id ON public.pilot_earnings (pilot_user_id);
CREATE INDEX IF NOT EXISTS idx_pilot_earnings_status ON public.pilot_earnings (status);
CREATE INDEX IF NOT EXISTS idx_pilot_earnings_created_at ON public.pilot_earnings (created_at DESC);

-- 6. Function: record_pilot_earning (idempotent via ON CONFLICT DO NOTHING)
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
  v_commission NUMERIC(5,2) := 20.00;
BEGIN
  -- Read ride data
  SELECT
    r.price,
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

  -- Attempt to read commission from platform_config (if table exists)
  BEGIN
    SELECT value::NUMERIC(5,2)
    INTO v_commission
    FROM public.platform_config
    WHERE key = 'pilot_commission_percent'
    LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    v_commission := 20.00; -- default fallback
  END;

  -- Insert earning record (idempotent)
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

-- 7. Trigger: auto-record earning when payment_status transitions to 'paid'
CREATE OR REPLACE FUNCTION public.trg_fn_record_pilot_earning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.record_pilot_earning(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_pilot_earning ON public.rides;

CREATE TRIGGER trg_record_pilot_earning
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid')
  EXECUTE FUNCTION public.trg_fn_record_pilot_earning();
