-- Fix: add FOR UPDATE lock on pilot_profiles in accept_pool_ride to prevent
-- concurrent pilots from racing past the capacity check and over-booking the boat.
-- Previously only the ride row was locked; pilot_profiles was read without a lock,
-- so two simultaneous accepts could both read the same v_current value, both pass
-- the capacity check, and together exceed boat_capacity.

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
  v_pilot public.pilot_profiles%ROWTYPE;
  v_capacity INTEGER;
  v_current INTEGER;
  v_passenger_count INTEGER;
BEGIN
  -- Lock the ride row to prevent two pilots accepting the same ride
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Corrida não encontrada'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF v_ride.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Corrida já foi aceita por outro piloto'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  -- Lock pilot_profiles row so concurrent accepts by the same pilot serialize here.
  -- This prevents the TOCTOU race where two requests both read the same v_current
  -- before either has written the updated value back.
  SELECT * INTO v_pilot
  FROM public.pilot_profiles
  WHERE user_id = p_pilot_user_id
  FOR UPDATE;

  v_capacity := COALESCE(v_pilot.boat_capacity, 16);

  -- Re-compute current passengers under the lock to get a consistent value
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

  -- Update pilot's current_passengers counter (safe under the FOR UPDATE lock)
  UPDATE public.pilot_profiles
  SET current_passengers = v_current + v_passenger_count
  WHERE user_id = p_pilot_user_id;

  SELECT row_to_json(r)::JSONB INTO v_ride FROM public.rides r WHERE r.id = p_ride_id;

  RETURN QUERY SELECT true, 'Corrida aceita com sucesso'::TEXT, row_to_json(v_ride)::JSONB;
END;
$$;
