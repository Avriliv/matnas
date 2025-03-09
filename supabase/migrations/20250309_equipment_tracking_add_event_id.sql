-- Add event_id column to equipment_tracking table
ALTER TABLE equipment_tracking ADD COLUMN event_id UUID NULL REFERENCES events(id);

-- Add index for faster queries
CREATE INDEX equipment_tracking_event_id_idx ON equipment_tracking(event_id);
