
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('passenger', 'pilot');

-- 2. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Passenger profiles
CREATE TABLE public.passenger_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.passenger_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own passenger profile"
  ON public.passenger_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own passenger profile"
  ON public.passenger_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own passenger profile"
  ON public.passenger_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Pilot profiles
CREATE TABLE public.pilot_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT NOT NULL,
  photo_url TEXT,
  boat_type TEXT,
  boat_identification TEXT,
  boat_photos TEXT[] DEFAULT '{}',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  total_rides INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  pix_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pilot_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pilot profile"
  ON public.pilot_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pilot profile"
  ON public.pilot_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pilot profile"
  ON public.pilot_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Passengers can read pilot profiles"
  ON public.pilot_profiles FOR SELECT
  TO authenticated
  USING (true);

-- 5. Pilots table (legacy device-based)
CREATE TABLE public.pilots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pilots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pilots"
  ON public.pilots FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert pilots"
  ON public.pilots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update pilots"
  ON public.pilots FOR UPDATE
  USING (true);

-- 6. Rides table
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_device_id TEXT NOT NULL,
  passenger_user_id UUID REFERENCES auth.users(id),
  passenger_name TEXT,
  passenger_phone TEXT,
  pilot_id TEXT,
  pilot_name TEXT,
  pilot_phone TEXT,
  origin_name TEXT NOT NULL,
  origin_address TEXT,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  destination_name TEXT,
  destination_address TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  passenger_lat DOUBLE PRECISION,
  passenger_lng DOUBLE PRECISION,
  pilot_lat DOUBLE PRECISION,
  pilot_lng DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'pilot_arriving', 'in_progress', 'completed', 'cancelled')),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_time INTEGER,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  rating_comment TEXT,
  tip NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- Passengers can see their own rides
CREATE POLICY "Passengers can read own rides"
  ON public.rides FOR SELECT
  TO authenticated
  USING (passenger_user_id = auth.uid());

-- Pilots can see pending rides and their own accepted rides
CREATE POLICY "Pilots can read available and own rides"
  ON public.rides FOR SELECT
  TO authenticated
  USING (status = 'pending' OR pilot_id = auth.uid()::text);

-- Authenticated users can create rides
CREATE POLICY "Authenticated users can create rides"
  ON public.rides FOR INSERT
  TO authenticated
  WITH CHECK (passenger_user_id = auth.uid());

-- Rides can be updated by passenger or pilot
CREATE POLICY "Passengers can update own rides"
  ON public.rides FOR UPDATE
  TO authenticated
  USING (passenger_user_id = auth.uid() OR pilot_id = auth.uid()::text);

-- Enable realtime for rides
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;

-- 7. Ride messages
CREATE TABLE public.ride_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('passenger', 'pilot')),
  sender_device_id TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ride participants can read messages"
  ON public.ride_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON public.ride_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime for ride_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;

-- 8. Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  pix_code TEXT,
  qr_code TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Payments can be updated"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (true);

-- 9. User settings
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notifications BOOLEAN NOT NULL DEFAULT true,
  sound_alerts BOOLEAN NOT NULL DEFAULT true,
  auto_navigation BOOLEAN NOT NULL DEFAULT true,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  share_location BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON public.user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 10. Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 11. Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('boat-photos', 'boat-photos', true);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

-- Storage policies for boat-photos
CREATE POLICY "Anyone can view boat photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'boat-photos');

CREATE POLICY "Authenticated users can upload boat photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'boat-photos');

CREATE POLICY "Users can update own boat photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'boat-photos');
