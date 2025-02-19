-- Create equipment_tracking table
CREATE TABLE IF NOT EXISTS equipment_tracking (
    id BIGSERIAL PRIMARY KEY,
    item_name TEXT NOT NULL,
    checkout_date DATE NOT NULL,
    return_date DATE,
    staff_member TEXT NOT NULL,
    borrower_name TEXT NOT NULL,
    signature TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    product_url TEXT,
    price DECIMAL(10, 2),
    include_vat BOOLEAN DEFAULT true,
    quote_file_url TEXT,
    quote_file_name TEXT
);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_equipment_tracking_updated_at
    BEFORE UPDATE ON equipment_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE equipment_tracking
ADD COLUMN IF NOT EXISTS vat DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS product_url text,
ADD COLUMN IF NOT EXISTS quote_file_url text,
ADD COLUMN IF NOT EXISTS quote_file_name text;
