-- Fix is_cashier() to use a secure search_path and schema-qualified references
CREATE OR REPLACE FUNCTION public.is_cashier()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cashier'
    AND profiles.is_active = true
  );
END;
$function$;
