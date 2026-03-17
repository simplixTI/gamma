-- Migration 000016: Enable RLS on locations table
-- The `locations` table stores real-time GPS coordinates of pilots.
-- Without RLS, any authenticated user could read OR write any pilot's location.

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Pilots can upsert/update their own location row
CREATE POLICY "pilots_manage_own_location"
  ON public.locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pilot_profiles
      WHERE pilot_profiles.id = locations.pilot_id
        AND pilot_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pilot_profiles
      WHERE pilot_profiles.id = locations.pilot_id
        AND pilot_profiles.user_id = auth.uid()
    )
  );

-- Authenticated users (passengers) can read available pilot locations for the map
CREATE POLICY "authenticated_read_locations"
  ON public.locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything (for edge functions)
-- (service role bypasses RLS by default — no explicit policy needed)
