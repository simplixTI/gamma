-- Atomic function: debit wallet for a tip AND record it on the ride
-- Companion to pay_ride_with_wallet, but specifically for tips given after the ride is already paid.
-- Fixes accounting bug where rides.tip was updated without any actual charge.
CREATE OR REPLACE FUNCTION public.tip_ride_with_wallet(
  p_user_id UUID,
  p_ride_id UUID,
  p_amount  NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_ride    rides%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ride_not_found');
  END IF;

  IF v_ride.payment_status <> 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ride_not_paid');
  END IF;

  IF v_ride.tip IS NOT NULL AND v_ride.tip > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'tip_already_given');
  END IF;

  SELECT wallet_balance INTO v_balance
  FROM passenger_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance',
      'balance', v_balance, 'required', p_amount);
  END IF;

  UPDATE passenger_profiles
  SET wallet_balance = wallet_balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_after, description, status, completed_at
  ) VALUES (
    p_user_id, 'tip', p_amount,
    v_balance - p_amount,
    'Gorjeta corrida: ' || p_ride_id,
    'completed', NOW()
  );

  UPDATE rides
  SET tip = p_amount,
      updated_at = NOW()
  WHERE id = p_ride_id;

  RETURN jsonb_build_object('success', true, 'balance_after', v_balance - p_amount);
END;
$$;

COMMENT ON FUNCTION public.tip_ride_with_wallet IS
  'Atomically debits passenger wallet for a tip and records it on the ride.
   Only works on already-paid rides without an existing tip.';

GRANT EXECUTE ON FUNCTION public.tip_ride_with_wallet(UUID, UUID, NUMERIC) TO authenticated;
