-- Promote the existing system owner from admin to super_admin
-- Only changes the role column; email, password, shop_id, and all other data remain untouched
UPDATE profiles
SET role = 'super_admin'
WHERE id = 'fa760c3c-17b7-433f-8ff2-6086544a432d'
  AND email = 'muadabdirashid64@gmail.com';
