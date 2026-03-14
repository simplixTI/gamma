-- Fix payments table: add columns that create-pix-payment edge function expects
-- The original migration had pix_code/qr_code but the edge function writes pix_qr_code/pix_copy_paste

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT,
  ADD COLUMN IF NOT EXISTS tip NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pilot_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS passenger_device_id TEXT;

-- Enable realtime for payments (so pilot ActiveRide and passenger Completed can react to payment events)
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
