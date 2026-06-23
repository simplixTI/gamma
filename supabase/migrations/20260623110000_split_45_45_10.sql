-- Revenue split: 45% pilot / 45% boat owner / 10% Simplix (platform fee)
-- Previously: 30% pilot / 50% owners / 20% Simplix.
-- Historical pilot_earnings rows keep their original commission_percent (audit integrity).

-- 1. Drop unused GENERATED columns from pilot_earnings.
--    They hardcoded the old 20%/50% split and are not read anywhere in app code.
ALTER TABLE public.pilot_earnings
  DROP COLUMN IF EXISTS simplix_amount,
  DROP COLUMN IF EXISTS owners_amount;

-- 2. New default commission for future rides: 100 - 45 = 55%
ALTER TABLE public.pilot_earnings
  ALTER COLUMN commission_percent SET DEFAULT 55.00;

-- 3. Update platform_config so record_pilot_earning() picks up the new pilot %.
UPDATE public.platform_config SET value = '45', updated_at = NOW() WHERE key = 'pilot_percent';
UPDATE public.platform_config SET value = '10', updated_at = NOW() WHERE key = 'simplix_percent';
UPDATE public.platform_config SET value = '45', updated_at = NOW() WHERE key = 'owners_percent';

-- Make sure the keys exist even if seeding was skipped earlier.
INSERT INTO public.platform_config (key, value, description) VALUES
  ('pilot_percent',   '45', 'Percentual do piloto por corrida'),
  ('simplix_percent', '10', 'Taxa Simplix (plataforma) por corrida'),
  ('owners_percent', '45', 'Repasse para o dono do barco')
ON CONFLICT (key) DO NOTHING;
