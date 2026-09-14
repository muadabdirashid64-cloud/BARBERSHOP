/*
# Seed Data for Barber Management System

This migration seeds the database with realistic sample data for testing and demonstration.

## Data Includes:
1. Default services (Hair Cut, Beard Trim, etc.)
2. Sample employees (barbers)
3. Sample customers
4. Sample appointments
5. Sample inventory items
6. Sample revenue records
7. Sample expenses
*/

-- Insert default services
INSERT INTO services (name, description, price, duration_minutes, category, is_active) VALUES
('Hair Cut', 'Professional haircut with styling', 25.00, 30, 'Hair Care', true),
('Beard Trim', 'Expert beard trimming and shaping', 15.00, 20, 'Beard Care', true),
('Hair Wash', 'Relaxing hair wash with massage', 10.00, 15, 'Hair Care', true),
('Hair Styling', 'Premium hair styling service', 20.00, 25, 'Hair Care', true),
('Facial Treatment', 'Deep cleansing facial treatment', 35.00, 45, 'Skin Care', true),
('Home Service', 'At-home barber service (+ extra fee)', 40.00, 60, 'Special', true),
('Kids Haircut', 'Gentle haircut for children under 12', 18.00, 25, 'Hair Care', true),
('Hot Towel Shave', 'Classic hot towel shave experience', 20.00, 30, 'Beard Care', true),
('Hair Coloring', 'Professional hair coloring service', 50.00, 60, 'Hair Care', true),
('Scalp Treatment', 'Therapeutic scalp treatment', 30.00, 30, 'Hair Care', true)
ON CONFLICT DO NOTHING;

-- Insert sample employees
INSERT INTO employees (full_name, email, phone, address, experience, salary, commission_rate, specialization, status) VALUES
('Marcus Johnson', 'marcus@barbershop.com', '+1 555-0101', '123 Main St, New York', '10 years', 3500.00, 15, 'Classic Cuts, Fades', 'active'),
('David Williams', 'david@barbershop.com', '+1 555-0102', '456 Oak Ave, New York', '8 years', 3200.00, 12, 'Beard Styling, Hot Shaves', 'active'),
('James Thompson', 'james@barbershop.com', '+1 555-0103', '789 Pine Rd, New York', '5 years', 2800.00, 10, 'Modern Styles, Hair Coloring', 'active'),
('Michael Brown', 'michael@barbershop.com', '+1 555-0104', '321 Elm St, New York', '7 years', 3000.00, 12, 'Hair Treatments, Scalp Care', 'active'),
('Robert Davis', 'robert@barbershop.com', '+1 555-0105', '654 Cedar Ln, New York', '12 years', 4000.00, 18, 'Executive Services, All Styles', 'active')
ON CONFLICT DO NOTHING;

-- Insert sample customers
INSERT INTO customers (full_name, email, phone, address, total_visits, total_spent) VALUES
('John Smith', 'john.smith@email.com', '+1 555-1001', '111 First St, New York', 5, 125.00),
('Michael Johnson', 'michael.j@email.com', '+1 555-1002', '222 Second Ave, New York', 3, 75.00),
('David Lee', 'david.lee@email.com', '+1 555-1003', '333 Third Rd, New York', 8, 240.00),
('Chris Anderson', 'chris.a@email.com', '+1 555-1004', '444 Fourth St, New York', 2, 50.00),
('Ryan Martinez', 'ryan.m@email.com', '+1 555-1005', '555 Fifth Ave, New York', 6, 180.00),
('Daniel Garcia', 'daniel.g@email.com', '+1 555-1006', '666 Sixth St, New York', 4, 100.00),
('Matthew Wilson', 'matthew.w@email.com', '+1 555-1007', '777 Seventh Rd, New York', 1, 25.00),
('Andrew Taylor', 'andrew.t@email.com', '+1 555-1008', '888 Eighth Ave, New York', 10, 300.00),
('Thomas Moore', 'thomas.m@email.com', '+1 555-1009', '999 Ninth St, New York', 7, 175.00),
('Kevin Jackson', 'kevin.j@email.com', '+1 555-1010', '101 Tenth Ave, New York', 3, 90.00)
ON CONFLICT DO NOTHING;

-- Insert sample inventory
INSERT INTO inventory (product_name, category, quantity, unit, unit_price, supplier, sku, reorder_level) VALUES
('Premium Shampoo', 'Shampoo', 25, 'bottle', 15.99, 'Beauty Supply Co', 'SHM-001', 10),
('Conditioner', 'Conditioner', 20, 'bottle', 12.99, 'Beauty Supply Co', 'CND-001', 8),
('Hair Gel', 'Styling', 30, 'piece', 8.99, 'Style Masters', 'GEL-001', 15),
('Beard Oil', 'Beard Care', 40, 'bottle', 18.99, 'Beard Bros', 'BDO-001', 20),
('Shaving Cream', 'Shaving', 35, 'tube', 6.99, 'Classic Shave Inc', 'SHV-001', 15),
('After Shave', 'Skin Care', 28, 'bottle', 14.99, 'Classic Shave Inc', 'AFS-001', 12),
('Hair Spray', 'Styling', 22, 'piece', 10.99, 'Style Masters', 'HSP-001', 10),
('Towels', 'Supplies', 50, 'piece', 5.00, 'Textile World', 'TWL-001', 20),
('Cape', 'Supplies', 15, 'piece', 12.00, 'Textile World', 'CAP-001', 5),
('Scissors Set', 'Tools', 8, 'piece', 45.00, 'Pro Tools', 'SCT-001', 3),
('Clippers', 'Tools', 6, 'piece', 89.99, 'Pro Tools', 'CLP-001', 2),
('Combs', 'Supplies', 60, 'piece', 2.50, 'Generic Supplies', 'CMB-001', 30)
ON CONFLICT DO NOTHING;

-- Insert sample appointments for the current and recent dates
INSERT INTO appointments (customer_id, employee_id, service_id, appointment_date, appointment_time, status, total_amount)
SELECT 
  c.id,
  e.id,
  s.id,
  current_date - floor(random() * 30)::integer,
  (9 + floor(random() * 9))::integer * interval '1 hour',
  CASE floor(random() * 4)::integer
    WHEN 0 THEN 'completed'::appointment_status
    WHEN 1 THEN 'completed'::appointment_status
    WHEN 2 THEN 'approved'::appointment_status
    ELSE 'pending'::appointment_status
  END,
  s.price
FROM customers c
CROSS JOIN employees e
CROSS JOIN services s
WHERE floor(random() * 100) < 5
LIMIT 50
ON CONFLICT DO NOTHING;

-- Insert sample revenue from completed appointments
INSERT INTO revenue (source, amount, description, payment_method, transaction_date)
SELECT 
  CASE 
    WHEN s.name LIKE '%Hair Cut%' OR s.name LIKE '%Cut%' THEN 'haircut'::revenue_source
    WHEN s.name LIKE '%Beard%' THEN 'beard_trim'::revenue_source
    WHEN s.name LIKE '%Wash%' THEN 'hair_wash'::revenue_source
    WHEN s.name LIKE '%Style%' THEN 'hair_styling'::revenue_source
    WHEN s.name LIKE '%Facial%' THEN 'facial'::revenue_source
    WHEN s.name LIKE '%Home%' THEN 'home_service'::revenue_source
    ELSE 'other'::revenue_source
  END,
  a.total_amount,
  s.name || ' service',
  CASE floor(random() * 3)::integer
    WHEN 0 THEN 'cash'::text
    WHEN 1 THEN 'card'::text
    ELSE 'mobile'::text
  END,
  a.appointment_date
FROM appointments a
JOIN services s ON s.id = a.service_id
WHERE a.status = 'completed'
ON CONFLICT DO NOTHING;

-- Insert sample expenses for current month
INSERT INTO expenses (category, amount, description, expense_date, vendor, is_recurring) VALUES
('rent', 2500.00, 'Monthly shop rent', date_trunc('month', current_date)::date, 'Property Management LLC', true),
('electricity', 180.00, 'Electric bill', (current_date - 5)::date, 'City Power', false),
('water', 45.00, 'Water bill', (current_date - 10)::date, 'City Water', false),
('supplies', 320.50, 'Monthly supplies order', (current_date - 3)::date, 'Beauty Supply Co', false),
('maintenance', 150.00, 'Equipment maintenance', (current_date - 8)::date, 'Tool Repair Inc', false),
('salaries', 15000.00, 'Monthly salaries', (current_date - 2)::date, 'Payroll', true),
('supplies', 89.99, 'Towels and capes', (current_date - 12)::date, 'Textile World', false),
('maintenance', 75.00, 'Clipper maintenance', (current_date - 7)::date, 'Pro Tools', false),
('other', 50.00, 'Miscellaneous expenses', (current_date - 4)::date, 'Various', false)
ON CONFLICT DO NOTHING;
