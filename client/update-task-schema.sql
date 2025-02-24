-- עדכון ערכי ברירת המחדל והאילוצים של עמודת הסטטוס
ALTER TABLE tasks
ALTER COLUMN status SET DEFAULT 'TODO',
ADD CONSTRAINT tasks_status_check CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE'));

-- הוספת עמודות חדשות אם הן לא קיימות
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'type') THEN
        ALTER TABLE tasks ADD COLUMN type VARCHAR DEFAULT 'משימה';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'date') THEN
        ALTER TABLE tasks ADD COLUMN date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'subtasks') THEN
        ALTER TABLE tasks ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'responsible') THEN
        ALTER TABLE tasks ADD COLUMN responsible VARCHAR;
    END IF;
END $$;

-- Add owner column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'owner'
    ) THEN
        ALTER TABLE tasks ADD COLUMN owner TEXT;
    END IF;
END $$;
