-- Make templates folder publicly readable in documents bucket
-- Run in Supabase SQL Editor

-- Public SELECT policy for templates folder only (safer than bucket.public=true)
DROP POLICY IF EXISTS "Public can read templates" ON storage.objects;
CREATE POLICY "Public can read templates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'templates'
);

-- Optional: Verify policy exists
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public can read templates';
