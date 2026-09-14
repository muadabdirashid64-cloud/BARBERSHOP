/*
# Drop appointments table

1. Changes
- Drops the `appointments` table and all its data. The appointments feature has been removed from the system entirely.
- Also drops related indexes (they go away with the table).
2. Security
- No RLS policies remain (table is gone).
3. Notes
- This is a destructive operation but explicitly requested by the user: the system should not have any appointments feature.
- The `appointment_status` enum type is left in place (harmless); dropping enum types is not necessary.
*/

DROP TABLE IF EXISTS appointments CASCADE;
