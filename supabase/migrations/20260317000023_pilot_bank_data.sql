-- Pilot bank/pix payout info
ALTER TABLE public.pilot_profiles
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'email', 'phone', 'random', NULL)),
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS bank_agency TEXT,
  ADD COLUMN IF NOT EXISTS payout_info_updated_at TIMESTAMPTZ;
