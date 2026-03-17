-- Migration: revenue split 20% Simplix / 30% Piloto / 50% Donos
-- Updates pilot_earnings to use 30% pilot share and adds split breakdown columns

-- 1. Add split breakdown columns to pilot_earnings
ALTER TABLE public.pilot_earnings
  ADD COLUMN IF NOT EXISTS simplix_amount NUMERIC(10,2)
    GENERATED ALWAYS AS (ROUND(gross_amount * 0.20, 2)) STORED,
  ADD COLUMN IF NOT EXISTS owners_amount NUMERIC(10,2)
    GENERATED ALWAYS AS (ROUND(gross_amount * 0.50, 2)) STORED;

-- 2. Update default commission_percent from 20 to 70 so net_amount = 30% (pilot share)
--    net_amount = gross * (100 - 70) / 100 = gross * 0.30
ALTER TABLE public.pilot_earnings
  ALTER COLUMN commission_percent SET DEFAULT 70.00;

-- 3. Create platform_config table to make split percentages configurable
CREATE TABLE IF NOT EXISTS public.platform_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default split config
INSERT INTO public.platform_config (key, value, description) VALUES
  ('pilot_percent',    '30', 'Percentual do piloto por corrida'),
  ('simplix_percent',  '20', 'Taxa Simplix por corrida'),
  ('owners_percent',   '50', 'Repasse para os donos da plataforma')
ON CONFLICT (key) DO NOTHING;

-- 4. RLS for platform_config — only admins (via service_role or admin_users) can write
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_config_public_read"
  ON public.platform_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "platform_config_service_write"
  ON public.platform_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Update record_pilot_earning function to use 30% pilot commission from config
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
  v_pilot_pct   NUMERIC(5,2) := 30.00;
  v_commission  NUMERIC(5,2);
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

  -- Read pilot percentage from config (default 30%)
  BEGIN
    SELECT value::NUMERIC(5,2)
    INTO v_pilot_pct
    FROM public.platform_config
    WHERE key = 'pilot_percent'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_pilot_pct := 30.00;
  END;

  -- commission_percent in the table = what the platform retains = 100 - pilot_pct
  v_commission := 100.00 - v_pilot_pct;

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
