/*
# Create appointments table

1. New Tables
- `appointments`
  - `id` (uuid, primary key)
  - `customer_id` (uuid, references customers, nullable)
  - `employee_id` (uuid, references employees, nullable — which barber)
  - `service_id` (uuid, references services, nullable)
  - `customer_name` (text, nullable — walk-in name without customer record)
  - `service_name` (text, nullable — free-text service name)
  - `appointment_date` (date, not null)
  - `appointment_time` (text, nullable — time slot like "10:00")
  - `status` (text, not null, default 'pending' — pending, confirmed, completed, cancelled)
  - `price` (numeric, nullable)
  - `notes` (text, nullable)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `appointments`.
- Authenticated users (admin, barber, cashier) can read all appointments.
- Authenticated users can insert, update, and delete appointments.

3. Notes
- This table was previously dropped; recreated to support the barber appointment workflow.
- Walk-in customers (no customer record) are supported via `customer_name`.
- Free-text service names are supported via `service_name` for flexibility.
*/

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  customer_name text,
  service_name text,
  appointment_date date NOT NULL DEFAULT CURRENT_DATE,
  appointment_time text,
  status text NOT NULL DEFAULT 'pending',
  price numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_employee ON appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_appointments" ON appointments;
CREATE POLICY "select_appointments" ON appointments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_appointments" ON appointments;
CREATE POLICY "insert_appointments" ON appointments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_appointments" ON appointments;
CREATE POLICY "update_appointments" ON appointments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_appointments" ON appointments;
CREATE POLICY "delete_appointments" ON appointments FOR DELETE
  TO authenticated USING (true);
