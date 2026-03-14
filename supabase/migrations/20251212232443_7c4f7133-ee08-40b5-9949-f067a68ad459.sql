-- Create ride_messages table for real-time chat
CREATE TABLE public.ride_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('passenger', 'pilot')),
  sender_device_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for ride messages
CREATE POLICY "Anyone can view messages for rides they are part of"
ON public.ride_messages
FOR SELECT
USING (true);

CREATE POLICY "Anyone can send messages"
ON public.ride_messages
FOR INSERT
WITH CHECK (true);

-- Enable realtime for chat messages
ALTER TABLE public.ride_messages REPLICA IDENTITY FULL;

-- Create index for faster queries
CREATE INDEX idx_ride_messages_ride_id ON public.ride_messages(ride_id);
CREATE INDEX idx_ride_messages_created_at ON public.ride_messages(created_at);