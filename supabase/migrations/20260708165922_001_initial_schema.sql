/*
# Barber Management System - Initial Schema

This migration creates the complete database schema for the Barber Management System.

## Tables Created:

1. **profiles** - User profiles extending auth.users with role-based access
2. **employees** - Barber/employee information and salary details
3. **customers** - Customer registration and tracking
4. **services** - Barber shop services (haircut, beard trim, etc.)
5. **appointments** - Customer appointment bookings
6. **inventory** - Shop inventory and supplies
7. **revenue** - Income tracking from various sources
8. **expenses** - Expense tracking by category
9. **notifications** - System notifications for users

## Security:
- RLS enabled on all tables
- Role-based policies (admin, barber, customer)
- Proper foreign key relationships
- Cascade deletes where appropriate

## Notes:
1. Uses Supabase auth.users for authentication
2. Profile role determines dashboard access
3. Employees link to profiles for login
4. Customers link to profiles for booking
*/

-- Create enum types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'barber', 'customer');
    CREATE TYPE appointment_status AS ENUM ('pending', 'approved', 'completed', 'cancelled');
    CREATE TYPE expense_category AS ENUM ('rent', 'electricity', 'water', 'salaries', 'supplies', 'maintenance', 'other');
    CREATE TYPE revenue_source AS ENUM ('haircut', 'beard_trim', 'hair_wash', 'hair_styling', 'facial', 'home_service', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text,
    address text,
    avatar_url text,
    role user_role NOT NULL DEFAULT 'customer',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Employees table (barbers)
CREATE TABLE IF NOT EXISTS employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    full_name text NOT NULL,
    email text UNIQUE NOT NULL,
    phone text,
    address text,
    experience text,
    salary decimal(10,2) NOT NULL DEFAULT 0,
    commission_rate decimal(5,2) DEFAULT 10.00,
    avatar_url text,
    specialization text,
    status text NOT NULL DEFAULT 'active',
    hire_date date DEFAULT CURRENT_DATE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    full_name text NOT NULL,
    email text UNIQUE NOT NULL,
    phone text,
    address text,
    notes text,
    total_visits integer DEFAULT 0,
    total_spent decimal(10,2) DEFAULT 0.00,
    last_visit date,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price decimal(10,2) NOT NULL,
    duration_minutes integer NOT NULL DEFAULT 30,
    category text,
    is_active boolean NOT NULL DEFAULT true,
    image_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
    service_id uuid REFERENCES services(id) ON DELETE SET NULL,
    appointment_date date NOT NULL,
    appointment_time time NOT NULL,
    end_time time,
    status appointment_status NOT NULL DEFAULT 'pending',
    notes text,
    total_amount decimal(10,2) NOT NULL DEFAULT 0,
    is_paid boolean DEFAULT false,
    payment_method text,
    home_service_address text,
    home_service_fee decimal(10,2) DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name text NOT NULL,
    category text NOT NULL,
    quantity integer NOT NULL DEFAULT 0,
    unit text DEFAULT 'piece',
    unit_price decimal(10,2) NOT NULL,
    supplier text,
    sku text,
    reorder_level integer DEFAULT 10,
    is_active boolean DEFAULT true,
    last_restocked date,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Revenue table
CREATE TABLE IF NOT EXISTS revenue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
    source revenue_source NOT NULL,
    amount decimal(10,2) NOT NULL,
    description text,
    payment_method text DEFAULT 'cash',
    transaction_date date NOT NULL DEFAULT CURRENT_DATE,
    received_by uuid REFERENCES employees(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category expense_category NOT NULL,
    amount decimal(10,2) NOT NULL,
    description text,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    vendor text,
    receipt_url text,
    is_recurring boolean DEFAULT false,
    recurring_frequency text,
    recorded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    is_read boolean DEFAULT false,
    related_id uuid,
    related_type text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_employee ON appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue(transaction_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check barber role
CREATE OR REPLACE FUNCTION is_barber()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'barber' 
        AND profiles.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check customer role
CREATE OR REPLACE FUNCTION is_customer()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'customer' 
        AND profiles.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
    TO authenticated USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT
    TO authenticated WITH CHECK (is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin" ON profiles FOR UPDATE
    TO authenticated USING (auth.uid() = id OR is_admin()) WITH CHECK (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
    TO authenticated USING (is_admin());

-- Employees policies
DROP POLICY IF EXISTS "employees_select" ON employees;
CREATE POLICY "employees_select" ON employees FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "employees_insert" ON employees;
CREATE POLICY "employees_insert" ON employees FOR INSERT
    TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "employees_update" ON employees;
CREATE POLICY "employees_update" ON employees FOR UPDATE
    TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "employees_delete" ON employees;
CREATE POLICY "employees_delete" ON employees FOR DELETE
    TO authenticated USING (is_admin());

-- Customers policies
DROP POLICY IF EXISTS "customers_select" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "customers_insert" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT
    TO authenticated WITH CHECK (is_admin() OR is_customer());

DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_update" ON customers FOR UPDATE
    TO authenticated USING (is_admin() OR profile_id = auth.uid());

DROP POLICY IF EXISTS "customers_delete" ON customers;
CREATE POLICY "customers_delete" ON customers FOR DELETE
    TO authenticated USING (is_admin());

-- Services policies
DROP POLICY IF EXISTS "services_select" ON services;
CREATE POLICY "services_select" ON services FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "services_insert" ON services;
CREATE POLICY "services_insert" ON services FOR INSERT
    TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "services_update" ON services;
CREATE POLICY "services_update" ON services FOR UPDATE
    TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "services_delete" ON services;
CREATE POLICY "services_delete" ON services FOR DELETE
    TO authenticated USING (is_admin());

-- Appointments policies
DROP POLICY IF EXISTS "appointments_select" ON appointments;
CREATE POLICY "appointments_select" ON appointments FOR SELECT
    TO authenticated USING (
        is_admin() OR
        employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
        customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "appointments_insert" ON appointments;
CREATE POLICY "appointments_insert" ON appointments FOR INSERT
    TO authenticated WITH CHECK (
        is_admin() OR is_barber() OR is_customer()
    );

DROP POLICY IF EXISTS "appointments_update" ON appointments;
CREATE POLICY "appointments_update" ON appointments FOR UPDATE
    TO authenticated USING (
        is_admin() OR
        employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
        customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "appointments_delete" ON appointments;
CREATE POLICY "appointments_delete" ON appointments FOR DELETE
    TO authenticated USING (
        is_admin() OR
        customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    );

-- Inventory policies
DROP POLICY IF EXISTS "inventory_select" ON inventory;
CREATE POLICY "inventory_select" ON inventory FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_insert" ON inventory;
CREATE POLICY "inventory_insert" ON inventory FOR INSERT
    TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "inventory_update" ON inventory;
CREATE POLICY "inventory_update" ON inventory FOR UPDATE
    TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "inventory_delete" ON inventory;
CREATE POLICY "inventory_delete" ON inventory FOR DELETE
    TO authenticated USING (is_admin());

-- Revenue policies
DROP POLICY IF EXISTS "revenue_select" ON revenue;
CREATE POLICY "revenue_select" ON revenue FOR SELECT
    TO authenticated USING (
        is_admin() OR received_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "revenue_insert" ON revenue;
CREATE POLICY "revenue_insert" ON revenue FOR INSERT
    TO authenticated WITH CHECK (is_admin() OR is_barber());

DROP POLICY IF EXISTS "revenue_update" ON revenue;
CREATE POLICY "revenue_update" ON revenue FOR UPDATE
    TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "revenue_delete" ON revenue;
CREATE POLICY "revenue_delete" ON revenue FOR DELETE
    TO authenticated USING (is_admin());

-- Expenses policies
DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT
    TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses FOR INSERT
    TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_update" ON expenses FOR UPDATE
    TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "expenses_delete" ON expenses;
CREATE POLICY "expenses_delete" ON expenses FOR DELETE
    TO authenticated USING (is_admin());

-- Notifications policies
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT
    TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
    TO authenticated WITH CHECK (is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
    TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE
    TO authenticated USING (user_id = auth.uid() OR is_admin());
