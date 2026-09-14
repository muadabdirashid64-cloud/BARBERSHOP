/*
# Add employee_id to revenue table

1. Changes
- Adds `employee_id` (uuid, nullable) column to the `revenue` table.
- Adds a foreign key from `revenue.employee_id` to `employees.id` with ON DELETE SET NULL.
- This lets the cashier record which barber/employee earned a given revenue entry.
2. Security
- No RLS changes. Existing policies remain intact.
3. Notes
- The column is nullable so existing revenue rows are unaffected.
*/

ALTER TABLE revenue
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_employee_id ON revenue(employee_id);
