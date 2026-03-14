-- Ensure all required columns exist on payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS passenger_device_id TEXT,
  ADD COLUMN IF NOT EXISTS pilot_id UUID,
  ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'pix',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Ensure wallet_transactions has mp_payment_id
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;

-- Recreate indexes safely
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id
  ON public.payments (mp_payment_id) WHERE mp_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_mp_payment_id
  ON public.wallet_transactions (mp_payment_id) WHERE mp_payment_id IS NOT NULL;
