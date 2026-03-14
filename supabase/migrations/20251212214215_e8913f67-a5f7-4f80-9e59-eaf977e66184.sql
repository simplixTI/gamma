-- Enable REPLICA IDENTITY FULL for realtime updates
ALTER TABLE public.rides REPLICA IDENTITY FULL;