import { supabase } from '../supabaseClient';

const events = [
  {
    title: 'כנס חשיפה שנות שירות ומכינות',
    type: 'אירוע מועצתי',
    start_date: '2024-09-11',
    description: null
  },
  {
    title: 'ערב פתיחת שנה',
    type: 'אירוע מועצתי',
    start_date: '2024-09-19',
    description: null
  },
  {
    title: 'כנס פתיחה לצוותי שנות התבגרות מועצתי',
    type: 'אירוע מועצתי',
    start_date: '2024-09-24',
    description: null
  },
  {
    title: 'סמינר פתיחת שנה (כחולים)',
    type: 'אירוע מועצתי',
    start_date: '2024-09-27',
    end_date: '2024-09-28',
    description: null
  },
  {
    title: 'הרמת כוסית חגי תשרי',
    type: 'אירוע',
    start_date: '2024-09-30',
    description: null
  },
  {
    title: 'הכנה לחג תנועות הנוער',
    type: 'אירוע',
    start_date: '2024-10-08',
    description: null
  },
  {
    title: 'חג תנועות הנוער',
    type: 'אירוע מועצתי',
    start_date: '2024-10-15',
    description: null
  },
  {
    title: 'טיול סתיו א-ג',
    type: 'טיול מועצתי',
    start_date: '2024-10-20',
    description: null
  },
  {
    title: 'סמינר פתיחת שנה - חינוך בעיתות מלחמה',
    type: 'אירוע מועצתי',
    start_date: '2024-10-29',
    description: null
  },
  {
    title: 'סמינר פתיחת שנה (קהילה)',
    type: 'אירוע מועצתי',
    start_date: '2024-11-01',
    end_date: '2024-11-02',
    description: null
  },
  {
    title: 'בונים תקווה - אירוע לזכר יצחק רבין',
    type: 'אירוע מועצתי',
    start_date: '2024-11-12',
    description: null
  },
  {
    title: 'תערוכה ליום הזיכרון הטרנסי',
    type: 'אירוע',
    start_date: '2024-11-17',
    end_date: '2024-11-23',
    description: null
  },
  {
    title: 'הכנת מדריכים - מסע יב',
    type: 'אירוע',
    start_date: '2024-11-25',
    end_date: '2024-11-26',
    description: null
  },
  {
    title: 'נשף חורף',
    type: 'אירוע מועצתי',
    start_date: '2024-12-25',
    description: null
  },
  {
    title: 'כנס מובילים שנת התבגרות',
    type: 'אירוע מועצתי',
    start_date: '2025-02-07',
    end_date: '2025-02-08',
    description: null
  },
  {
    title: 'טיול חורף א-ג',
    type: 'טיול מועצתי',
    start_date: '2025-02-21',
    description: null
  },
  {
    title: 'הכנת מדריכים לכנס יא',
    type: 'אירוע',
    start_date: '2025-02-26',
    description: null
  },
  {
    title: 'טיול נעורים חניתה נמרוד',
    type: 'טיול ישובי',
    start_date: '2025-03-06',
    end_date: '2025-03-07',
    description: null
  },
  {
    title: 'הכנת מדצים למחנה פסח',
    type: 'אירוע',
    start_date: '2025-03-07',
    end_date: '2025-03-08',
    description: null
  },
  {
    title: 'טיול נעורים רגבה נריה',
    type: 'טיול ישובי',
    start_date: '2025-03-07',
    end_date: '2025-03-08',
    description: null
  },
  {
    title: 'כנס יא',
    type: 'אירוע מועצתי',
    start_date: '2025-03-20',
    end_date: '2025-03-22',
    description: null
  },
  {
    title: 'מסע BIG',
    type: 'מפעל חיצוני',
    start_date: '2025-03-27',
    end_date: '2025-03-29',
    description: null
  },
  {
    title: 'טיול נעורים רגבה נריה',
    type: 'טיול ישובי',
    start_date: '2025-03-28',
    end_date: '2025-03-29',
    description: null
  },
  {
    title: 'חלוץ מחנה פסח',
    type: 'אירוע מועצתי',
    start_date: '2025-04-06',
    description: null
  },
  {
    title: 'מחנה פסח',
    type: 'אירוע מועצתי',
    start_date: '2025-04-07',
    end_date: '2025-04-08',
    description: null
  },
  {
    title: 'מסע נוער אדמית נמרוד',
    type: 'טיול ישובי',
    start_date: '2025-04-10',
    end_date: '2025-04-11',
    description: null
  },
  {
    title: 'טיול אביב א-ג',
    type: 'טיול מועצתי',
    start_date: '2025-04-15',
    description: null
  },
  {
    title: 'ימי הבנה',
    type: 'אירוע מועצתי',
    start_date: '2025-05-12',
    end_date: '2025-05-14',
    description: null
  },
  {
    title: 'מסע אתגר (כרמל)',
    type: 'מפעל חיצוני',
    start_date: '2025-05-15',
    end_date: '2025-05-17',
    description: null
  },
  {
    title: 'ערב הוקרה לצוותי חינוך בלתי פורמלי',
    type: 'אירוע מועצתי',
    start_date: '2025-05-29',
    description: null
  }
];

async function insertEvents() {
  for (const event of events) {
    try {
      const { error } = await supabase.from('events').insert([event]);
      if (error) throw error;
      console.log(`הוספת האירוע "${event.title}" בוצעה בהצלחה`);
    } catch (error) {
      console.error(`שגיאה בהוספת האירוע "${event.title}":`, error.message);
    }
  }
}

insertEvents();
