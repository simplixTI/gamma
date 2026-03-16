-- =============================================================================
-- Security Audit Fixes — 2026-03-16
-- Addresses all findings from full security audit:
--   1. pier_prices: add RLS (currently wide open to all authenticated users)
--   2. payment_audit_log: add admin read policy
--   3. validate_ride_price trigger: add SECURITY DEFINER + search_path
--   4. set_default_card: add caller ownership check to prevent IDOR
--   5. pilots_own_update: explicitly block approval_status changes from pilots
--   6. accept_pool_ride: add caller authentication check
--   7. cancel_ride_by_pilot: add stricter pilot ownership validation using auth.uid()
--   8. credit_wallet: add caller-is-service-role guard
--   9. get_ride_price: already SECURITY DEFINER (confirmed)
-- =============================================================================


-- =============================================================================
-- 1. pier_prices: Enable RLS — table was missing RLS entirely
--    Any authenticated user could read/write all pricing rows.
-- =============================================================================
ALTER TABLE public.pier_prices ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read prices (needed for ride price calculation in UI)
CREATE POLICY "pier_prices_authenticated_read"
  ON public.pier_prices FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify pricing
CREATE POLICY "pier_prices_admin_all"
  ON public.pier_prices FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- 2. payment_audit_log: add admin read policy
--    Admins need to review payment audit trail.
-- =============================================================================
CREATE POLICY "admin_payment_audit_log_read"
  ON public.payment_audit_log FOR SELECT
  USING (public.is_admin());


-- =============================================================================
-- 3. validate_ride_price trigger function: add SECURITY DEFINER + search_path
--    Without SECURITY DEFINER the trigger runs as the invoking user, which can
--    allow search_path manipulation attacks.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validate_ride_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  origin_id        TEXT;
  dest_id          TEXT;
  per_person_price NUMERIC;
  expected_price   NUMERIC;
  passenger_count  INTEGER;
BEGIN
  origin_id       := NEW.origin_pier_id;
  dest_id         := NEW.destination_pier_id;
  passenger_count := COALESCE(NEW.passenger_count, 1);

  -- Only validate if both pier IDs are present
  IF origin_id IS NULL OR dest_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up authoritative per-person price; falls back to 5 for unknown pairs
  per_person_price := public.get_ride_price(origin_id, dest_id);

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

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS trg_validate_ride_price ON public.rides;
CREATE TRIGGER trg_validate_ride_price
  BEFORE INSERT ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.validate_ride_price();


-- =============================================================================
-- 4. set_default_card: enforce caller = p_user_id to prevent IDOR
--    Previously any authenticated user could call set_default_card(victim_id, card_id)
--    and change another user's default card.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_default_card(p_user_id uuid, p_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Callers can only change their own default card
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'set_default_card: permission denied'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.saved_cards
  SET is_default = (id = p_card_id)
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_card(uuid, uuid) TO authenticated;


-- =============================================================================
-- 5. pilot_profiles UPDATE: explicitly prevent pilots from self-approving
--    The admin update policy grants admins full update access. The pilots' own
--    update policy must exclude the approval fields.
-- =============================================================================
DROP POLICY IF EXISTS "Pilots update own profile" ON public.pilot_profiles;

CREATE POLICY "Pilots update own profile"
  ON public.pilot_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Pilots cannot change their own approval_status, reviewed_by, or reviewed_at
    AND approval_status = (SELECT approval_status FROM public.pilot_profiles WHERE user_id = auth.uid())
    AND (reviewed_by IS NOT DISTINCT FROM (SELECT reviewed_by FROM public.pilot_profiles WHERE user_id = auth.uid()))
    AND (reviewed_at IS NOT DISTINCT FROM (SELECT reviewed_at FROM public.pilot_profiles WHERE user_id = auth.uid()))
  );


-- =============================================================================
-- 6. accept_pool_ride: validate that p_pilot_user_id matches auth.uid()
--    Without this check, a pilot can pass any other pilot's user_id and steal
--    their capacity counter or accept a ride on their behalf.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.accept_pool_ride(
  p_ride_id UUID,
  p_pilot_id TEXT,
  p_pilot_user_id UUID,
  p_pilot_name TEXT,
  p_pilot_phone TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, ride JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
  v_capacity INTEGER;
  v_current INTEGER;
  v_passenger_count INTEGER;
BEGIN
  -- Enforce that the caller is the pilot they claim to be (CWE-639)
  IF auth.uid() IS DISTINCT FROM p_pilot_user_id THEN
    RETURN QUERY SELECT false, 'Não autorizado'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

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


-- =============================================================================
-- 7. cancel_ride_by_pilot: use auth.uid() instead of accepting p_pilot_id raw
--    The original uses p_pilot_id (device string) which could be spoofed.
--    Add a secondary check using auth.uid() against pilot_user_id.
-- =============================================================================
DROP FUNCTION IF EXISTS public.cancel_ride_by_pilot(uuid, uuid);
CREATE OR REPLACE FUNCTION public.cancel_ride_by_pilot(
  p_ride_id uuid,
  p_pilot_id uuid   -- kept for API compatibility but now validated against auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride            record;
  v_cancellation_fee numeric := 0;
  v_payment_status  text;
BEGIN
  -- Validate: the caller must be the pilot on this ride
  IF auth.uid() IS DISTINCT FROM p_pilot_id THEN
    RETURN json_build_object('success', false, 'error', 'not_authorized');
  END IF;

  -- Fetch ride with lock
  SELECT * INTO v_ride
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ride_not_found');
  END IF;

  -- Verify caller is actually the pilot on this ride (using pilot_user_id UUID)
  IF v_ride.pilot_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'not_authorized');
  END IF;

  IF v_ride.status NOT IN ('accepted', 'pilot_arriving', 'in_progress', 'pending') THEN
    RETURN json_build_object('success', false, 'error', 'ride_not_cancellable', 'status', v_ride.status);
  END IF;

  -- Apply cancellation fee if ride was in progress
  IF v_ride.status = 'in_progress' THEN
    v_cancellation_fee := COALESCE(v_ride.price, 0) * 0.1;
  END IF;

  UPDATE public.rides
  SET
    status             = 'cancelled',
    cancellation_fee   = v_cancellation_fee,
    cancelled_at       = now(),
    cancelled_by       = 'pilot'
  WHERE id = p_ride_id;

  -- If ride was paid, flag the payment for refund
  SELECT payment_status INTO v_payment_status FROM public.rides WHERE id = p_ride_id;
  IF COALESCE(v_payment_status, '') = 'paid' THEN
    PERFORM public.request_payment_refund(p_ride_id, 'pilot_cancelled');
  END IF;

  RETURN json_build_object('success', true, 'cancellation_fee', v_cancellation_fee);
END;
$$;


-- =============================================================================
-- 8. credit_wallet: restrict direct RPC calls to service_role only
--    The function is SECURITY DEFINER and credits wallet balances.
--    Authenticated users should never call it directly; only the webhook
--    (service_role) should. The amount > 0 guard was added in migration 009
--    but the GRANT remains open to all authenticated users.
-- =============================================================================
REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, text, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, text, uuid) TO service_role;


-- =============================================================================
-- 9. request_payment_refund: restrict to service_role — same reasoning as above
-- =============================================================================
REVOKE EXECUTE ON FUNCTION public.request_payment_refund(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.request_payment_refund(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_payment_refund(uuid, text) TO service_role;


-- =============================================================================
-- 10. Ensure saved_cards has no UPDATE for the mp_customer_id / mp_card_id columns
--     from the client — those must only be written by the edge function (service_role).
--     The existing "Users can update own cards" policy allows unrestricted updates,
--     so we lock down the sensitive MP fields by restricting what authenticated users
--     can set via a WITH CHECK that matches the existing values for those columns.
-- =============================================================================
DROP POLICY IF EXISTS "Users can update own cards" ON public.saved_cards;

CREATE POLICY "Users can update own cards"
  ON public.saved_cards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Prevent client from overwriting mp_card_id / mp_customer_id directly
    AND mp_card_id IS NOT DISTINCT FROM (SELECT mp_card_id FROM public.saved_cards WHERE id = saved_cards.id AND user_id = auth.uid())
    AND mp_customer_id IS NOT DISTINCT FROM (SELECT mp_customer_id FROM public.saved_cards WHERE id = saved_cards.id AND user_id = auth.uid())
  );
