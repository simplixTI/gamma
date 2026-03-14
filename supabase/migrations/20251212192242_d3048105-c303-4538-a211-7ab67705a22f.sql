-- Add rating and tip columns to rides table
ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS rating integer CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS rating_comment text,
ADD COLUMN IF NOT EXISTS tip numeric DEFAULT 0;