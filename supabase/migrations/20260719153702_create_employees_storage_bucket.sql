/*
# Employees storage bucket and public read policy

1. Changes
- Ensures a public `employees` storage bucket exists for employee avatar/photo uploads.
- Adds a storage policy allowing public read access to objects in the `employees` bucket.
- Adds a policy allowing authenticated users to upload to the `employees` bucket.
2. Security
- Bucket is public (read-only) so avatar URLs are accessible by the app.
- Only authenticated users can upload.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('employees', 'employees', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read for employees bucket" ON storage.objects;
CREATE POLICY "Public read for employees bucket"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'employees');

DROP POLICY IF EXISTS "Authenticated upload to employees bucket" ON storage.objects;
CREATE POLICY "Authenticated upload to employees bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'employees');
