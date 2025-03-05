-- טבלה לשמירת מידע על קבצים
CREATE TABLE IF NOT EXISTS form_files (
  id SERIAL PRIMARY KEY,
  folder_id INTEGER NOT NULL REFERENCES form_folders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- אינדקס על folder_id
CREATE INDEX IF NOT EXISTS form_files_folder_id_idx ON form_files(folder_id);

-- Enable RLS
ALTER TABLE form_files ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations"
ON form_files FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);
