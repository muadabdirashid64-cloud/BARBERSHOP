-- =====================================================
-- MULTI-SHOP SUPPORT: barber_shops table + shop_id on all business tables
-- =====================================================

-- 1. Create barber_shops table
CREATE TABLE IF NOT EXISTS public.barber_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  phone text,
  address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create a default shop from existing shop_settings
INSERT INTO public.barber_shops (name, location, phone, address, status)
SELECT
  COALESCE(shop_name, 'Classic Barber Shop'),
  shop_address,
  shop_phone,
  shop_address,
  'active'
FROM public.shop_settings
WHERE id = (SELECT id FROM public.shop_settings LIMIT 1)
ON CONFLICT DO NOTHING;

-- If no shop_settings row existed, create a default shop
INSERT INTO public.barber_shops (name, location, phone, address, status)
SELECT 'Classic Barber Shop', NULL, NULL, NULL, 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.barber_shops LIMIT 1);

-- 3. Add shop_id to profiles (nullable initially, will backfill)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_id uuid;

-- 4. Add shop_id to all business tables
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.home_services ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.barber_attendance ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.barber_ratings ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.customer_favorites ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.customer_notes ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS shop_id uuid;

-- 5. Backfill all existing rows with the default shop id
DO $$
DECLARE
  default_shop_id uuid;
BEGIN
  SELECT id INTO default_shop_id FROM public.barber_shops ORDER BY created_at LIMIT 1;

  UPDATE public.profiles SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.employees SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.customers SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.services SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.revenue SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.expenses SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.inventory SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.home_services SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.appointments SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.barber_attendance SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.barber_ratings SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.customer_favorites SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.customer_notes SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.notifications SET shop_id = default_shop_id WHERE shop_id IS NULL;
  UPDATE public.audit_log SET shop_id = default_shop_id WHERE shop_id IS NULL;
END $$;

-- 6. Add foreign keys
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.services
  ADD CONSTRAINT services_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.revenue
  ADD CONSTRAINT revenue_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.home_services
  ADD CONSTRAINT home_services_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.barber_attendance
  ADD CONSTRAINT barber_attendance_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.barber_ratings
  ADD CONSTRAINT barber_ratings_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.customer_favorites
  ADD CONSTRAINT customer_favorites_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.customer_notes
  ADD CONSTRAINT customer_notes_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.barber_shops(id) ON DELETE SET NULL;

-- 7. Create indexes on shop_id for performance
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON public.profiles(shop_id);
CREATE INDEX IF NOT EXISTS idx_employees_shop_id ON public.employees(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON public.services(shop_id);
CREATE INDEX IF NOT EXISTS idx_revenue_shop_id ON public.revenue(shop_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shop_id ON public.expenses(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shop_id ON public.inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_home_services_shop_id ON public.home_services(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON public.appointments(shop_id);
CREATE INDEX IF NOT EXISTS idx_barber_attendance_shop_id ON public.barber_attendance(shop_id);
CREATE INDEX IF NOT EXISTS idx_barber_ratings_shop_id ON public.barber_ratings(shop_id);
CREATE INDEX IF NOT EXISTS idx_notifications_shop_id ON public.notifications(shop_id);

-- 8. Enable RLS on barber_shops
ALTER TABLE public.barber_shops ENABLE ROW LEVEL SECURITY;

-- 9. Helper function: get current user's shop_id
CREATE OR REPLACE FUNCTION public.current_shop_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN (
    SELECT profiles.shop_id FROM public.profiles
    WHERE profiles.id = auth.uid()
  );
END;
$function$;

-- 10. Helper function: is_admin (updated with search_path already set)
-- (already exists, updated in prior migration)
