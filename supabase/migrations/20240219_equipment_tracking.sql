-- Drop existing table if exists
DROP TABLE IF EXISTS equipment_tracking;

-- Create equipment_tracking table
CREATE TABLE equipment_tracking (
    id BIGSERIAL PRIMARY KEY,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    checkout_date DATE NOT NULL,
    return_date DATE,
    staff_member TEXT NOT NULL,
    borrower_name TEXT NOT NULL,
    signature TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
