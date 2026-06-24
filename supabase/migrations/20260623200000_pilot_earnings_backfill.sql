-- Fix: trigger antigo so disparava em transicao payment_status->paid. Quando o
-- passageiro paga via carteira ANTES de um piloto aceitar, pilot_user_id eh
-- NULL na hora do trigger, record_pilot_earning retorna sem criar earning, e
-- depois quando o piloto aceita nada acontece. Solucao:
--   1. Trigger agora dispara tambem quando pilot_user_id muda em ride ja paga
--   2. ON CONFLICT(ride_id) DO NOTHING ja existente cuida da idempotencia
--   3. Backfill cria earnings retroativos para rides que ja estao no estado
--      certo mas sem registro.

DROP TRIGGER IF EXISTS trg_record_pilot_earning ON public.rides;

CREATE TRIGGER trg_record_pilot_earning
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  WHEN (
    NEW.payment_status = 'paid'
    AND NEW.pilot_user_id IS NOT NULL
    AND (
      OLD.payment_status IS DISTINCT FROM 'paid'
      OR OLD.pilot_user_id IS DISTINCT FROM NEW.pilot_user_id
    )
  )
  EXECUTE FUNCTION public.trg_fn_record_pilot_earning();

-- Backfill: cria pilot_earnings para corridas ja pagas + com piloto atribuido
-- mas que nao tem earning ainda.
INSERT INTO public.pilot_earnings (
  ride_id,
  pilot_user_id,
  pilot_profile_id,
  gross_amount,
  commission_percent,
  tip_amount,
  status
)
SELECT
  r.id,
  r.pilot_user_id,
  pp.id,
  r.price,
  CASE WHEN pp.pilot_type = 'partner_boat' THEN 40.00 ELSE 55.00 END,
  COALESCE(r.tip, 0),
  'pending'
FROM public.rides r
JOIN public.pilot_profiles pp ON pp.user_id = r.pilot_user_id
WHERE r.payment_status = 'paid'
  AND r.pilot_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.pilot_earnings pe WHERE pe.ride_id = r.id
  );
