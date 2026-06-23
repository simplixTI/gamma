-- Ad click tracking — informs sales team of ad performance per advertiser.
-- Public INSERT (anyone who clicks the ad), admin-only SELECT for reporting.

CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id       UUID NOT NULL REFERENCES public.partner_ads(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id),
  clicked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can record a click
DROP POLICY IF EXISTS "ad_clicks_public_insert" ON public.ad_clicks;
CREATE POLICY "ad_clicks_public_insert"
  ON public.ad_clicks FOR INSERT
  WITH CHECK (true);

-- Only admins can read clicks (admin metrics dashboard)
DROP POLICY IF EXISTS "ad_clicks_admin_select" ON public.ad_clicks;
CREATE POLICY "ad_clicks_admin_select"
  ON public.ad_clicks FOR SELECT
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_ad_clicks_ad_id      ON public.ad_clicks (ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_clicked_at ON public.ad_clicks (clicked_at DESC);
