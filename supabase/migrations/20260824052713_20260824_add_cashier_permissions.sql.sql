/*
# Add Cashier Permissions System

1. New Columns
- `profiles.permissions` (jsonb, default '{}'): Stores per-cashier permission flags
  controlling which actions the cashier can perform. Example:
  `{"can_add_income": true, "can_add_expense": true, "can_add_customer": true,
    "can_use_pos": true, "can_delete_income": false, "can_delete_expense": false,
    "can_edit_customer": false}`

2. Security
- No new tables. The `permissions` column is only writable by admin via a
  SECURITY DEFINER function (added in the next migration step via edge function).
- RLS on profiles already restricts UPDATE to owner-or-admin, but column-level
  privileges are tightened: `authenticated` can no longer UPDATE the `permissions`
  or `role` columns directly. Only the admin SECURITY DEFINER function can.

3. Important Notes
- The permissions column defaults to '{}' so existing profiles are unaffected.
- Cashier pages will read `profile.permissions` from the auth context and
  show/hide UI controls accordingly. The backend RLS still enforces the real
  rules, but the column-level grant prevents privilege escalation.
*/

-- Add permissions column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE profiles ADD COLUMN permissions jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Revoke UPDATE on sensitive columns from authenticated
-- Users should NOT be able to set their own role or permissions
REVOKE UPDATE ON profiles FROM authenticated;
-- Re-grant UPDATE only on user-editable columns
GRANT UPDATE (full_name, phone, address, avatar_url) ON profiles TO authenticated;

-- Index for faster permission checks (optional, for future admin queries)
CREATE INDEX IF NOT EXISTS idx_profiles_permissions ON profiles USING gin (permissions);
