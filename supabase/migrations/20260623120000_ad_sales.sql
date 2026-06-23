-- Ad sales: track price, package duration, advertiser info on partner_ads.
-- Revenue from ad sales is 100% platform (Simplix) — counted separately from ride commissions.
-- NULL price/duration_days = internal/courtesy ad (no charge, current default behavior).

ALTER TABLE public.partner_ads
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS advertiser_name TEXT,
  ADD COLUMN IF NOT EXISTS advertiser_contact TEXT,
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;

-- Allow only the three package sizes when set
ALTER TABLE public.partner_ads
  DROP CONSTRAINT IF EXISTS partner_ads_duration_days_check;
ALTER TABLE public.partner_ads
  ADD CONSTRAINT partner_ads_duration_days_check
  CHECK (duration_days IS NULL OR duration_days IN (7, 15, 30));

-- Price must be non-negative when set
ALTER TABLE public.partner_ads
  DROP CONSTRAINT IF EXISTS partner_ads_price_check;
ALTER TABLE public.partner_ads
  ADD CONSTRAINT partner_ads_price_check
  CHECK (price IS NULL OR price >= 0);

-- Index for revenue queries by sold_at (admin financial dashboard)
CREATE INDEX IF NOT EXISTS idx_partner_ads_sold_at
  ON public.partner_ads (sold_at DESC)
  WHERE sold_at IS NOT NULL;
