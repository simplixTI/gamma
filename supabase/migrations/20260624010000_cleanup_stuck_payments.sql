-- Cron job que marca como 'failed' pagamentos parados em 'processing'/'pending'/
-- 'in_process' por mais de 30 minutos. Tambem cancela a ride associada se ainda
-- estiver pending. Roda a cada 10 min via pg_cron.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_stuck_payments()
RETURNS TABLE(payments_cleaned INT, rides_cancelled INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay_count INT;
  v_ride_count INT;
BEGIN
  -- 1. Pagamentos parados ha mais de 30 min viram 'failed'
  -- (tabela payments nao tem updated_at, so muda status)
  WITH updated AS (
    UPDATE public.payments
    SET status = 'failed'
    WHERE status IN ('processing', 'pending', 'in_process')
      AND created_at < NOW() - INTERVAL '30 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_pay_count FROM updated;

  -- 2. Rides com pagamento parado + ride ainda pendente viram 'cancelled'
  WITH cancelled AS (
    UPDATE public.rides
    SET status = 'cancelled',
        payment_status = 'failed',
        updated_at = NOW()
    WHERE status = 'pending'
      AND payment_status IN ('pending', 'processing', 'in_process')
      AND created_at < NOW() - INTERVAL '30 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_ride_count FROM cancelled;

  RETURN QUERY SELECT v_pay_count, v_ride_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_stuck_payments IS
  'Roda via pg_cron a cada 10 min. Marca pagamentos stuck > 30min como failed '
  'e cancela rides associadas. Retorna contagem do que foi limpo.';

-- Remove agendamento antigo (idempotencia)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-stuck-payments');
EXCEPTION WHEN OTHERS THEN
  -- ignora se nao existia
  NULL;
END $$;

-- Agenda a cada 10 minutos
SELECT cron.schedule(
  'cleanup-stuck-payments',
  '*/10 * * * *',
  $$SELECT public.cleanup_stuck_payments()$$
);

-- Roda uma vez ja pra limpar o que esta parado AGORA
SELECT public.cleanup_stuck_payments();
