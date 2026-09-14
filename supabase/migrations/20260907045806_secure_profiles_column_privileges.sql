-- Fix critical security gap: prevent users from changing their own role, shop_id, is_active, or permissions
-- Column privileges are checked BEFORE row-level policies, so this holds even where a policy would allow the row.

-- 1. Revoke all UPDATE on profiles from authenticated, then grant only safe columns
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, phone, address, avatar_url, username) ON profiles TO authenticated;

-- 2. Create a SECURITY DEFINER function for super_admin to toggle owner active status
-- (the BarberShops page currently updates is_active directly, which will now be revoked)
CREATE OR REPLACE FUNCTION public.toggle_owner_active(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Authorize the CALLER: must be an active super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Toggle is_active for the target user
  UPDATE profiles
  SET is_active = NOT is_active
  WHERE id = p_target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION toggle_owner_active(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION toggle_owner_active(uuid) TO authenticated;

-- 3. Create a SECURITY DEFINER function for super_admin to set shop + owner status together
-- (used when activating/deactivating a barber shop)
CREATE OR REPLACE FUNCTION public.set_shop_status(p_shop_id uuid, p_new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Authorize the CALLER: must be an active super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_new_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  -- Update the shop status
  UPDATE barber_shops SET status = p_new_status WHERE id = p_shop_id;

  -- Also update the owner's is_active to match
  UPDATE profiles
  SET is_active = (p_new_status = 'active')
  WHERE shop_id = p_shop_id AND role = 'admin';
END;
$$;

REVOKE EXECUTE ON FUNCTION set_shop_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION set_shop_status(uuid, text) TO authenticated;
