-- =====================================================
-- FIX CASHIER RLS: Add permission checks to INSERT/DELETE policies
-- =====================================================

-- 1. Create helper functions to check cashier permissions safely
CREATE OR REPLACE FUNCTION public.cashier_can_add_income()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_perms jsonb;
BEGIN
  SELECT permissions INTO v_perms FROM public.profiles WHERE id = auth.uid() AND role = 'cashier';
  RETURN v_perms IS NOT NULL AND COALESCE((v_perms->>'can_add_income')::boolean, false) = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cashier_can_add_expense()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_perms jsonb;
BEGIN
  SELECT permissions INTO v_perms FROM public.profiles WHERE id = auth.uid() AND role = 'cashier';
  RETURN v_perms IS NOT NULL AND COALESCE((v_perms->>'can_add_expense')::boolean, false) = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cashier_can_delete_income()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_perms jsonb;
BEGIN
  SELECT permissions INTO v_perms FROM public.profiles WHERE id = auth.uid() AND role = 'cashier';
  RETURN v_perms IS NOT NULL AND COALESCE((v_perms->>'can_delete_income')::boolean, false) = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cashier_can_delete_expense()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_perms jsonb;
BEGIN
  SELECT permissions INTO v_perms FROM public.profiles WHERE id = auth.uid() AND role = 'cashier';
  RETURN v_perms IS NOT NULL AND COALESCE((v_perms->>'can_delete_expense')::boolean, false) = true;
END;
$function$;

-- 2. Drop and recreate cashier INSERT policies with permission checks
DROP POLICY IF EXISTS cashier_insert_revenue ON public.revenue;
CREATE POLICY cashier_insert_revenue ON public.revenue FOR INSERT
  TO authenticated
  WITH CHECK (
    (shop_id = current_shop_id() AND is_cashier() AND cashier_can_add_income())
  );

DROP POLICY IF EXISTS cashier_insert_expenses ON public.expenses;
CREATE POLICY cashier_insert_expenses ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    (shop_id = current_shop_id() AND is_cashier() AND cashier_can_add_expense())
  );

-- 3. Drop and recreate cashier DELETE policies with permission checks
DROP POLICY IF EXISTS cashier_delete_revenue ON public.revenue;
CREATE POLICY cashier_delete_revenue ON public.revenue FOR DELETE
  TO authenticated
  USING (
    (shop_id = current_shop_id() AND is_cashier() AND cashier_can_delete_income())
  );

DROP POLICY IF EXISTS cashier_delete_expenses ON public.expenses;
CREATE POLICY cashier_delete_expenses ON public.expenses FOR DELETE
  TO authenticated
  USING (
    (shop_id = current_shop_id() AND is_cashier() AND cashier_can_delete_expense())
  );

-- 4. Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.cashier_can_add_income TO authenticated;
GRANT EXECUTE ON FUNCTION public.cashier_can_add_expense TO authenticated;
GRANT EXECUTE ON FUNCTION public.cashier_can_delete_income TO authenticated;
GRANT EXECUTE ON FUNCTION public.cashier_can_delete_expense TO authenticated;
