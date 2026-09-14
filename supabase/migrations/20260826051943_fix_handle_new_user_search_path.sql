-- Fix the handle_new_user trigger function to use a secure search_path
-- and schema-qualified type references to prevent "Database error creating new user"
-- when the admin API creates users (the search_path may not include 'public' in that context)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer'::public.user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
