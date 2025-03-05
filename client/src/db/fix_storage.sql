-- Allow public access to bucket
ALTER BUCKET forms FORCE PUBLIC;

-- Grant usage on storage schema
GRANT USAGE ON SCHEMA storage TO anon, authenticated;

-- Grant all on buckets
GRANT ALL ON storage.buckets TO anon, authenticated;

-- Grant all on objects
GRANT ALL ON storage.objects TO anon, authenticated;

-- Create or replace the storage policy
CREATE OR REPLACE POLICY "Public Access"
ON storage.objects FOR ALL
TO anon, authenticated
USING ( bucket_id = 'forms' )
WITH CHECK ( bucket_id = 'forms' );

-- Make sure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('forms', 'forms', true)
ON CONFLICT (id) DO UPDATE SET public = true;
