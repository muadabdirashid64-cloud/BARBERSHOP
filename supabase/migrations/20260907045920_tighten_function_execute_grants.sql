-- Tighten EXECUTE grants on new SECURITY DEFINER functions
-- The functions already check is_super_admin() internally, but we revoke anon access as defense-in-depth
REVOKE EXECUTE ON FUNCTION set_shop_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION toggle_owner_active(uuid) FROM anon;
