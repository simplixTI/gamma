CREATE OR REPLACE FUNCTION cancel_ride_by_pilot(
  p_ride_id UUID,
  p_pilot_user_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, cancellation_fee NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride RECORD;
  v_minutes_since_creation NUMERIC;
  v_cancellation_fee NUMERIC;
BEGIN
  SELECT id, pilot_user_id, status, created_at
  INTO v_ride
  FROM rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Corrida não encontrada.'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_ride.pilot_user_id IS DISTINCT FROM p_pilot_user_id THEN
    RETURN QUERY SELECT FALSE, 'Você não tem permissão para cancelar esta corrida.'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_ride.status NOT IN ('pending', 'accepted', 'pilot_arriving') THEN
    RETURN QUERY SELECT FALSE, ('Não é possível cancelar uma corrida com status: ' || v_ride.status)::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  v_minutes_since_creation := EXTRACT(EPOCH FROM (now() - v_ride.created_at)) / 60.0;

  IF v_minutes_since_creation > 3 THEN
    v_cancellation_fee := 3.50;
  ELSE
    v_cancellation_fee := 0;
  END IF;

  UPDATE rides
  SET
    status = 'cancelled',
    cancellation_fee = v_cancellation_fee,
    cancelled_at = now(),
    cancelled_by = 'pilot'
  WHERE id = p_ride_id;

  RETURN QUERY SELECT TRUE, 'Corrida cancelada com sucesso.'::TEXT, v_cancellation_fee;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_ride_by_pilot(UUID, UUID) TO authenticated;
