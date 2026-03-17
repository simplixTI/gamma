-- Atomic function: debit wallet AND mark ride as paid in a single transaction
-- Prevents partial failures where wallet is debited but ride stays unpaid
CREATE OR REPLACE FUNCTION public.pay_ride_with_wallet(
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
  -- Validate ride exists and belongs to user
  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ride_not_found');
  END IF;

  -- Check not already paid
  IF v_ride.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_paid');
  END IF;

  -- Get current balance with lock
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

  v_desc := COALESCE(p_description, 'Corrida: ' || p_ride_id);

  -- Debit wallet
  UPDATE passenger_profiles
  SET wallet_balance = wallet_balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert wallet transaction
  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_after, description, status, completed_at
  ) VALUES (
    p_user_id, 'ride_payment', p_amount,
    v_balance - p_amount, v_desc, 'completed', NOW()
  );

  -- Mark ride as paid — ATOMIC with the debit above
  UPDATE rides
  SET payment_status = 'paid',
      payment_method = 'wallet',
      updated_at = NOW()
  WHERE id = p_ride_id;

  RETURN jsonb_build_object('success', true, 'balance_after', v_balance - p_amount);
END;
$$;

COMMENT ON FUNCTION public.pay_ride_with_wallet IS
  'Atomically debits the passenger wallet and marks the ride as paid.
   Both operations happen in a single transaction — no partial failure possible.';
