-- Fix: Cashier/barber/customer login blocked because they cannot SELECT from barber_shops
-- to check their own shop's status. RLS returns null, which the auth code interprets as "inactive".
--
-- Add a SELECT policy allowing any authenticated user to read ONLY the shop they belong to.
-- This does not expose other shops — the USING clause restricts to the user's own shop_id.

CREATE POLICY "read_own_barber_shop"
  ON barber_shops FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT profiles.shop_id
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.shop_id IS NOT NULL
    )
  );
