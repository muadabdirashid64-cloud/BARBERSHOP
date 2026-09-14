/*
# Add logo_url to barber_shops + storage bucket for shop logos

1. Schema Changes
   - Add `logo_url` (text, nullable) column to `barber_shops`.
   - Each barber shop can optionally store a logo image URL.
   - Existing shops get NULL (no logo) — they'll fall back to the default system logo.

2. Storage
   - Create a `shop-logos` storage bucket (public read) for uploading shop logo images.
   - RLS policies: any authenticated user can upload; anyone can read (public bucket).

3. Security
   - No changes to existing RLS policies on barber_shops.
   - The new column inherits existing policies (read_own_barber_shops, admin_read, super_admin_all).
*/

-- Add logo_url column
ALTER TABLE barber_shops ADD COLUMN IF NOT EXISTS logo_url text;

-- Create storage bucket for shop logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload, anyone can read
DROP POLICY IF EXISTS "shop_logos_read" ON storage.objects;
CREATE POLICY "shop_logos_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'shop-logos');

DROP POLICY IF EXISTS "shop_logos_upload" ON storage.objects;
CREATE POLICY "shop_logos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shop-logos');

DROP POLICY IF EXISTS "shop_logos_update" ON storage.objects;
CREATE POLICY "shop_logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'shop-logos') WITH CHECK (bucket_id = 'shop-logos');

DROP POLICY IF EXISTS "shop_logos_delete" ON storage.objects;
CREATE POLICY "shop_logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'shop-logos');
