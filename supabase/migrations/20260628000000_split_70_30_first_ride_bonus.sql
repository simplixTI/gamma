-- Split 70/30 default + bonus de 30% off na primeira corrida.
--
-- - DEFAULT split: 70% piloto/barqueiro, 30% plataforma (Gamma).
-- - Excecao: pilot_type='pilot' (funcionario Gamma) mantem split 45/45/10 -
--   admin reclassifica via /admin/users quando aplicavel.
-- - Todo novo passageiro ganha 1 cupom de 30% off (earned_from_user_id=NULL,
--   marcado como "bonus boas-vindas"). Plataforma absorve o desconto via
--   gross_price >> price na hora de pagar o piloto. Pilot recebe sobre o gross.

-- 1. Atualiza platform_config para novo default
UPDATE public.platform_config SET value = '70', updated_at = NOW() WHERE key = 'pilot_percent';
UPDATE public.platform_config SET value = '30', updated_at = NOW() WHERE key = 'simplix_percent';
UPDATE public.platform_config SET value = '0',  updated_at = NOW() WHERE key = 'owners_percent';

INSERT INTO public.platform_config (key, value, description) VALUES
  ('pilot_percent',   '70', 'Percentual do piloto/barqueiro por corrida (default partner_boat)'),
  ('simplix_percent', '30', 'Taxa Gamma (plataforma) por corrida (default)'),
  ('owners_percent',  '0',  'Repasse para dono Gamma (apenas pilot_type=pilot)')
ON CONFLICT (key) DO NOTHING;

-- 2. record_pilot_earning agora aplica commission 30% para partner_boat e
--    mantem 55% para pilots Gamma classificados pelo admin.
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
  -- Usa gross_price (preserva piloto contra descontos de cupom)
  SELECT
    COALESCE(r.gross_price, r.price),
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
    RETURN;
  END IF;

  v_commission := CASE
    WHEN v_pilot_type = 'pilot' THEN 55.00  -- funcionario Gamma: 45% piloto + 45% dono + 10% Simplix
    ELSE 30.00                              -- partner_boat (default): 70% piloto / 30% Gamma
  END;

  INSERT INTO public.pilot_earnings (
    ride_id, pilot_user_id, pilot_profile_id, gross_amount,
    commission_percent, tip_amount, status
  ) VALUES (
    p_ride_id, v_pilot_user_id, v_pilot_profile_id, v_price,
    v_commission, v_tip, 'pending'
  )
  ON CONFLICT (ride_id) DO NOTHING;
END;
$$;

-- 3. Trigger: ao criar passageiro, premia com 1 cupom de 30% off na primeira corrida
CREATE OR REPLACE FUNCTION public.award_first_ride_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- So insere se ainda nao tiver nenhum cupom (idempotente).
  IF NOT EXISTS (
    SELECT 1 FROM public.referral_discounts
    WHERE passenger_user_id = NEW.user_id
  ) THEN
    INSERT INTO public.referral_discounts (
      passenger_user_id, discount_percent, is_used, earned_from_user_id
    ) VALUES (
      NEW.user_id, 30, false, NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_first_ride_bonus ON public.passenger_profiles;
CREATE TRIGGER trg_award_first_ride_bonus
  AFTER INSERT ON public.passenger_profiles
  FOR EACH ROW EXECUTE FUNCTION public.award_first_ride_bonus();

-- 4. Backfill: passageiros sem nenhum cupom recebem o bonus retroativo.
INSERT INTO public.referral_discounts (passenger_user_id, discount_percent, is_used, earned_from_user_id)
SELECT pp.user_id, 30, false, NULL
FROM public.passenger_profiles pp
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_discounts rd WHERE rd.passenger_user_id = pp.user_id
);
