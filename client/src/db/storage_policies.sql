-- Enable storage for all users
CREATE POLICY "Enable storage for all users"
ON storage.objects FOR ALL USING (
  bucket_id = 'forms'
);

-- Enable read access for all users
CREATE POLICY "Give users read access to forms"
ON storage.objects FOR SELECT
USING (bucket_id = 'forms');

-- Enable insert access for all users
CREATE POLICY "Give users insert access to forms"
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'forms');

-- Enable update access for all users
CREATE POLICY "Give users update access to forms"
ON storage.objects FOR UPDATE
USING (bucket_id = 'forms');

-- Enable delete access for all users
CREATE POLICY "Give users delete access to forms"
ON storage.objects FOR DELETE
USING (bucket_id = 'forms');
