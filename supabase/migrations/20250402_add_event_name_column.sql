-- הוספת עמודת event_name לטבלת equipment_tracking
ALTER TABLE equipment_tracking ADD COLUMN IF NOT EXISTS event_name TEXT;

-- עדכון הנתונים הקיימים (אם יש)
-- אם יש נתונים בעמודת event_id, אפשר להעתיק אותם לעמודת event_name
-- UPDATE equipment_tracking SET event_name = (SELECT name FROM events WHERE events.id = equipment_tracking.event_id) WHERE event_id IS NOT NULL;
