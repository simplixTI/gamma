-- Voucher agora credita saldo na carteira direto, em vez de virar desconto
-- de uma corrida so. Sponsor paga no momento do resgate; usuario gasta o
-- credito em quantas corridas quiser. Modelo gift-card.

CREATE OR REPLACE FUNCTION public.redeem_voucher(p_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher     vouchers%ROWTYPE;
  v_new_balance NUMERIC(10,2);
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_code');
  END IF;
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_user');
  END IF;

  SELECT * INTO v_voucher
  FROM public.vouchers
  WHERE UPPER(code) = UPPER(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'voucher_not_found');
  END IF;
  IF v_voucher.is_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;
  IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  -- 1. Marca voucher como usado
  UPDATE public.vouchers
  SET is_used = true,
      used_by = p_user_id,
      used_at = NOW()
  WHERE id = v_voucher.id;

  -- 2. Credita saldo da carteira
  UPDATE public.passenger_profiles
  SET wallet_balance = wallet_balance + v_voucher.value
  WHERE user_id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  -- 3. Registra no extrato
  INSERT INTO public.wallet_transactions
    (user_id, type, amount, balance_after, description, status, completed_at)
  VALUES
    (p_user_id, 'topup', v_voucher.value, v_new_balance,
     'Voucher ' || v_voucher.code, 'completed', NOW());

  RETURN jsonb_build_object(
    'success',      true,
    'voucher_id',   v_voucher.id,
    'value',        v_voucher.value,
    'sponsor',      v_voucher.sponsor,
    'partner_name', v_voucher.partner_name,
    'code',         v_voucher.code,
    'new_balance',  v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_voucher(TEXT, UUID) TO authenticated;

-- Backfill: credita vouchers ja resgatados (is_used=true) que ainda nao
-- foram aplicados em nenhuma corrida (used_on_ride_id IS NULL) e que ainda
-- nao tem lancamento correspondente no extrato. Idempotente: rodar 2x nao
-- duplica.
DO $$
DECLARE
  v_row         RECORD;
  v_new_balance NUMERIC(10,2);
BEGIN
  FOR v_row IN
    SELECT v.id, v.code, v.value, v.used_by
    FROM public.vouchers v
    WHERE v.is_used = true
      AND v.used_on_ride_id IS NULL
      AND v.used_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.wallet_transactions wt
        WHERE wt.user_id = v.used_by
          AND wt.description = 'Voucher ' || v.code
      )
  LOOP
    UPDATE public.passenger_profiles
    SET wallet_balance = wallet_balance + v_row.value
    WHERE user_id = v_row.used_by
    RETURNING wallet_balance INTO v_new_balance;

    IF v_new_balance IS NOT NULL THEN
      INSERT INTO public.wallet_transactions
        (user_id, type, amount, balance_after, description, status, completed_at)
      VALUES
        (v_row.used_by, 'topup', v_row.value, v_new_balance,
         'Voucher ' || v_row.code, 'completed', NOW());
    END IF;
  END LOOP;
END $$;
