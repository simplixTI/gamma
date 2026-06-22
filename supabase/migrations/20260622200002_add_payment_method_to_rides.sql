-- Add payment_method column to rides table.
-- pay_ride_with_wallet() sets rides.payment_method='wallet' but the column was
-- never created — function errors with PG 42703 "column does not exist".
-- Values mirror payments.payment_method: 'wallet' | 'pix' | 'card'.

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.rides
  DROP CONSTRAINT IF EXISTS rides_payment_method_check;
ALTER TABLE public.rides
  ADD CONSTRAINT rides_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('wallet', 'pix', 'card'));
