-- Favorite locations for passengers
CREATE TABLE IF NOT EXISTS public.favorite_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  type        TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('home', 'work', 'other')),
  pier_id     TEXT,
  lat         NUMERIC(10,7),
  lng         NUMERIC(10,7),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own favorites"
  ON public.favorite_locations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own favorites"
  ON public.favorite_locations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own favorites"
  ON public.favorite_locations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own favorites"
  ON public.favorite_locations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
