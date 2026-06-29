-- Reverte o "bonus boas-vindas" de 30% off que era dado automaticamente a todo
-- passageiro novo (migration 20260628000000). Descontos voltam a vir SOMENTE
-- de indicacao real (earned_from_user_id != NULL).

DROP TRIGGER IF EXISTS trg_award_first_ride_bonus ON public.passenger_profiles;
DROP FUNCTION IF EXISTS public.award_first_ride_bonus();

-- Limpa cupons orfaos (sem indicador) ainda nao usados. Cupons ja consumidos
-- ficam por integridade historica do calculo de receita.
DELETE FROM public.referral_discounts
WHERE earned_from_user_id IS NULL
  AND is_used = false;
