-- עדכון פריטי ציוד קיימים לפי קריטריונים
-- לדוגמה: עדכון כל הפריטים ששייכים לאירוע מסוים לפי שם השואל או תאריך

-- עדכון פריטים לאירוע 1 (יש להחליף את המספר באירוע הרצוי)
UPDATE equipment_tracking
SET event_id = 1
WHERE event_id IS NULL AND borrower_name LIKE '%שם השואל%';

-- עדכון פריטים לאירוע 2
UPDATE equipment_tracking
SET event_id = 2
WHERE event_id IS NULL AND item_name LIKE '%שם הפריט%';

-- עדכון פריטים לפי תאריך משיכה
UPDATE equipment_tracking
SET event_id = 3
WHERE event_id IS NULL AND checkout_date BETWEEN '2025-01-01' AND '2025-02-01';

-- הערה: יש להתאים את השאילתות לפי הנתונים שלך
-- החלף את המספרים של האירועים, שמות השואלים, שמות הפריטים והתאריכים בהתאם לצורך
