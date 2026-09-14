/*
# Fix cashier role: auto-create profile on signup + cashier RLS access

1. Changes
- Creates a trigger function `handle_new_user()` that inserts a row into `public.profiles` when a new user signs up in `auth.users`, using the `full_name` and `role` from the user's `raw_user_meta_data` (passed via `signUp` options).
- Creates a trigger `on_auth_user_created` on `auth.users` AFTER INSERT to call that function.
- Adds `is_cashier()` helper function mirroring `is_admin()` / `is_barber()`.
- Updates RLS policies on `revenue` and `expenses` to allow the cashier role to SELECT, INSERT, UPDATE (revenue only) — cashiers handle money. DELETE stays admin-only.
- Updates `revenue_select` to also allow cashier.
- Updates `expenses_select`, `expenses_insert`, `expenses_update` to also allow cashier.
2. Security
- The trigger runs as SECURITY DEFINER so it can insert into `profiles` (which has RLS) even though the new user has no profile yet.
- Cashier can now read/write revenue and expenses but cannot delete them.
- Cashier still cannot access reports, customers, services, inventory, or appointments (those policies remain admin/barber/customer scoped).
3. Notes
- `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cashier'` is included for idempotency (already applied in a prior migration).
- Drop-and-recreate pattern used for policies to stay idempotent.
*/

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cashier';

-- Helper: is_cashier()
CREATE OR REPLACE FUNCTION is_cashier()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'cashier'
        AND profiles.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger function: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Revenue policies: allow cashier read + insert + update
DROP POLICY IF EXISTS "revenue_select" ON revenue;
CREATE POLICY "revenue_select" ON revenue FOR SELECT
    TO authenticated USING (
        is_admin() OR is_cashier() OR
        received_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "revenue_insert" ON revenue;
CREATE POLICY "revenue_insert" ON revenue FOR INSERT
    TO authenticated WITH CHECK (is_admin() OR is_barber() OR is_cashier());

DROP POLICY IF EXISTS "revenue_update" ON revenue;
CREATE POLICY "revenue_update" ON revenue FOR UPDATE
    TO authenticated USING (is_admin() OR is_cashier()) WITH CHECK (is_admin() OR is_cashier());

-- Expenses policies: allow cashier read + insert + update
DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT
    TO authenticated USING (is_admin() OR is_cashier());

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses FOR INSERT
    TO authenticated WITH CHECK (is_admin() OR is_cashier());

DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_update" ON expenses FOR UPDATE
    TO authenticated USING (is_admin() OR is_cashier()) WITH CHECK (is_admin() OR is_cashier());
