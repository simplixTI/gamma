-- ============================================================
-- Security fixes: pool lock + price validation
-- ============================================================

-- 1. Fix accept_pool_ride: add pessimistic lock on pilot_profiles
--    to prevent race condition when two rides arrive simultaneously
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
  -- Lock the ride row first
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Corrida não encontrada'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF v_ride.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Corrida já foi aceita por outro piloto'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  -- Lock pilot_profiles row to prevent concurrent capacity overflow
  SELECT boat_capacity INTO v_capacity
  FROM public.pilot_profiles
  WHERE user_id = p_pilot_user_id
  FOR UPDATE;

  IF v_capacity IS NULL THEN
    v_capacity := 16;
  END IF;

  -- Count active passengers while holding the lock
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

-- 2. Price validation trigger: reject rides with wrong price
--    Prevents frontend price manipulation fraud
CREATE OR REPLACE FUNCTION public.validate_ride_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  -- Pricing rules (mirrors src/data/pricingData.ts PRICE_TABLE)
  -- Zone A piers (R$10): 7=PASSARELA, 18=JACARÉ, 19=INVASÃO
  -- Zone B piers (R$6):  17=CANAL ILHA PRIMEIRA, 23=DOWNTOWN, 24=HORTIFRUTI
  zone_a TEXT[] := ARRAY['7','18','19'];
  zone_b TEXT[] := ARRAY['17','23','24'];
  origin_id TEXT;
  dest_id TEXT;
  expected_price NUMERIC;
  per_person_price NUMERIC;
  passenger_count INTEGER;
BEGIN
  origin_id := NEW.origin_pier_id;
  dest_id   := NEW.destination_pier_id;
  passenger_count := COALESCE(NEW.passenger_count, 1);

  -- Only validate if both pier IDs are present
  IF origin_id IS NULL OR dest_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate per-person price using zone rules
  IF origin_id = ANY(zone_a) OR dest_id = ANY(zone_a) THEN
    per_person_price := 10;
  ELSIF origin_id = ANY(zone_b) OR dest_id = ANY(zone_b) THEN
    per_person_price := 6;
  ELSE
    -- Default moradores price (simplified: R$5 fallback)
    -- Full distance-based logic would require the distance table here
    per_person_price := 5;
  END IF;

  expected_price := per_person_price * passenger_count;

  -- Allow up to R$0.01 rounding difference
  IF ABS(NEW.price - expected_price) > 0.01 THEN
    RAISE EXCEPTION 'Preço inválido: esperado R$%, recebido R$%',
      expected_price, NEW.price
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ride_price ON public.rides;
CREATE TRIGGER trg_validate_ride_price
  BEFORE INSERT ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.validate_ride_price();

-- 3. Add composite indexes for webhook lookups (performance)
CREATE INDEX IF NOT EXISTS idx_rides_mp_pending
  ON public.rides (id)
  WHERE payment_status IN ('pending', 'processing');

-- 4. Add CHECK constraint to prevent negative wallet balances
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS chk_balance_after_non_negative;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT chk_balance_after_non_negative
  CHECK (balance_after >= 0);
