-- =====================================================
-- AUTO-SET shop_id ON INSERT FOR BUSINESS TABLES
-- This ensures all new records get the caller's shop_id
-- automatically, without requiring frontend changes.
-- =====================================================

-- Helper function: get current user's shop_id (same as current_shop_id but reusable in triggers)
CREATE OR REPLACE FUNCTION public.set_shop_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN (
    SELECT shop_id FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$function$;

-- Create trigger functions for each business table
CREATE OR REPLACE FUNCTION public.set_shop_id_employees()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_customers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_services()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_revenue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_expenses()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_home_services()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_appointments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_barber_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_barber_ratings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_customer_favorites()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_customer_notes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_id_shop_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.set_shop_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS trg_set_shop_id_employees ON public.employees;
DROP TRIGGER IF EXISTS trg_set_shop_id_customers ON public.customers;
DROP TRIGGER IF EXISTS trg_set_shop_id_services ON public.services;
DROP TRIGGER IF EXISTS trg_set_shop_id_revenue ON public.revenue;
DROP TRIGGER IF EXISTS trg_set_shop_id_expenses ON public.expenses;
DROP TRIGGER IF EXISTS trg_set_shop_id_inventory ON public.inventory;
DROP TRIGGER IF EXISTS trg_set_shop_id_home_services ON public.home_services;
DROP TRIGGER IF EXISTS trg_set_shop_id_appointments ON public.appointments;
DROP TRIGGER IF EXISTS trg_set_shop_id_barber_attendance ON public.barber_attendance;
DROP TRIGGER IF EXISTS trg_set_shop_id_barber_ratings ON public.barber_ratings;
DROP TRIGGER IF EXISTS trg_set_shop_id_customer_favorites ON public.customer_favorites;
DROP TRIGGER IF EXISTS trg_set_shop_id_customer_notes ON public.customer_notes;
DROP TRIGGER IF EXISTS trg_set_shop_id_notifications ON public.notifications;
DROP TRIGGER IF EXISTS trg_set_shop_id_shop_settings ON public.shop_settings;

-- Create triggers
CREATE TRIGGER trg_set_shop_id_employees BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_employees();

CREATE TRIGGER trg_set_shop_id_customers BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_customers();

CREATE TRIGGER trg_set_shop_id_services BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_services();

CREATE TRIGGER trg_set_shop_id_revenue BEFORE INSERT ON public.revenue
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_revenue();

CREATE TRIGGER trg_set_shop_id_expenses BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_expenses();

CREATE TRIGGER trg_set_shop_id_inventory BEFORE INSERT ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_inventory();

CREATE TRIGGER trg_set_shop_id_home_services BEFORE INSERT ON public.home_services
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_home_services();

CREATE TRIGGER trg_set_shop_id_appointments BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_appointments();

CREATE TRIGGER trg_set_shop_id_barber_attendance BEFORE INSERT ON public.barber_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_barber_attendance();

CREATE TRIGGER trg_set_shop_id_barber_ratings BEFORE INSERT ON public.barber_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_barber_ratings();

CREATE TRIGGER trg_set_shop_id_customer_favorites BEFORE INSERT ON public.customer_favorites
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_customer_favorites();

CREATE TRIGGER trg_set_shop_id_customer_notes BEFORE INSERT ON public.customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_customer_notes();

CREATE TRIGGER trg_set_shop_id_notifications BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_notifications();

CREATE TRIGGER trg_set_shop_id_shop_settings BEFORE INSERT ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_id_shop_settings();

-- Also update the RLS policies to allow inserts where shop_id is NULL
-- (because the trigger will set it before the WITH CHECK runs)
-- Actually, WITH CHECK runs AFTER triggers in PostgreSQL, so the trigger-set
-- shop_id will be checked. This means the existing policies are correct.

-- However, for super_admin, we need to allow them to insert without a shop_id
-- (they may be creating records for any shop). The super_admin_all_* policies
-- already handle this with WITH CHECK (public.is_super_admin()).

-- For admin, the trigger sets shop_id = admin's shop_id, and the policy checks
-- shop_id = current_shop_id(). This should work correctly.

-- Update existing records that have NULL shop_id to assign them to the first shop
UPDATE public.employees SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.customers SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.services SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.revenue SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.expenses SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.inventory SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.home_services SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.appointments SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.barber_attendance SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.barber_ratings SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.customer_favorites SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.customer_notes SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.notifications SET shop_id = (SELECT id FROM public.barber_shops ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
