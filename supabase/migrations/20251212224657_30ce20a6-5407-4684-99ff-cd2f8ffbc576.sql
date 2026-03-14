-- Drop the old trigger that's causing the conflict
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the old function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new function to handle Gamma user profiles
CREATE OR REPLACE FUNCTION public.handle_new_gamma_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the role from user metadata
  user_role := NEW.raw_user_meta_data ->> 'role';
  
  -- Only create profiles for Gamma users (passenger or pilot)
  IF user_role = 'passenger' THEN
    INSERT INTO public.passenger_profiles (user_id, full_name, phone, email, cpf)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data ->> 'cpf', '')
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'passenger');
    
  ELSIF user_role = 'pilot' THEN
    INSERT INTO public.pilot_profiles (user_id, full_name, phone, email, cpf, boat_type, boat_identification)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data ->> 'cpf', ''),
      NEW.raw_user_meta_data ->> 'boat_type',
      NEW.raw_user_meta_data ->> 'boat_identification'
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pilot');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create new trigger for Gamma users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_gamma_user();