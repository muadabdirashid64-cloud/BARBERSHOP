-- ============================================
-- ENHANCED FEATURES FOR BARBER MANAGEMENT SYSTEM
-- ============================================

-- Home Service Bookings Table
CREATE TABLE home_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  address TEXT NOT NULL,
  location TEXT,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  assigned_barber_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  total_amount NUMERIC DEFAULT 0,
  home_service_fee NUMERIC DEFAULT 5.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shop Settings Table
CREATE TABLE shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL DEFAULT 'Classic Barber Shop',
  shop_logo_url TEXT,
  shop_address TEXT,
  shop_phone TEXT,
  shop_email TEXT,
  opening_time TIME DEFAULT '09:00',
  closing_time TIME DEFAULT '21:00',
  working_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  currency TEXT DEFAULT 'USD',
  tax_rate NUMERIC DEFAULT 0,
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Notes Table
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Barber Ratings Table
CREATE TABLE barber_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Barber Attendance Table
CREATE TABLE barber_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'holiday')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Favorites Table
CREATE TABLE customer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, service_id)
);

-- Audit Log Table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================
ALTER TABLE home_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR HOME_SERVICES
-- ============================================
CREATE POLICY "admin_all_home_services" ON home_services FOR ALL
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "barber_view_home_services" ON home_services FOR SELECT
  TO authenticated USING (
    assigned_barber_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "customer_view_own_home_services" ON home_services FOR SELECT
  TO authenticated USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================
-- RLS POLICIES FOR SHOP_SETTINGS
-- ============================================
CREATE POLICY "admin_all_shop_settings" ON shop_settings FOR ALL
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "anyone_read_shop_settings" ON shop_settings FOR SELECT
  TO authenticated, anon USING (true);

-- ============================================
-- RLS POLICIES FOR CUSTOMER_NOTES
-- ============================================
CREATE POLICY "admin_all_customer_notes" ON customer_notes FOR ALL
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "barber_read_customer_notes" ON customer_notes FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'barber'))
  );

-- ============================================
-- RLS POLICIES FOR BARBER_RATINGS
-- ============================================
CREATE POLICY "admin_all_barber_ratings" ON barber_ratings FOR ALL
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "barber_view_own_ratings" ON barber_ratings FOR SELECT
  TO authenticated USING (
    barber_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'barber'))
  );

CREATE POLICY "customer_insert_own_ratings" ON barber_ratings FOR INSERT
  TO authenticated WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );

-- ============================================
-- RLS POLICIES FOR BARBER_ATTENDANCE
-- ============================================
CREATE POLICY "admin_all_barber_attendance" ON barber_attendance FOR ALL
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "barber_view_own_attendance" ON barber_attendance FOR SELECT
  TO authenticated USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================
-- RLS POLICIES FOR CUSTOMER_FAVORITES
-- ============================================
CREATE POLICY "admin_all_customer_favorites" ON customer_favorites FOR ALL
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "customer_own_favorites" ON customer_favorites FOR ALL
  TO authenticated USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================
-- RLS POLICIES FOR AUDIT_LOG
-- ============================================
CREATE POLICY "admin_read_audit_log" ON audit_log FOR SELECT
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- ============================================
-- INDEXES FOR BETTER PERFORMANCE
-- ============================================
CREATE INDEX idx_home_services_status ON home_services(status);
CREATE INDEX idx_home_services_date ON home_services(appointment_date);
CREATE INDEX idx_home_services_barber ON home_services(assigned_barber_id);
CREATE INDEX idx_barber_ratings_barber ON barber_ratings(barber_id);
CREATE INDEX idx_barber_attendance_date ON barber_attendance(date);
CREATE INDEX idx_barber_attendance_employee ON barber_attendance(employee_id);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_home_services_updated_at BEFORE UPDATE ON home_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_settings_updated_at BEFORE UPDATE ON shop_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT DEFAULT SHOP SETTINGS
-- ============================================
INSERT INTO shop_settings (shop_name, shop_address, shop_phone, shop_email)
VALUES ('Classic Barber Shop', '123 Main Street, Downtown', '+1 234 567 8900', 'info@classicbarbershop.com');

-- ============================================
-- ADD FAVORITE BARBER TO CUSTOMERS
-- ============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS favorite_barber_id UUID REFERENCES employees(id) ON DELETE SET NULL;
