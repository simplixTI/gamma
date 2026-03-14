-- Create rides table for real-time tracking
CREATE TABLE public.rides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Passenger info (no auth yet, using device id)
  passenger_device_id TEXT NOT NULL,
  passenger_name TEXT,
  passenger_phone TEXT,
  
  -- Pilot info
  pilot_id UUID,
  pilot_name TEXT,
  pilot_phone TEXT,
  
  -- Origin location
  origin_name TEXT NOT NULL,
  origin_address TEXT,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  
  -- Destination location (optional for now)
  destination_name TEXT,
  destination_address TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  
  -- Real-time tracking coordinates
  passenger_lat DOUBLE PRECISION,
  passenger_lng DOUBLE PRECISION,
  pilot_lat DOUBLE PRECISION,
  pilot_lng DOUBLE PRECISION,
  
  -- Ride details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'pilot_arriving', 'in_progress', 'completed', 'cancelled')),
  price DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  estimated_time INTEGER, -- in minutes
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth for now)
CREATE POLICY "Anyone can create rides"
ON public.rides
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view rides"
ON public.rides
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update rides"
ON public.rides
FOR UPDATE
USING (true);

-- Enable realtime
ALTER TABLE public.rides REPLICA IDENTITY FULL;

-- Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'rides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX idx_rides_status ON public.rides(status);
CREATE INDEX idx_rides_passenger_device ON public.rides(passenger_device_id);
CREATE INDEX idx_rides_pilot ON public.rides(pilot_id);

-- Trigger for updated_at
CREATE TRIGGER update_rides_updated_at
BEFORE UPDATE ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();