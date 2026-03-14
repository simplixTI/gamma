-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  notifications BOOLEAN NOT NULL DEFAULT true,
  sound_alerts BOOLEAN NOT NULL DEFAULT true,
  auto_navigation BOOLEAN NOT NULL DEFAULT true,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  share_location BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();