-- פונקציה להוספת עמודת responsible
CREATE OR REPLACE FUNCTION add_responsible_column()
RETURNS void AS $$
BEGIN
    -- בדיקה אם העמודה כבר קיימת
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tasks'
        AND column_name = 'responsible'
    ) THEN
        -- הוספת העמודה אם היא לא קיימת
        ALTER TABLE tasks ADD COLUMN responsible VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql;
