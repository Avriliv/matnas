import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// קונפיגורציה בסיסית להתראות
const toastConfig = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  rtl: true,
  theme: "light"
};

// בקשת אישור להתראות Push
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('דפדפן זה אינו תומך בהתראות');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('שגיאה בבקשת אישור להתראות:', error);
    return false;
  }
};

// שליחת התראת Push
const sendPushNotification = async (title, body) => {
  if (Notification.permission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        dir: 'rtl',
        lang: 'he',
        vibrate: [100, 50, 100],
        actions: [
          {
            action: 'explore',
            title: 'פתח את האפליקציה'
          },
          {
            action: 'close',
            title: 'סגור'
          }
        ]
      });
    } catch (error) {
      console.error('שגיאה בשליחת התראת Push:', error);
    }
  }
};

// התראה על משימה שמתקרבת
export const showUpcomingTaskNotification = async (task) => {
  const subtasks = task.subtasks?.map(st => `- ${st.title}`).join('\n') || '';
  const message = `📅 תזכורת: משימה בעוד 7 ימים\nכותרת: ${task.title}${subtasks ? `\nתתי משימות:\n${subtasks}` : ''}\nתאריך יעד: ${new Date(task.due_date).toLocaleDateString('he-IL')}`;
  
  // התראה בתוך האפליקציה
  toast.info(
    <div>
      <h4>📅 תזכורת: משימה בעוד 7 ימים</h4>
      <p><strong>כותרת:</strong> {task.title}</p>
      {subtasks && (
        <>
          <p><strong>תתי משימות:</strong></p>
          <pre>{subtasks}</pre>
        </>
      )}
      <p><strong>תאריך יעד:</strong> {new Date(task.due_date).toLocaleDateString('he-IL')}</p>
    </div>,
    toastConfig
  );

  // התראת Push
  await sendPushNotification('תזכורת למשימה', message);
};

// התראה על אירוע מחלקתי שמתקרב
export const showUpcomingDepartmentEventNotification = async (event) => {
  const message = `🎉 תזכורת: אירוע מחלקתי בעוד 7 ימים\nאירוע: ${event.title}\nתאריך: ${new Date(event.start_date).toLocaleDateString('he-IL')}`;

  // התראה בתוך האפליקציה
  toast.info(
    <div>
      <h4>🎉 תזכורת: אירוע מחלקתי בעוד 7 ימים</h4>
      <p><strong>אירוע:</strong> {event.title}</p>
      <p><strong>תאריך:</strong> {new Date(event.start_date).toLocaleDateString('he-IL')}</p>
    </div>,
    toastConfig
  );

  // התראת Push
  await sendPushNotification('תזכורת לאירוע מחלקתי', message);
};

// התראה על הוספת משימה חדשה
export const showNewTaskNotification = async (task) => {
  const message = `✨ נוספה משימה חדשה\nכותרת: ${task.title}\nתאריך יעד: ${new Date(task.due_date).toLocaleDateString('he-IL')}`;

  // התראה בתוך האפליקציה
  toast.success(
    <div>
      <h4>✨ נוספה משימה חדשה</h4>
      <p><strong>כותרת:</strong> {task.title}</p>
      <p><strong>תאריך יעד:</strong> {new Date(task.due_date).toLocaleDateString('he-IL')}</p>
    </div>,
    toastConfig
  );

  // התראת Push
  await sendPushNotification('משימה חדשה', message);
};

// התראה על הוספת תת-משימה חדשה
export const showNewSubtaskNotification = async (parentTask, subtask) => {
  const message = `📌 נוספה תת-משימה חדשה\nלמשימה: ${parentTask.title}\nתת-משימה: ${subtask.title}`;

  // התראה בתוך האפליקציה
  toast.success(
    <div>
      <h4>📌 נוספה תת-משימה חדשה</h4>
      <p><strong>למשימה:</strong> {parentTask.title}</p>
      <p><strong>תת-משימה:</strong> {subtask.title}</p>
    </div>,
    toastConfig
  );

  // התראת Push
  await sendPushNotification('תת-משימה חדשה', message);
};

// בדיקת משימות ואירועים קרובים
export const checkUpcomingItems = async (tasks, events) => {
  const today = new Date();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);
  
  // פונקציה לבדיקה אם שני תאריכים הם באותו יום
  const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // פונקציה לבדיקה אם תאריך הוא בעוד 7 ימים
  const isInSevenDays = (dateStr) => {
    const date = new Date(dateStr);
    return isSameDay(date, sevenDaysFromNow);
  };

  // בדיקת משימות
  tasks?.forEach(task => {
    if (task.due_date && isInSevenDays(task.due_date)) {
      showUpcomingTaskNotification(task);
    }
  });

  // בדיקת אירועים
  events?.forEach(event => {
    if (event.start_date && isInSevenDays(event.start_date)) {
      showUpcomingDepartmentEventNotification(event);
    }
  });
};
