import { toast } from 'react-toastify';
import { Button } from '@mui/material';
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

// קונפיגורציה מותאמת להתראות לפי סוג
const notificationConfig = {
  task_reminder: {
    autoClose: 8000, // נשאר קצת יותר זמן
    icon: '📋',
    className: 'notification-task',
    position: "top-right",
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    rtl: true,
    theme: "light"
  },
  subtask_reminder: {
    autoClose: 6000,
    icon: '📌',
    className: 'notification-subtask',
    position: "top-right",
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    rtl: true,
    theme: "light"
  },
  urgent_reminder: {
    autoClose: 10000, // נשאר יותר זמן
    icon: '⚡',
    className: 'notification-urgent',
    position: "top-right",
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    rtl: true,
    theme: "light"
  }
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
const sendPushNotification = async (title, body, options = {}) => {
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
        requireInteraction: options.requireInteraction || false, // האם ההתראה תישאר עד ללחיצה
        actions: options.actions || [
          {
            action: 'explore',
            title: 'פתח את האפליקציה'
          },
          {
            action: 'close',
            title: 'סגור'
          }
        ],
        ...options
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
  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'לא הוגדר';

  const message = `✨ נוספה משימה חדשה\nכותרת: ${task.title}\nתאריך יעד: ${dueDate}`;

  // התראה בתוך האפליקציה
  toast.success(
    <div>
      <h4>✨ נוספה משימה חדשה</h4>
      <p><strong>כותרת:</strong> {task.title}</p>
      <p><strong>תאריך יעד:</strong> {dueDate}</p>
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

// בדיקת התראות מותאמות אישית
export const checkCustomNotifications = async (supabase) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const { data: notifications, error } = await supabase
      .from('task_notifications')
      .select(`
        *,
        tasks:task_id (
          id,
          title,
          due_date,
          subtasks
        )
      `)
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (error) throw error;

    notifications?.forEach(notification => {
      const task = notification.tasks;
      if (!task) return;

      switch (notification.type) {
        case 'before_due':
          if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const notifyDate = new Date(dueDate);
            notifyDate.setDate(dueDate.getDate() - notification.days_before);
            
            // בודק אם צריך להציג את ההתראה היום
            if (isSameDay(now, notifyDate)) {
              showCustomNotification(task, notification);
            }
          }
          break;

        case 'on_date':
          if (notification.notify_date && isSameDay(now, new Date(notification.notify_date))) {
            showCustomNotification(task, notification);
          }
          break;

        case 'on_status':
          // התראות על שינוי סטטוס מטופלות בנפרד בעת שינוי הסטטוס
          break;
      }
    });
  } catch (error) {
    console.error('שגיאה בבדיקת התראות מותאמות אישית:', error);
  }
};

// הצגת התראה מותאמת אישית
export const showCustomNotification = async (task, notification) => {
  const subtaskText = notification.subtask_index !== null && task.subtasks?.[notification.subtask_index]
    ? `\nתת-משימה: ${task.subtasks[notification.subtask_index]}`
    : '';

  // בדיקה אם המשימה דחופה (פחות מ-24 שעות)
  const isUrgent = task.due_date && 
    (new Date(task.due_date).getTime() - new Date().getTime()) < 24 * 60 * 60 * 1000;

  // בחירת קונפיגורציה מתאימה
  const config = isUrgent ? notificationConfig.urgent_reminder :
    subtaskText ? notificationConfig.subtask_reminder :
    notificationConfig.task_reminder;

  // יצירת כותרת דינמית
  const title = isUrgent ? '⚡ משימה דחופה!' :
    subtaskText ? '📌 תזכורת לתת-משימה' : '📋 תזכורת למשימה';

  // חישוב זמן שנותר
  let timeLeftText = '';
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const hoursLeft = Math.round((dueDate - now) / (1000 * 60 * 60));
    
    if (hoursLeft < 24) {
      timeLeftText = `נותרו ${hoursLeft} שעות`;
    } else {
      const daysLeft = Math.round(hoursLeft / 24);
      timeLeftText = `נותרו ${daysLeft} ימים`;
    }
  }

  // התראה בתוך האפליקציה
  toast.info(
    <div>
      <h4>{title}</h4>
      <p><strong>כותרת:</strong> {task.title}</p>
      {subtaskText && <p><strong>תת-משימה:</strong> {task.subtasks[notification.subtask_index]}</p>}
      {timeLeftText && <p><strong>{timeLeftText}</strong></p>}
      {task.description && <p><strong>תיאור:</strong> {task.description}</p>}
      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
        <Button 
          size="small" 
          variant="contained" 
          color="primary"
          onClick={() => {
            // TODO: לקפוץ למשימה הספציפית
            window.location.hash = `task-${task.id}`;
            toast.dismiss();
          }}
        >
          עבור למשימה
        </Button>
        {!isUrgent && (
          <Button 
            size="small"
            onClick={() => {
              // דחיית ההתראה ב-30 דקות
              setTimeout(() => showCustomNotification(task, notification), 30 * 60 * 1000);
              toast.dismiss();
            }}
          >
            תזכיר לי שוב בעוד 30 דקות
          </Button>
        )}
      </div>
    </div>,
    config
  );

  // התראת Push אם נבחרה האופציה
  if (notification.notification_method === 'browser' || notification.notification_method === 'both') {
    const message = `${title}\nכותרת: ${task.title}${subtaskText}${timeLeftText ? '\n' + timeLeftText : ''}`;
    await sendPushNotification(title, message, {
      icon: config.icon,
      badge: config.icon,
      actions: [
        {
          action: 'view',
          title: 'צפה במשימה'
        },
        {
          action: 'snooze',
          title: 'תזכיר לי שוב'
        }
      ]
    });
  }
};

// פונקציה לבדיקה אם שני תאריכים הם באותו יום
const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};
