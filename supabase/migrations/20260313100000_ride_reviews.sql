-- Phase 3: Avaliações — ride_reviews table + schema gaps

-- 1. Add pilot_user_id to rides (auth UUID, separate from pilot_id which is device-based)
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS pilot_user_id UUID REFERENCES auth.users(id);

-- 2. Add rating column to passenger_profiles
ALTER TABLE public.passenger_profiles
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) NOT NULL DEFAULT 5.0;

-- 3. Create ride_reviews table
CREATE TABLE IF NOT EXISTS public.ride_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id       UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL REFERENCES auth.users(id),
  reviewee_id   UUID NOT NULL REFERENCES auth.users(id),
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('passenger', 'pilot')),
  stars         SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ride_id, reviewer_role)
);

ALTER TABLE public.ride_reviews ENABLE ROW LEVEL SECURITY;

-- RLS: somente o reviewer pode inserir sua própria avaliação
CREATE POLICY "Reviewer can insert own review"
  ON public.ride_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- RLS: reviewer ou reviewee podem ler
CREATE POLICY "Participants can read reviews"
  ON public.ride_reviews FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR reviewee_id = auth.uid());

-- 4. Trigger: atualiza pilot_profiles.rating quando passageiro avalia
CREATE OR REPLACE FUNCTION public.update_pilot_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.pilot_profiles
  SET rating = (
    SELECT COALESCE(AVG(stars::numeric), 5.0)
    FROM public.ride_reviews
    WHERE reviewee_id = NEW.reviewee_id
      AND reviewer_role = 'passenger'
  )
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_pilot_rating
  AFTER INSERT ON public.ride_reviews
  FOR EACH ROW
  WHEN (NEW.reviewer_role = 'passenger')
  EXECUTE FUNCTION public.update_pilot_rating();

-- 5. Trigger: atualiza passenger_profiles.rating quando piloto avalia
CREATE OR REPLACE FUNCTION public.update_passenger_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.passenger_profiles
  SET rating = (
    SELECT COALESCE(AVG(stars::numeric), 5.0)
    FROM public.ride_reviews
    WHERE reviewee_id = NEW.reviewee_id
      AND reviewer_role = 'pilot'
  )
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_passenger_rating
  AFTER INSERT ON public.ride_reviews
  FOR EACH ROW
  WHEN (NEW.reviewer_role = 'pilot')
  EXECUTE FUNCTION public.update_passenger_rating();
