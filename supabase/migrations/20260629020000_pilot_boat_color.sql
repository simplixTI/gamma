-- Add boat_color so passengers can spot the boat at the pier (Uber-style "car color")
-- Color is visual identification only — not regulatory, so captains can edit it
-- freely (unlike boat_type / boat_identification, which are locked to approved docs).

ALTER TABLE public.pilot_profiles
  ADD COLUMN IF NOT EXISTS boat_color TEXT;

-- Refresh the public view so passengers see the new field
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
  current_passengers,
  approval_status,
  boat_color
FROM public.pilot_profiles;

GRANT SELECT ON public.pilot_public_profiles TO authenticated;
