-- Mercado Pago integration migration
-- Adds mp_payment_id to payments and wallet_transactions,
-- and ensures payment_method column exists on payments.

-- payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'pix';

-- Create index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id
  ON payments (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

-- wallet_transactions table
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_mp_payment_id
  ON wallet_transactions (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;
