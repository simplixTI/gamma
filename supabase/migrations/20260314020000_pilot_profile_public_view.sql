-- Expose only public fields of pilot_profiles to passengers
-- Supabase RLS cannot restrict specific columns in SELECT policies natively.
-- Solution: create a VIEW with only the public fields, grant SELECT to authenticated.
-- App code for passengers should query pilot_public_profiles instead of pilot_profiles.

CREATE OR REPLACE VIEW public.pilot_public_profiles AS
SELECT
  id,
  user_id,
  full_name,
  phone,
  photo_url,
  boat_type,
  boat_identification,
  boat_photos,
  is_verified,
  is_active,
  rating,
  total_rides,
  boat_capacity,
  current_passengers
  -- NOTE: pix_key, total_earnings, cpf, email are intentionally excluded
FROM public.pilot_profiles;

-- RLS on the view is inherited from the base table policies.
-- But to be explicit, grant select only to authenticated.
GRANT SELECT ON public.pilot_public_profiles TO authenticated;

-- Also add a pending rides expiry index to prevent stale rides appearing
-- Rides older than 15 minutes that are still 'pending' should be auto-cancelled
-- This is done via a scheduled function or pg_cron (add when available)
-- For now, add an index to support the time filter efficiently
CREATE INDEX IF NOT EXISTS idx_rides_pending_created_at
  ON public.rides(created_at)
  WHERE status = 'pending';

-- Add index for fast lookup of active rides by pilot (used in pool queries)
CREATE INDEX IF NOT EXISTS idx_rides_pilot_active
  ON public.rides(pilot_user_id, status)
  WHERE status IN ('accepted', 'pilot_arriving', 'in_progress');
