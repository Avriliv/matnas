-- Update profiles table to include additional fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add some sample data for existing profiles
UPDATE profiles
SET 
  name = COALESCE(name, email),
  role = COALESCE(role, 'משתמש'),
  phone = COALESCE(phone, '');
