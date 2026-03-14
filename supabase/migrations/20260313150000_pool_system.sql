-- Pool/circular boat system
-- Adds passenger_count to rides, boat_capacity + pool tracking to pilot_profiles
-- Also adds route_order_origin/destination for direction filtering

-- rides: store actual passenger count (was only frontend-computed before)
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS passenger_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS origin_pier_id TEXT,
  ADD COLUMN IF NOT EXISTS destination_pier_id TEXT;

-- pilot_profiles: boat capacity and current pool state
ALTER TABLE public.pilot_profiles
  ADD COLUMN IF NOT EXISTS boat_capacity INTEGER NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS current_passengers INTEGER NOT NULL DEFAULT 0;

-- View: how many passengers are currently on each pilot's boat
-- (sum of passenger_count for rides in accepted/pilot_arriving/in_progress)
CREATE OR REPLACE VIEW public.pilot_active_passengers AS
SELECT
  pilot_user_id,
  COALESCE(SUM(passenger_count), 0)::INTEGER AS active_passengers
FROM public.rides
WHERE status IN ('accepted', 'pilot_arriving', 'in_progress')
  AND pilot_user_id IS NOT NULL
GROUP BY pilot_user_id;

-- Function: safely accept a pool ride (atomic capacity check + accept)
CREATE OR REPLACE FUNCTION public.accept_pool_ride(
  p_ride_id UUID,
  p_pilot_id TEXT,
  p_pilot_user_id UUID,
  p_pilot_name TEXT,
  p_pilot_phone TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, ride JSONB)
LANGUAGE plpgsql
AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
  v_capacity INTEGER;
  v_current INTEGER;
  v_passenger_count INTEGER;
BEGIN
  -- Lock the ride row
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Corrida não encontrada'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF v_ride.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Corrida já foi aceita por outro piloto'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  -- Get pilot capacity
  SELECT boat_capacity INTO v_capacity
  FROM public.pilot_profiles
  WHERE user_id = p_pilot_user_id;

  IF v_capacity IS NULL THEN
    v_capacity := 16;
  END IF;

  -- Get current passengers on boat
  SELECT COALESCE(SUM(r.passenger_count), 0)::INTEGER INTO v_current
  FROM public.rides r
  WHERE r.pilot_user_id = p_pilot_user_id
    AND r.status IN ('accepted', 'pilot_arriving', 'in_progress');

  v_passenger_count := v_ride.passenger_count;

  IF (v_current + v_passenger_count) > v_capacity THEN
    RETURN QUERY SELECT false,
      format('Capacidade insuficiente: %s/%s lugares disponíveis', v_capacity - v_current, v_capacity)::TEXT,
      NULL::JSONB;
    RETURN;
  END IF;

  -- Accept the ride
  UPDATE public.rides
  SET
    status = 'accepted',
    pilot_id = p_pilot_id,
    pilot_user_id = p_pilot_user_id,
    pilot_name = p_pilot_name,
    pilot_phone = p_pilot_phone,
    accepted_at = now()
  WHERE id = p_ride_id;

  -- Update pilot's current_passengers counter
  UPDATE public.pilot_profiles
  SET current_passengers = v_current + v_passenger_count
  WHERE user_id = p_pilot_user_id;

  SELECT row_to_json(r)::JSONB INTO v_ride FROM public.rides r WHERE r.id = p_ride_id;

  RETURN QUERY SELECT true, 'Corrida aceita com sucesso'::TEXT, row_to_json(v_ride)::JSONB;
END;
$$;

-- Function: release passengers when a pool ride completes/cancels
CREATE OR REPLACE FUNCTION public.release_pool_ride(
  p_ride_id UUID,
  p_pilot_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_passenger_count INTEGER;
BEGIN
  SELECT passenger_count INTO v_passenger_count FROM public.rides WHERE id = p_ride_id;

  IF v_passenger_count IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.pilot_profiles
  SET current_passengers = GREATEST(0, current_passengers - v_passenger_count)
  WHERE user_id = p_pilot_user_id;
END;
$$;

-- Trigger: auto-release passengers when a ride becomes completed or cancelled
CREATE OR REPLACE FUNCTION public.trg_release_pool_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only trigger on status transitions TO completed or cancelled
  IF NEW.status IN ('completed', 'cancelled')
     AND OLD.status NOT IN ('completed', 'cancelled')
     AND NEW.pilot_user_id IS NOT NULL THEN
    PERFORM public.release_pool_ride(NEW.id, NEW.pilot_user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_pool_on_complete ON public.rides;
CREATE TRIGGER trg_release_pool_on_complete
  AFTER UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.trg_release_pool_on_complete();
