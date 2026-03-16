-- Payment audit fixes (audit pass 2026-03-16)
-- 1. Fix credit_wallet: NULL p_transaction_id silently skips the wallet_transactions update
-- 2. Add unique constraint on (user_id, mp_card_id) in saved_cards
-- 3. Update rides status check to allow in_progress/completed payments (mirror edge function fix)

-- ============================================================
-- 1. Fix credit_wallet RPC — NULL p_transaction_id guard
--
-- FIX [HIGH]: When p_transaction_id IS NULL (the DEFAULT), the WHERE clause
--   `WHERE id = p_transaction_id` evaluates to `WHERE id = NULL` which is always
--   FALSE in SQL — no row is ever updated. The wallet balance was credited in
--   passenger_profiles but wallet_transactions.status stayed 'processing' forever.
--   The Wallet page real-time listener fires on status='completed', so the UI
--   never auto-refreshed after a successful top-up.
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id        UUID,
  p_amount         NUMERIC,
  p_description    TEXT,
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

  IF p_transaction_id IS NULL THEN
    RAISE EXCEPTION 'credit_wallet: p_transaction_id must not be NULL';
  END IF;

  -- Idempotency guard: if this transaction is already completed, return current balance
  -- without double-crediting. This can happen if credit_wallet is retried after a
  -- partial failure.
  DECLARE
    existing_status TEXT;
  BEGIN
    SELECT status INTO existing_status
    FROM wallet_transactions
    WHERE id = p_transaction_id AND user_id = p_user_id;

    IF existing_status = 'completed' THEN
      SELECT wallet_balance INTO new_balance
      FROM passenger_profiles
      WHERE user_id = p_user_id;
      RETURN COALESCE(new_balance, 0);
    END IF;
  END;

  UPDATE passenger_profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE user_id = p_user_id
  RETURNING wallet_balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Perfil de passageiro não encontrado para user_id=%', p_user_id;
  END IF;

  -- Now that p_transaction_id is guaranteed non-NULL, this WHERE clause correctly
  -- matches the row and updates it to 'completed'.
  UPDATE wallet_transactions
  SET
    status       = 'completed',
    balance_after = new_balance,
    completed_at = now()
  WHERE id = p_transaction_id
    AND user_id = p_user_id;

  RETURN new_balance;
END;
$$;

-- ============================================================
-- 2. Unique constraint on saved_cards (user_id, mp_card_id)
--
-- FIX [LOW]: Without this, the same card could be saved multiple times
-- for the same user (e.g. if the save-card flow is retried). MP card IDs
-- are unique per customer, so each physical card should appear once per user.
-- ============================================================
ALTER TABLE public.saved_cards
  DROP CONSTRAINT IF EXISTS saved_cards_user_mp_card_unique;

ALTER TABLE public.saved_cards
  ADD CONSTRAINT saved_cards_user_mp_card_unique
  UNIQUE (user_id, mp_card_id);

-- Note: the UNIQUE constraint allows multiple NULL mp_card_id values (legacy cards
-- saved before the MP Customers API was integrated). This is intentional.
