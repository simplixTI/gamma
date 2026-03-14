-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('passenger', 'pilot');

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create passenger_profiles table
CREATE TABLE public.passenger_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    cpf TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on passenger_profiles
ALTER TABLE public.passenger_profiles ENABLE ROW LEVEL SECURITY;

-- Create pilot_profiles table
CREATE TABLE public.pilot_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    cpf TEXT NOT NULL,
    photo_url TEXT,
    boat_type TEXT,
    boat_identification TEXT,
    boat_photos TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    rating NUMERIC DEFAULT 5.00,
    total_rides INTEGER DEFAULT 0,
    total_earnings NUMERIC DEFAULT 0,
    pix_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pilot_profiles
ALTER TABLE public.pilot_profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

-- Function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Allow insert during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for passenger_profiles
CREATE POLICY "Passengers can view their own profile"
ON public.passenger_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Passengers can insert their own profile"
ON public.passenger_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Passengers can update their own profile"
ON public.passenger_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Pilots can view passenger profiles for rides"
ON public.passenger_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'pilot'));

-- RLS Policies for pilot_profiles
CREATE POLICY "Pilots can view their own profile"
ON public.pilot_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Pilots can insert their own profile"
ON public.pilot_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Pilots can update their own profile"
ON public.pilot_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Passengers can view pilot profiles"
ON public.pilot_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'passenger'));

CREATE POLICY "Public can view active pilots"
ON public.pilot_profiles
FOR SELECT
USING (is_active = true);

-- Create storage buckets for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('boat-photos', 'boat-photos', true);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload their avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for boat photos
CREATE POLICY "Anyone can view boat photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'boat-photos');

CREATE POLICY "Pilots can upload boat photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'boat-photos' AND public.has_role(auth.uid(), 'pilot'));

CREATE POLICY "Pilots can update their boat photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'boat-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Pilots can delete their boat photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'boat-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_passenger_profiles_updated_at
BEFORE UPDATE ON public.passenger_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pilot_profiles_updated_at
BEFORE UPDATE ON public.pilot_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update rides table to link with authenticated users
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS passenger_user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS payment_id uuid;