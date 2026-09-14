-- =====================================================
-- UNIQUE USERNAME FOR SHOP OWNERS + AUDIT LOG ENHANCEMENT
-- =====================================================

-- 1. Add username column to profiles (unique, nullable for existing users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username) WHERE username IS NOT NULL;

-- 2. Add a helper function to log audit entries from edge functions
CREATE OR REPLACE FUNCTION public.log_audit(
  p_user_id uuid,
  p_action text,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_shop_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_values, new_values, shop_id)
  VALUES (p_user_id, p_action, p_table_name, p_record_id, p_old_values, p_new_values, p_shop_id);
END;
$function$;

-- 3. Add a trigger to prevent non-super_admin users from changing shop_id or role
CREATE OR REPLACE FUNCTION public.protect_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_role text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
      IF NEW.shop_id IS DISTINCT FROM OLD.shop_id THEN
        RAISE EXCEPTION 'You do not have permission to change your shop assignment.';
      END IF;
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'You do not have permission to change your role.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_admin_fields ON public.profiles;
CREATE TRIGGER trg_protect_admin_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_admin_fields();

-- 4. Add a function to look up email by username (for username-based login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN (
    SELECT email FROM public.profiles
    WHERE username = p_username AND is_active = true
    LIMIT 1
  );
END;
$function$;

-- Grant execute on the new functions
GRANT EXECUTE ON FUNCTION public.log_audit TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username TO anon, authenticated;
