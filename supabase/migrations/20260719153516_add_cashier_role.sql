/*
# Add cashier role to user_role enum

1. Changes
- Adds 'cashier' value to the existing `user_role` enum type.
- The cashier role handles money-related tasks (revenue, expenses) and can view employees read-only, but cannot add/edit employees or access reports.
2. Security
- No RLS changes. Existing policies remain intact.
3. Notes
- ALTER TYPE ... ADD VALUE is non-transactional and idempotent here only if the value does not already exist; we guard with IF NOT EXISTS (Postgres 12+).
*/

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cashier';
