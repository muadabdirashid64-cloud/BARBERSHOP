-- =====================================================
-- SUPER ADMIN / SYSTEM OWNER ROLE
-- =====================================================

-- 1. Add super_admin to the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Create is_super_admin helper function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
    AND profiles.is_active = true
  );
END;
$function$;

-- 3. Update is_admin to also return true for super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
    AND profiles.is_active = true
  );
END;
$function$;

-- 4. Grant execute on is_super_admin
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- 5. Add shop_id to shop_settings
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS shop_id uuid;
UPDATE public.shop_settings SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
ALTER TABLE public.shop_settings
  ADD CONSTRAINT shop_settings_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_shop_settings_shop_id ON public.shop_settings(shop_id);

-- 6. RLS policy for barber_shops
DROP POLICY IF EXISTS select_barber_shops ON public.barber_shops;
DROP POLICY IF EXISTS insert_barber_shops ON public.barber_shops;
DROP POLICY IF EXISTS update_barber_shops ON public.barber_shops;
DROP POLICY IF EXISTS delete_barber_shops ON public.barber_shops;
DROP POLICY IF EXISTS super_admin_all_barber_shops ON public.barber_shops;
DROP POLICY IF EXISTS admin_read_barber_shops ON public.barber_shops;

-- Super admin can do everything with barber_shops
CREATE POLICY "super_admin_all_barber_shops" ON public.barber_shops
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Admins can read their own shop
CREATE POLICY "admin_read_barber_shops" ON public.barber_shops
  FOR SELECT TO authenticated
  USING (
    public.is_admin() AND id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
  );

-- 7. Profiles RLS
DROP POLICY IF EXISTS select_profiles ON public.profiles;
DROP POLICY IF EXISTS insert_profiles ON public.profiles;
DROP POLICY IF EXISTS update_profiles ON public.profiles;
DROP POLICY IF EXISTS delete_profiles ON public.profiles;
DROP POLICY IF EXISTS super_admin_all_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_manage_shop_profiles ON public.profiles;
DROP POLICY IF EXISTS select_own_profile ON public.profiles;
DROP POLICY IF EXISTS update_own_profile ON public.profiles;

-- Super admin can manage all profiles
CREATE POLICY "super_admin_all_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Users can read their own profile
CREATE POLICY "select_own_profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admin can manage profiles in their shop
CREATE POLICY "admin_manage_shop_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    public.is_admin() AND NOT public.is_super_admin()
    AND shop_id = public.current_shop_id()
  )
  WITH CHECK (
    public.is_admin() AND NOT public.is_super_admin()
    AND shop_id = public.current_shop_id()
  );

-- Users can update their own profile
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 8. Drop all existing policies on business tables
DO $$
DECLARE
  tbl text;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'employees', 'customers', 'services', 'revenue', 'expenses',
    'inventory', 'home_services', 'appointments', 'barber_attendance',
    'barber_ratings', 'customer_favorites', 'customer_notes',
    'notifications', 'audit_log', 'shop_settings'
  ])
  LOOP
    FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = format('public.%s', tbl)::regclass
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %s ON public.%s', pol.polname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- 9. Create new shop-scoped policies for each business table
-- Pattern: super_admin sees all, admin sees their shop, others see their shop (read)

-- employees
CREATE POLICY "super_admin_all_employees" ON public.employees FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_employees" ON public.employees FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_employees" ON public.employees FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- customers
CREATE POLICY "super_admin_all_customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_customers" ON public.customers FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- services
CREATE POLICY "super_admin_all_services" ON public.services FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_services" ON public.services FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_services" ON public.services FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- revenue
CREATE POLICY "super_admin_all_revenue" ON public.revenue FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_revenue" ON public.revenue FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "cashier_insert_revenue" ON public.revenue FOR INSERT TO authenticated
  WITH CHECK (shop_id = public.current_shop_id() AND public.is_cashier());
CREATE POLICY "shop_read_revenue" ON public.revenue FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());
CREATE POLICY "cashier_delete_revenue" ON public.revenue FOR DELETE TO authenticated
  USING (shop_id = public.current_shop_id() AND public.is_cashier());

-- expenses
CREATE POLICY "super_admin_all_expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "cashier_insert_expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (shop_id = public.current_shop_id() AND public.is_cashier());
CREATE POLICY "shop_read_expenses" ON public.expenses FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());
CREATE POLICY "cashier_delete_expenses" ON public.expenses FOR DELETE TO authenticated
  USING (shop_id = public.current_shop_id() AND public.is_cashier());

-- inventory
CREATE POLICY "super_admin_all_inventory" ON public.inventory FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_inventory" ON public.inventory FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_inventory" ON public.inventory FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- home_services
CREATE POLICY "super_admin_all_home_services" ON public.home_services FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_home_services" ON public.home_services FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_home_services" ON public.home_services FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- appointments
CREATE POLICY "super_admin_all_appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_appointments" ON public.appointments FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- barber_attendance
CREATE POLICY "super_admin_all_barber_attendance" ON public.barber_attendance FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_barber_attendance" ON public.barber_attendance FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_barber_attendance" ON public.barber_attendance FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- barber_ratings
CREATE POLICY "super_admin_all_barber_ratings" ON public.barber_ratings FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_barber_ratings" ON public.barber_ratings FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_barber_ratings" ON public.barber_ratings FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- customer_favorites
CREATE POLICY "super_admin_all_customer_favorites" ON public.customer_favorites FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_customer_favorites" ON public.customer_favorites FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_customer_favorites" ON public.customer_favorites FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- customer_notes
CREATE POLICY "super_admin_all_customer_notes" ON public.customer_notes FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_customer_notes" ON public.customer_notes FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_customer_notes" ON public.customer_notes FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- notifications
CREATE POLICY "super_admin_all_notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() AND shop_id = public.current_shop_id());
CREATE POLICY "shop_read_notifications" ON public.notifications FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

-- audit_log
CREATE POLICY "super_admin_all_audit_log" ON public.audit_log FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_read_shop_audit_log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_admin() AND shop_id = public.current_shop_id());

-- shop_settings
CREATE POLICY "super_admin_all_shop_settings" ON public.shop_settings FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_shop_settings" ON public.shop_settings FOR ALL TO authenticated
  USING (public.is_admin() AND NOT public.is_super_admin())
  WITH CHECK (public.is_admin() AND NOT public.is_super_admin());
