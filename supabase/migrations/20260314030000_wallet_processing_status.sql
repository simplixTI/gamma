-- Allow 'processing' status on wallet_transactions for webhook idempotency
-- Webhooks set status=processing atomically before crediting to prevent double-credit
-- on duplicate webhook deliveries from Mercado Pago.

-- Update the CHECK constraint to include 'processing'
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'));

-- Index to quickly find pending transactions during webhook processing
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_mp_payment_pending
  ON public.wallet_transactions(mp_payment_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_pix_pending
  ON public.wallet_transactions(pix_transaction_id)
  WHERE status = 'pending';
