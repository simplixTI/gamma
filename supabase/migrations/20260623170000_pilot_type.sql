-- Tipo de piloto: 'pilot' (Gamma, split 45/45/10) ou 'partner_boat' (60/40).
-- Existentes ficam como 'pilot' por default (compat).

ALTER TABLE public.pilot_profiles
  ADD COLUMN IF NOT EXISTS pilot_type TEXT NOT NULL DEFAULT 'pilot';

ALTER TABLE public.pilot_profiles
  DROP CONSTRAINT IF EXISTS pilot_profiles_pilot_type_check;
ALTER TABLE public.pilot_profiles
  ADD CONSTRAINT pilot_profiles_pilot_type_check
  CHECK (pilot_type IN ('pilot', 'partner_boat'));

COMMENT ON COLUMN public.pilot_profiles.pilot_type IS
  'pilot = funcionario Gamma (recebe 45%, dono Gamma 45%, plataforma 10%). '
  'partner_boat = dono do proprio barco parceiro (recebe 60%, plataforma 40%).';

-- record_pilot_earning agora aplica commission baseado em pilot_type:
--   pilot       -> commission 55% -> piloto recebe 45%
--   partner_boat -> commission 40% -> parceiro recebe 60%
CREATE OR REPLACE FUNCTION public.record_pilot_earning(p_ride_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price            NUMERIC(10,2);
  v_tip              NUMERIC(10,2);
  v_pilot_user_id    UUID;
  v_pilot_profile_id UUID;
  v_pilot_type       TEXT;
  v_commission       NUMERIC(5,2);
BEGIN
  SELECT
    r.price,
    COALESCE(r.tip, 0),
    r.pilot_user_id,
    pp.id,
    pp.pilot_type
  INTO
    v_price,
    v_tip,
    v_pilot_user_id,
    v_pilot_profile_id,
    v_pilot_type
  FROM public.rides r
  LEFT JOIN public.pilot_profiles pp ON pp.user_id = r.pilot_user_id
  WHERE r.id = p_ride_id;

  IF v_pilot_user_id IS NULL THEN
    RETURN; -- corrida nao encontrada ou sem piloto
  END IF;

  v_commission := CASE
    WHEN v_pilot_type = 'partner_boat' THEN 40.00
    ELSE 55.00
  END;

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
