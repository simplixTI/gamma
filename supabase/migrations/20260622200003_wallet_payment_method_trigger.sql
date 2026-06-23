-- Wallet payment tracking via trigger (decoupled from pay_ride_with_wallet).
--
-- Background: pay_ride_with_wallet originally set rides.payment_method='wallet'
-- directly, but PgBouncer connection pool cached an old plan from before the
-- column existed, causing PG 42703 "column does not exist" errors even after
-- ALTER TABLE. Workaround: keep pay_ride_with_wallet free of any
-- rides.payment_method reference, and let this trigger (a NEW function with
-- no cached plan) set the column on every wallet ride_payment insert.

CREATE OR REPLACE FUNCTION public.set_ride_wallet_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'ride_payment' AND NEW.ride_id IS NOT NULL THEN
    UPDATE public.rides
    SET payment_method = 'wallet'
    WHERE id = NEW.ride_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ride_wallet_payment ON public.wallet_transactions;
CREATE TRIGGER trg_set_ride_wallet_payment
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ride_wallet_payment();

-- Drop and recreate pay_ride_with_wallet without the rides.payment_method line.
-- The trigger above handles that field now.
DROP FUNCTION IF EXISTS public.pay_ride_with_wallet(uuid, uuid, numeric, text);

CREATE FUNCTION public.pay_ride_with_wallet(
  p_user_id    UUID,
  p_ride_id    UUID,
  p_amount     NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_ride    rides%ROWTYPE;
  v_desc    TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  SELECT * INTO v_ride FROM rides
  WHERE id = p_ride_id AND passenger_user_id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ride_not_found');
  END IF;

  IF v_ride.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_paid');
  END IF;

  SELECT wallet_balance INTO v_balance FROM passenger_profiles
  WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance',
                              'balance', v_balance, 'required', p_amount);
  END IF;

  v_desc := COALESCE(p_description, 'Corrida: ' || p_ride_id);

  UPDATE passenger_profiles
  SET wallet_balance = wallet_balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_after, ride_id, description, status, completed_at
  ) VALUES (
    p_user_id, 'ride_payment', p_amount, v_balance - p_amount,
    p_ride_id, v_desc, 'completed', NOW()
  );

  UPDATE rides
  SET payment_status = 'paid', updated_at = NOW()
  WHERE id = p_ride_id;

  RETURN jsonb_build_object('success', true, 'balance_after', v_balance - p_amount);
END;
$$;
