-- Create the forms bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('forms', 'forms')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public access
CREATE POLICY "Public Access"
ON storage.objects FOR ALL
USING ( bucket_id = 'forms' )
WITH CHECK ( bucket_id = 'forms' );
