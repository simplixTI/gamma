-- Payment integrity fixes from audit
-- 1. Validate p_amount > 0 in credit_wallet to prevent negative credits
-- 2. Idempotency: wallet_transactions failed status support

-- ============================================================
-- 1. Fix credit_wallet RPC — add positive-amount guard
--    Prevents malicious/buggy calls from crediting negative amounts
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id      UUID,
  p_amount       NUMERIC,
  p_description  TEXT,
  p_transaction_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'credit_wallet: amount must be positive, got %', p_amount;
  END IF;

  UPDATE passenger_profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE user_id = p_user_id
  RETURNING wallet_balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Perfil de passageiro não encontrado';
  END IF;

  UPDATE wallet_transactions
  SET status = 'completed', balance_after = new_balance, completed_at = now()
  WHERE id = p_transaction_id AND user_id = p_user_id;

  RETURN new_balance;
END;
$$;

-- ============================================================
-- 2. Allow 'failed' as valid wallet_transaction status
--    (webhook now marks failed topup payments as failed)
-- ============================================================
DO $$
BEGIN
  -- Only add if the constraint exists and doesn't already include 'failed'
  IF EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'wallet_transactions_status_check'
      AND conrelid = 'public.wallet_transactions'::regclass
  ) THEN
    ALTER TABLE public.wallet_transactions
      DROP CONSTRAINT wallet_transactions_status_check;
  END IF;
END$$;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
