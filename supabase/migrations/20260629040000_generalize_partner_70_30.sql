-- Modelo unificado: nao existe mais 'Piloto Gamma' vs 'Barco Parceiro'.
-- Todos os pilotos sao BARCO PARCEIRO com split 70/30 (70% piloto, 30% Simplix).
-- Simplifica accounting: nao ha mais dono do barco separado, nem percentuais
-- variados. Coluna pilot_type continua existindo por compat mas nao afeta calculo.

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
  v_commission       NUMERIC(5,2) := 30.00; -- fixo: piloto/parceiro recebe 70%
BEGIN
  SELECT
    COALESCE(r.gross_price, r.price),
    COALESCE(r.tip, 0),
    r.pilot_user_id,
    pp.id
  INTO
    v_price, v_tip, v_pilot_user_id, v_pilot_profile_id
  FROM public.rides r
  LEFT JOIN public.pilot_profiles pp ON pp.user_id = r.pilot_user_id
  WHERE r.id = p_ride_id;

  IF v_pilot_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.pilot_earnings (
    ride_id, pilot_user_id, pilot_profile_id,
    gross_amount, commission_percent, tip_amount, status
  ) VALUES (
    p_ride_id, v_pilot_user_id, v_pilot_profile_id,
    v_price, v_commission, v_tip, 'pending'
  )
  ON CONFLICT (ride_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.record_pilot_earning IS
  'Modelo 70/30: piloto recebe 70% do bruto, Simplix fica com 30%. '
  'Antes tinha distincao Piloto Gamma (45%) vs Barco Parceiro (60%) — removido.';

-- Padroniza commission_percent das linhas pendentes existentes
UPDATE public.pilot_earnings
SET commission_percent = 30.00
WHERE commission_percent != 30.00
  AND status = 'pending';
