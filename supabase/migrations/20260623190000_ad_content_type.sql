-- Mesma tabela partner_ads pode armazenar 'ad' (anuncio comercial) ou 'curiosity'
-- (curiosidade da Ilha da Gigoia pra turistas). UI renderiza badges/formularios
-- diferentes baseado nesse campo. Existentes ficam como 'ad' (compat).

ALTER TABLE public.partner_ads
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'ad';

ALTER TABLE public.partner_ads
  DROP CONSTRAINT IF EXISTS partner_ads_content_type_check;
ALTER TABLE public.partner_ads
  ADD CONSTRAINT partner_ads_content_type_check
  CHECK (content_type IN ('ad', 'curiosity'));

CREATE INDEX IF NOT EXISTS idx_partner_ads_content_type
  ON public.partner_ads (content_type, position, is_active);

COMMENT ON COLUMN public.partner_ads.content_type IS
  'ad = anuncio comercial (tem advertiser, price, sold_at). '
  'curiosity = curiosidade da Ilha da Gigoia (sem advertiser, sem precificacao).';
