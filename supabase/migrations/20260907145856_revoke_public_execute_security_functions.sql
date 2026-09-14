-- Revoke EXECUTE from PUBLIC (which includes anon) and grant only to authenticated
-- The functions have internal is_super_admin() checks, but defense-in-depth

REVOKE EXECUTE ON FUNCTION log_audit(uuid, text, text, uuid, jsonb, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_audit(uuid, text, text, uuid, jsonb, jsonb, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION set_shop_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_shop_status(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION toggle_owner_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION toggle_owner_active(uuid) TO authenticated;
