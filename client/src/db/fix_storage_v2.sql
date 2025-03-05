-- Drop existing policy first
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Grant usage on storage schema
GRANT USAGE ON SCHEMA storage TO anon, authenticated;

-- Grant all on buckets
GRANT ALL ON storage.buckets TO anon, authenticated;

-- Grant all on objects
GRANT ALL ON storage.objects TO anon, authenticated;

-- Create the storage policy
CREATE POLICY "Public Access"
ON storage.objects FOR ALL
TO anon, authenticated
USING ( bucket_id = 'forms' )
WITH CHECK ( bucket_id = 'forms' );

-- Make sure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('forms', 'forms', true)
ON CONFLICT (id) DO UPDATE SET public = true;
