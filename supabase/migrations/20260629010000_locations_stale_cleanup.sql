-- =============================================================================
-- Fix: pilotos zumbi aparecendo como online na home do passageiro.
--
-- Bug: quando o piloto matava o app abruptamente (kill no task switcher,
-- OS matando por memoria, perda de sinal), o cleanup do hook usePilotGPS
-- nao rodava e a row em locations ficava com is_available=true para sempre.
-- O passageiro via "barcos online" que estavam fora do app ha horas.
--
-- Fix:
-- 1. Funcao public.mark_stale_locations_offline() marca como offline qualquer
--    row com updated_at mais velho que 2 minutos.
-- 2. UPDATE imediato para limpar os zumbis atuais.
-- 3. Trigger BEFORE INSERT em rides para rodar a limpeza no flow do passageiro.
-- 4. Tenta agendar via pg_cron a cada 1 minuto (se a extensao estiver disponivel).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mark_stale_locations_offline()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.locations
  SET is_available = false,
      heading = NULL,
      speed = NULL
  WHERE is_available = true
    AND updated_at < (now() - interval '2 minutes');

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

COMMENT ON FUNCTION public.mark_stale_locations_offline IS
  'Marca como offline qualquer location com is_available=true e updated_at > 2 min. Returns row count.';

-- Cleanup imediato dos zumbis atuais
SELECT public.mark_stale_locations_offline();

-- Hook na criacao de corrida: garante que zumbis sejam limpos sempre que um
-- passageiro inicia o flow de pedir barco. Defesa em profundidade caso o
-- usuario nao tenha pg_cron configurado.
CREATE OR REPLACE FUNCTION public.tg_cleanup_stale_locations_on_ride()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.mark_stale_locations_offline();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_stale_locations ON public.rides;
CREATE TRIGGER trg_cleanup_stale_locations
  BEFORE INSERT ON public.rides
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.tg_cleanup_stale_locations_on_ride();

-- Opcional: agendar via pg_cron se a extensao estiver disponivel.
-- Roda a cada 1 minuto e mantem os zumbis fora do mapa.
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove job antigo (idempotente) se existir
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-stale-locations-offline') THEN
      PERFORM cron.unschedule('mark-stale-locations-offline');
    END IF;
    PERFORM cron.schedule(
      'mark-stale-locations-offline',
      '* * * * *',
      $job$ SELECT public.mark_stale_locations_offline(); $job$
    );
  END IF;
END;
$cron$;
