-- Create pilots table for pilot profiles
CREATE TABLE public.pilots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  boat_name TEXT,
  boat_capacity INTEGER DEFAULT 8,
  license_number TEXT,
  pix_key TEXT,
  rating NUMERIC(3,2) DEFAULT 5.00,
  total_rides INTEGER DEFAULT 0,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pilots ENABLE ROW LEVEL SECURITY;

-- Anyone can view pilots (for passengers to see pilot info)
CREATE POLICY "Anyone can view pilots" 
ON public.pilots 
FOR SELECT 
USING (true);

-- Anyone can create their pilot profile (using device_id)
CREATE POLICY "Anyone can create pilot profile" 
ON public.pilots 
FOR INSERT 
WITH CHECK (true);

-- Pilots can update their own profile (by device_id)
CREATE POLICY "Pilots can update their own profile" 
ON public.pilots 
FOR UPDATE 
USING (true);

-- Create payments table for tracking PIX payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id),
  pilot_id UUID REFERENCES public.pilots(id),
  passenger_device_id TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  tip NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'pix',
  status TEXT DEFAULT 'pending',
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  transaction_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Anyone can view payments (for both pilot and passenger)
CREATE POLICY "Anyone can view payments" 
ON public.payments 
FOR SELECT 
USING (true);

-- Anyone can create payments
CREATE POLICY "Anyone can create payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (true);

-- Anyone can update payments
CREATE POLICY "Anyone can update payments" 
ON public.payments 
FOR UPDATE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_pilots_updated_at
BEFORE UPDATE ON public.pilots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;