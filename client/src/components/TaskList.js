import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
  AvatarGroup,
  Tooltip,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ExportButtons from './ExportButtons';
import { 
  showNewTaskNotification, 
  showNewSubtaskNotification,
  checkCustomNotifications,
  showCustomNotification 
} from '../services/notificationService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TASK_STATUS = {
  TODO: 'לביצוע',
  IN_PROGRESS: 'בתהליך',
  DONE: 'הושלם'
};

const TASK_TYPES = [
  'משימה',
  'באג',
  'פיצ׳ר',
  'שיפור',
  'מחקר',
  'תיעוד',
  'אחר'
];

const PRIORITY_LABELS = {
  'LOW': 'נמוכה',
  'MEDIUM': 'בינונית',
  'HIGH': 'גבוהה',
  'URGENT': 'דחופה'
};

const getPriorityColor = (priority, alpha = 1) => {
  const colors = {
    'LOW': `rgba(76, 175, 80, ${alpha})`,
    'MEDIUM': `rgba(33, 150, 243, ${alpha})`,
    'HIGH': `rgba(255, 152, 0, ${alpha})`,
    'URGENT': `rgba(244, 67, 54, ${alpha})`
  };
  return colors[priority] || colors['MEDIUM'];
};

const eventTypes = [
  'משימה',
  'אירוע',
  'פגישה',
  'טיול מועצתי',
  'טיול ישובי',
  'אירוע מועצתי',
  'מפעל חיצוני',
  'אחר'
];

// רשימת צוות המתנ"ס
const teamMembersData = [
  { id: 'team-1', name: 'טל רובין', role: 'מנהלת המחלקה לחינוך בלתי פורמלי', email: 'noaryeladim@mta.org.il', phone: '050-6952119' },
  { id: 'team-2', name: 'אור בן שמעון', role: 'מנהל מרכז ההדרכה לחינוך בלתי פורמלי', email: 'soninon@gmail.com', phone: '052-6774682' },
  { id: 'team-3', name: 'מירב הבר', role: 'אדמינסטרציה', email: 'shluhot@mta.org.il', phone: '050-6675657' },
  { id: 'team-4', name: 'בעז בן פורת', role: 'רכז אשכול מרכז', email: 'boazbp4@gmail.com', phone: '052-8011478' },
  { id: 'team-5', name: 'אור אסייג', role: 'רכז אשכול ישובים מפונים', email: 'orassiag@gmail.com', phone: '054-7281154' },
  { id: 'team-6', name: 'גילת גלוסמן', role: 'רכזת אשכול צפון', email: 'gilatglusman@gmail.com', phone: '054-6887446' },
  { id: 'team-7', name: 'טל שני', role: 'רכז אשכול דרום', email: 'darommta@gmail.com', phone: '052-6178480' },
  { id: 'team-8', name: 'חן סגי בליך', role: 'רכזת תוכנית להב"ה', email: 'chensagi289@gmail.com', phone: '054-5897291' },
  { id: 'team-9', name: 'נעם גולובטי', role: 'מנהלת רשותית הרשות לביטחון קהילתי', email: 'harashutbk@mta.org.il', phone: '054-9732663' },
  { id: 'team-10', name: 'לי הרמן', role: 'רכזת תחום ילדים - להב"ה', email: 'leeherman90@gmail.com', phone: '054-5652341' },
  { id: 'team-11', name: 'אוריין כפרי', role: 'רכזת מיניות בריאה', email: 'oriancafri26@gmail.com', phone: '050-7844474' },
  { id: 'team-12', name: 'ענת בן צבי', role: 'רכזת מרחבים בטוחים', email: 'anatbz11@gmail.com', phone: '054-6904888' },
  { id: 'team-13', name: 'בר יערי', role: 'רכזת תוכנית דילר', email: 'diller.matteasher@gmail.com', phone: '052-6218216' },
  { id: 'team-14', name: 'זיו לס', role: 'רכז השומר הצעיר', email: 'ziv.l@shmerhtz.org.il', phone: '054-4220098' },
  { id: 'team-15', name: 'ורד אסף', role: 'רכזת השומר הצעיר', email: 'vered.a@shomerhtz.org.il', phone: '050-9017778' },
  { id: 'team-16', name: 'נגה עובדיה', role: 'רכזת התנועה החדשה', email: 'hadasha.ma@mta.org.il', phone: '052-8011112' },
  { id: 'team-17', name: 'ענבל גל', role: 'רכזת בני המושבים', email: 'inbalinba78@gmail.com', phone: '052-3528335' },
  { id: 'team-18', name: 'צליל וייסברג', role: 'רכזת תחום השלב הבא', email: 'next.stage@mta.org', phone: '052-2441040' },
  { id: 'team-19', name: 'שחר עובדיה', role: 'רכזת שנת השירות במטה אשר', email: 'shaharovadia31@gmail.com', phone: '052-8011333' },
  { id: 'team-20', name: 'עדי ביאליק', role: 'רכזת קומונת שמרת', email: 'adibialik@gmail.com', phone: '050-4422429' },
  { id: 'team-21', name: 'ג\'ו סמושי', role: 'רכזת פנאי וקהילה- שנות מצווה', email: 'pk3@mta.org.il', phone: '054-5600224' },
  { id: 'team-22', name: 'הדס צימרמן', role: 'רכזת פנאי וקהילה - מועדון הורים', email: 'hadaszimm@gmail.com', phone: '052-3552887' },
  { id: 'team-23', name: 'אברי לבני', role: 'רכז מפעלים וטיולים', email: 'avrimatnas@gmail.com', phone: '050-9806013' }
];

// משימות לדוגמה מותאמות לצוות המתנ"ס
const sampleTasks = [
  {
    id: 'sample-1',
    title: 'תיאום פעילות קיץ לנוער',
    description: 'תיאום פעילויות קיץ לבני נוער במטה אשר, כולל סדנאות, טיולים ופעילויות העשרה',
    status: 'TODO',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 15 * 86400000).toISOString(), // 15 ימים מהיום
    subtasks: [
      { title: 'תיאום מדריכים', completed: true },
      { title: 'הזמנת אוטובוסים', completed: false },
      { title: 'תיאום מקומות לינה', completed: false },
      { title: 'הכנת תוכנית פעילות', completed: true }
    ],
    owner: { id: 'team-1', name: 'טל רובין', email: 'noaryeladim@mta.org.il' }
  },
  {
    id: 'sample-2',
    title: 'ישיבת צוות חודשית',
    description: 'ישיבת צוות של המחלקה לחינוך בלתי פורמלי לסיכום החודש ותכנון החודש הבא',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString(), // 3 ימים מהיום
    subtasks: [
      { title: 'הכנת מצגת', completed: true },
      { title: 'תיאום חדר ישיבות', completed: true },
      { title: 'שליחת זימונים', completed: true },
      { title: 'הכנת סיכום פעילות חודשית', completed: false }
    ],
    owner: { id: 'team-2', name: 'אור בן שמעון', email: 'soninon@gmail.com' }
  },
  {
    id: 'sample-3',
    title: 'ארגון טיול שנתי',
    description: 'ארגון הטיול השנתי לבני הנוער באזור הצפון, כולל תיאום הסעות, מדריכים ופעילויות',
    status: 'TODO',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 30 * 86400000).toISOString(), // חודש מהיום
    subtasks: [
      { title: 'בחירת מסלול', completed: true },
      { title: 'תיאום עם רשות הטבע והגנים', completed: false },
      { title: 'הזמנת אוטובוסים', completed: false },
      { title: 'גיוס מדריכים', completed: true },
      { title: 'הכנת ציוד', completed: false }
    ],
    owner: { id: 'team-23', name: 'אברי לבני', email: 'avrimatnas@gmail.com' }
  },
  {
    id: 'sample-4',
    title: 'הכנת תקציב שנתי',
    description: 'הכנת התקציב השנתי למחלקה לחינוך בלתי פורמלי',
    status: 'DONE',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() - 10 * 86400000).toISOString(), // 10 ימים לפני היום
    subtasks: [
      { title: 'איסוף נתונים מהשנה הקודמת', completed: true },
      { title: 'פגישה עם מנהלת המחלקה', completed: true },
      { title: 'הכנת מצגת', completed: true },
      { title: 'הגשה להנהלה', completed: true }
    ],
    owner: { id: 'team-3', name: 'מירב הבר', email: 'shluhot@mta.org.il' }
  },
  {
    id: 'sample-5',
    title: 'פיתוח תוכנית חדשה לנוער בסיכון',
    description: 'פיתוח תוכנית חדשה לעבודה עם נוער בסיכון באזור מטה אשר',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 45 * 86400000).toISOString(), // 45 ימים מהיום
    subtasks: [
      { title: 'מיפוי צרכים', completed: true },
      { title: 'פגישה עם אנשי מקצוע', completed: true },
      { title: 'כתיבת תוכנית', completed: false },
      { title: 'גיוס תקציב', completed: false },
      { title: 'גיוס כוח אדם', completed: false }
    ],
    owner: { id: 'team-9', name: 'נעם גולובטי', email: 'harashutbk@mta.org.il' }
  }
];

const TaskList = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskDialog, setTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'TODO',
    type: 'משימה',
    customType: '',
    date: null,
    subtasks: [],
    owner: ''
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newSubtask, setNewSubtask] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [selectedNotificationTask, setSelectedNotificationTask] = useState(null);
  const [selectedSubtaskIndex, setSelectedSubtaskIndex] = useState(null);
  const [notificationDialog, setNotificationDialog] = useState(false);
  const [newNotification, setNewNotification] = useState({
    type: 'before_due',
    days_before: 1,
    notify_date: null,
    status: 'DONE',
    notification_method: 'email',
    repeat: 'once',
    enabled: true
  });

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        
        // בדיקה אם יש חיבור לסופאבייס
        let session;
        try {
          const { data } = await supabase.auth.getSession();
          session = data.session;
        } catch (err) {
          console.error('Error getting session:', err);
          session = null;
        }
        
        if (!session) {
          // אם אין משתמש מחובר, נציג משימות לדוגמה במקום
          setTasks(sampleTasks);
          setError('אין חיבור לשרת. מוצגות משימות לדוגמה.');
          return;
        }
        
        try {
          // שינוי השאילתה כדי להימנע מבעיות ביחסים בין טבלאות
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error in Supabase query:', error);
            setTasks(sampleTasks);
            setError('שגיאה בטעינת המשימות. מוצגות משימות לדוגמה.');
            return;
          }
          
          // אם אין נתונים, נציג משימות לדוגמה
          if (!data || data.length === 0) {
            setTasks(sampleTasks);
            setError('לא נמצאו משימות. מוצגות משימות לדוגמה.');
            return;
          }
          
          // אם יש נתונים, ננסה להשלים מידע על הבעלים בנפרד
          if (data && data.length > 0) {
            // יצירת מיפוי של מזהי משתמשים ייחודיים
            const ownerIds = [...new Set(data.filter(task => task.owner_id).map(task => task.owner_id))];
            
            if (ownerIds.length > 0) {
              try {
                const { data: ownersData, error: ownersError } = await supabase
                  .from('profiles')
                  .select('id, email');
                
                if (!ownersError && ownersData) {
                  // יצירת מיפוי של מזהי משתמשים למידע שלהם
                  const ownersMap = {};
                  ownersData.forEach(owner => {
                    ownersMap[owner.id] = owner;
                  });
                  
                  // הוספת מידע על הבעלים לכל משימה
                  data.forEach(task => {
                    if (task.owner_id && ownersMap[task.owner_id]) {
                      task.owner = {
                        ...ownersMap[task.owner_id],
                        name: ownersMap[task.owner_id].name || ownersMap[task.owner_id].email?.split('@')[0] || 'משתמש'
                      };
                    }
                  });
                }
              } catch (err) {
                console.error('Error fetching owners:', err);
              }
            }
          }
          
          console.log('Loaded tasks:', data);
          setTasks(data);
          setError(null);
        } catch (err) {
          console.error('Error fetching tasks:', err);
          setTasks(sampleTasks);
          setError('שגיאה בטעינת המשימות. מוצגות משימות לדוגמה.');
        }
      } catch (error) {
        console.error('שגיאה בטעינת משימות:', error);
        toast.error('שגיאה בטעינת המשימות');
        setError('שגיאה בטעינת המשימות. נסה שוב מאוחר יותר.');
        setTasks(sampleTasks);
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, []);

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        setLoadingTeamMembers(true);
        
        // בדיקה אם יש חיבור לסופאבייס
        let session;
        try {
          const { data } = await supabase.auth.getSession();
          session = data.session;
        } catch (err) {
          console.error('Error getting session:', err);
          session = null;
        }
        
        if (!session) {
          // אם אין משתמש מחובר, נציג את צוות המתנ"ס במקום
          setTeamMembers(teamMembersData);
          return;
        }
        
        try {
          // שינוי השאילתה כדי להתמודד עם העדר עמודת name
          const { data, error } = await supabase
            .from('profiles')
            .select('id, email');

          if (error) {
            console.error('Error fetching profiles:', error);
            // נציג את צוות המתנ"ס במקרה של שגיאה
            setTeamMembers(teamMembersData);
            return;
          }
          
          // הוספת שדה name מתוך האימייל אם הוא לא קיים
          const processedData = data?.map(profile => ({
            ...profile,
            name: profile.name || profile.email?.split('@')[0] || 'משתמש'
          })) || [];
          
          console.log('Loaded team members:', processedData);
          
          if (processedData.length === 0) {
            // אם אין נתונים, נציג את צוות המתנ"ס
            setTeamMembers(teamMembersData);
          } else {
            setTeamMembers(processedData);
          }
        } catch (err) {
          console.error('Error fetching profiles:', err);
          // נציג את צוות המתנ"ס במקרה של שגיאה
          setTeamMembers(teamMembersData);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
        // נציג את צוות המתנ"ס במקרה של שגיאה
        setTeamMembers(teamMembersData);
      } finally {
        setLoadingTeamMembers(false);
      }
    };

    loadTeamMembers();
  }, []);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        await checkCustomNotifications(supabase);
      } catch (error) {
        console.error('שגיאה בבדיקת התראות מותאמות אישית:', error);
      }
    };

    // בדיקה ראשונית
    checkNotifications();

    // בדיקה כל דקה
    const interval = setInterval(checkNotifications, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // אם אין שינוי במיקום, לא עושים כלום
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    try {
      // מעדכנים את הסטטוס בבסיס הנתונים
      const taskId = result.draggableId;
      const newStatus = destination.droppableId;

      // עדכון מקומי לפני העדכון בשרת
      const updatedTasks = [...tasks];
      const taskIndex = updatedTasks.findIndex(t => t.id.toString() === taskId);
      
      if (taskIndex !== -1) {
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          status: newStatus
        };
        setTasks(updatedTasks);
      }

      // עדכון בשרת
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      // בדיקת התראות על שינוי סטטוס
      const { data: notifications } = await supabase
        .from('task_notifications')
        .select('*')
        .eq('task_id', taskId)
        .eq('type', 'on_status')
        .eq('status', newStatus)
        .eq('enabled', true);

      notifications?.forEach(notification => {
        showCustomNotification(tasks.find(t => t.id === taskId), notification);
      });

    } catch (error) {
      console.error('שגיאה בעדכון סטטוס משימה:', error);
      // במקרה של שגיאה, מחזירים את המצב הקודם
      const { data } = await supabase.from('tasks').select('*');
      if (data) {
        setTasks(data);
      }
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const handleSaveTask = async () => {
    if (!newTask.title.trim()) {
      setError('יש למלא כותרת למשימה');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        status: newTask.status,
        type: newTask.type === 'אחר' ? newTask.customType : newTask.type,
        date: newTask.date ? new Date(newTask.date).toISOString() : null,
        due_date: newTask.date ? new Date(newTask.date).toISOString() : null,
        subtasks: newTask.subtasks || [],
        owner_id: newTask.owner || null,
        user_id: user.id,
        created_at: new Date().toISOString()
      };
      
      let result;
      
      if (editingTaskId) {
        // Update existing task
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTaskId)
          .select();
          
        if (error) throw error;
        result = data[0];
        
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === editingTaskId ? { ...task, ...result } : task
          )
        );
      } else {
        // Create new task
        const { data, error } = await supabase
          .from('tasks')
          .insert([taskData])
          .select();
          
        if (error) throw error;
        result = data[0];
        
        // Update local state
        setTasks(prevTasks => [...prevTasks, result]);
      }
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        status: 'TODO',
        type: 'משימה',
        customType: '',
        date: null,
        subtasks: [],
        owner: ''
      });
      setEditingTaskId(null);
      setTaskDialog(false);
      
      // Show success message
      toast.success(editingTaskId ? 'המשימה עודכנה בהצלחה' : 'המשימה נוספה בהצלחה');
    } catch (error) {
      console.error('Error saving task:', error);
      setError('אירעה שגיאה בשמירת המשימה');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId, updatedFields) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updatedFields)
        .eq('id', taskId)
        .select();
        
      if (error) throw error;
      
      // עדכון הרשימה המקומית
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, ...updatedFields } : task
        )
      );
      
      toast.success('המשימה עודכנה בהצלחה');
    } catch (error) {
      console.error('שגיאה בעדכון משימה:', error);
      toast.error('שגיאה בעדכון המשימה');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (taskId) => {
    setTaskToDelete(taskId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== taskToDelete));
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleToggleSubtask = async (taskId, subtaskIndex) => {
    try {
      // עדכון המצב המקומי
      const updatedTasks = [...tasks];
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) return;
      
      const task = updatedTasks[taskIndex];
      const subtasks = [...task.subtasks];
      
      // בדיקה אם תת-המשימה היא מחרוזת או אובייקט
      if (typeof subtasks[subtaskIndex] === 'string') {
        // אם זו מחרוזת, נמיר אותה לאובייקט
        subtasks[subtaskIndex] = {
          title: subtasks[subtaskIndex],
          completed: true
        };
      } else {
        // אם זה אובייקט, נהפוך את המצב
        subtasks[subtaskIndex] = {
          ...subtasks[subtaskIndex],
          completed: !subtasks[subtaskIndex].completed
        };
      }
      
      // עדכון המשימה עם תתי-המשימות המעודכנות
      updatedTasks[taskIndex] = {
        ...task,
        subtasks
      };
      
      setTasks(updatedTasks);
      
      // עדכון בסופאבייס
      if (taskId.startsWith('sample-')) return; // לא מעדכנים משימות לדוגמה
      
      const { error } = await supabase
        .from('tasks')
        .update({ subtasks })
        .eq('id', taskId);
        
      if (error) throw error;
      
    } catch (error) {
      console.error('שגיאה בעדכון תת-משימה:', error);
      toast.error('שגיאה בעדכון תת-המשימה');
    }
  };

  const handleAddSubtask = async (taskId, subtaskTitle) => {
    try {
      const parentTask = tasks.find(t => t.id === taskId);
      const newSubtask = {
        title: subtaskTitle,
        completed: false
      };

      const { data, error } = await supabase
        .from('tasks')
        .update({ subtasks: [...(parentTask.subtasks || []), newSubtask] })
        .eq('id', taskId);

      if (error) throw error;

      const updatedTasks = tasks.map(task =>
        task.id === taskId ? { ...task, subtasks: [...(task.subtasks || []), newSubtask] } : task
      );
      setTasks(updatedTasks);
      setNewSubtask('');
      setEditingTaskId(null);
      showNewSubtaskNotification(parentTask, newSubtask.title);
    } catch (error) {
      console.error('שגיאה בהוספת תת משימה:', error);
    }
  };

  const handleAddNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('לא נמצא משתמש מחובר');

      // בדיקה שכל השדות הנדרשים קיימים
      if (!selectedNotificationTask?.id) {
        throw new Error('לא נבחרה משימה');
      }

      const notification = {
        task_id: selectedNotificationTask.id,
        subtask_index: selectedSubtaskIndex,
        type: newNotification.type,
        days_before: newNotification.type === 'before_due' ? newNotification.days_before : null,
        notify_date: newNotification.type === 'on_date' ? newNotification.notify_date?.toISOString() : null,
        status: newNotification.type === 'on_status' ? newNotification.status : null,
        notification_method: newNotification.notification_method,
        repeat: newNotification.repeat,
        enabled: newNotification.enabled,
        user_id: user.id
      };

      // הדפסת הנתונים לבדיקה
      console.log('Notification data being sent:', notification);

      // בדיקת תקינות נוספת לפי סוג ההתראה
      if (newNotification.type === 'before_due' && !notification.days_before) {
        throw new Error('חובה להזין מספר ימים להתראה');
      }
      if (newNotification.type === 'on_date' && !notification.notify_date) {
        throw new Error('חובה לבחור תאריך להתראה');
      }
      if (newNotification.type === 'on_status' && !notification.status) {
        throw new Error('חובה לבחור סטטוס להתראה');
      }

      const { data, error } = await supabase
        .from('task_notifications')
        .insert([notification])
        .select(); // נוסיף select() כדי לקבל את הנתונים שנוספו

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Notification added successfully:', data);

      setNotificationDialog(false);
      setSelectedNotificationTask(null);
      setSelectedSubtaskIndex(null);
      setNewNotification({
        type: 'before_due',
        days_before: 1,
        notify_date: null,
        status: 'DONE',
        notification_method: 'email',
        repeat: 'once',
        enabled: true
      });

      toast.success('ההתראה נוספה בהצלחה');
    } catch (error) {
      console.error('שגיאה בהוספת התראה:', error);
      toast.error(error.message || 'שגיאה בהוספת ההתראה');
    }
  };

  const exportColumns = [
    { field: 'title', headerName: 'כותרת' },
    { field: 'description', headerName: 'תיאור' },
    { field: 'type', headerName: 'סוג' },
    { field: 'status', headerName: 'סטטוס' },
    { field: 'owner', headerName: 'אחראי' },
    { field: 'due_date', headerName: 'תאריך יעד' },
    { field: 'subtasks', headerName: 'תתי משימות' }
  ];

  const exportData = tasks.map(task => ({
    ...task,
    subtasks: task.subtasks || []
  }));

  const TaskDialog = () => (
    <Dialog
      open={openDialog}
      onClose={() => setOpenDialog(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: { direction: 'rtl', borderRadius: '12px' }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        pb: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        '& .MuiTypography-root': {
          fontWeight: 600,
          color: 'primary.dark',
        }
      }}>
        {selectedTask ? 'עריכת משימה' : 'הוספת משימה חדשה'}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <TextField
          autoFocus
          margin="dense"
          label="כותרת המשימה"
          type="text"
          fullWidth
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          InputProps={{ style: { textAlign: 'right' } }}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="תיאור המשימה"
          type="text"
          fullWidth
          multiline
          rows={3}
          value={newTask.description}
          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          InputProps={{ style: { textAlign: 'right' } }}
          sx={{ mb: 2 }}
        />
        <TextField
          select
          fullWidth
          label="סטטוס"
          value={newTask.status}
          onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
          sx={{ mb: 2, textAlign: 'right' }}
          InputProps={{ style: { textAlign: 'right' } }}
          SelectProps={{ 
            MenuProps: { 
              anchorOrigin: { vertical: "bottom", horizontal: "right" },
              transformOrigin: { vertical: "top", horizontal: "right" }
            }
          }}
        >
          {Object.entries(TASK_STATUS).map(([key, value]) => (
            <MenuItem key={key} value={key}>{value}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          label="סוג"
          value={newTask.type}
          onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
          sx={{ mb: 2, textAlign: 'right' }}
          InputProps={{ style: { textAlign: 'right' } }}
          SelectProps={{ 
            MenuProps: { 
              anchorOrigin: { vertical: "bottom", horizontal: "right" },
              transformOrigin: { vertical: "top", horizontal: "right" }
            }
          }}
        >
          {eventTypes.map((type) => (
            <MenuItem key={type} value={type}>{type}</MenuItem>
          ))}
        </TextField>
        {newTask.type === 'אחר' && (
          <TextField
            margin="dense"
            label="סוג מותאם אישית"
            type="text"
            fullWidth
            value={newTask.customType}
            onChange={(e) => setNewTask({ ...newTask, customType: e.target.value })}
            InputProps={{ style: { textAlign: 'right' } }}
            sx={{ mb: 2 }}
          />
        )}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="תאריך יעד"
            value={newTask.date}
            onChange={(date) => setNewTask({ ...newTask, date })}
            sx={{ mb: 2, width: '100%' }}
            slotProps={{
              textField: {
                InputProps: { style: { textAlign: 'right' } },
                fullWidth: true
              }
            }}
          />
        </LocalizationProvider>
        <FormControl sx={{ width: '100%', mb: 2 }}>
          <InputLabel id="task-owner-label">אחראי</InputLabel>
          <Select
            labelId="task-owner-label"
            id="task-owner-select"
            value={newTask.owner || ''}
            onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })}
            input={<OutlinedInput label="אחראי" />}
          >
            <MenuItem value="">ללא</MenuItem>
            {loadingTeamMembers ? (
              <MenuItem disabled>
                <CircularProgress size={20} />
                &nbsp;טוען משתמשים...
              </MenuItem>
            ) : (
              teamMembers.map(member => (
                <MenuItem key={member.id} value={member.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar 
                      sx={{ 
                        width: 24, 
                        height: 24,
                        fontSize: '0.75rem',
                        bgcolor: 'secondary.main'
                      }}
                    >
                      {member.name?.substring(0, 1).toUpperCase() || '?'}
                    </Avatar>
                    {member.name || member.email}
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>תתי משימות</Typography>
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              fullWidth
              label="הוסף תת משימה"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              InputProps={{ style: { textAlign: 'right' } }}
              sx={{ ml: 1 }}
            />
            <Button 
              variant="outlined"
              size="small"
              onClick={() => {
                if (newSubtask.trim()) {
                  setNewTask({
                    ...newTask,
                    subtasks: [...(newTask.subtasks || []), { title: newSubtask.trim(), completed: false }]
                  });
                  setNewSubtask('');
                }
              }}
              sx={{ 
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                }
              }}
            >
              הוסף
            </Button>
          </Box>
          <List dense sx={{ maxHeight: '150px', overflow: 'auto' }}>
            {newTask.subtasks?.map((subtask, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => {
                      setNewTask({
                        ...newTask,
                        subtasks: newTask.subtasks.filter((_, i) => i !== index)
                      });
                    }}
                    sx={{ 
                      color: 'text.secondary',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                sx={{
                  py: 0.5
                }}
              >
                <ListItemText primary={subtask.title} />
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={() => setOpenDialog(false)}
          sx={{ 
            borderRadius: '8px',
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            }
          }}
        >
          ביטול
        </Button>
        <Button 
          variant="contained" 
          onClick={selectedTask ? () => handleUpdateTask(selectedTask.id, newTask) : handleSaveTask}
          sx={{ 
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(25, 118, 210, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 12px rgba(25, 118, 210, 0.3)',
            }
          }}
        >
          {selectedTask ? 'עדכון' : 'שמירה'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const DeleteConfirmDialog = () => (
    <Dialog
      open={deleteConfirmOpen}
      onClose={() => setDeleteConfirmOpen(false)}
      PaperProps={{
        style: { direction: 'rtl', borderRadius: '12px' }
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>מחיקת משימה</DialogTitle>
      <DialogContent>
        <Typography>האם אתה בטוח שברצונך למחוק את המשימה?</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={() => setDeleteConfirmOpen(false)}
          sx={{ 
            borderRadius: '8px',
            color: 'text.secondary',
          }}
        >
          ביטול
        </Button>
        <Button 
          variant="contained" 
          color="error" 
          onClick={handleDeleteConfirm}
          sx={{ 
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(211, 47, 47, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 12px rgba(211, 47, 47, 0.3)',
            }
          }}
        >
          מחיקה
        </Button>
      </DialogActions>
    </Dialog>
  );

  const NotificationDialog = () => (
    <Dialog
      open={notificationDialog}
      onClose={() => setNotificationDialog(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: { direction: 'rtl', borderRadius: '12px' }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        pb: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <NotificationsIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>הגדרת התראה חדשה</Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ 
            mb: 2,
            p: 1.5,
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
            borderRadius: '8px',
            fontWeight: 500
          }}>
            משימה: {selectedNotificationTask?.title}
            {selectedSubtaskIndex !== null && selectedNotificationTask?.subtasks[selectedSubtaskIndex]?.title && 
              ` > ${selectedNotificationTask?.subtasks[selectedSubtaskIndex].title}`}
          </Typography>
          
          <TextField
            select
            fullWidth
            label="סוג התראה"
            value={newNotification.type}
            onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
            sx={{ mt: 2, textAlign: 'right' }}
            InputProps={{ style: { textAlign: 'right' } }}
            SelectProps={{ 
              MenuProps: { 
                anchorOrigin: { vertical: "bottom", horizontal: "right" },
                transformOrigin: { vertical: "top", horizontal: "right" }
              }
            }}
          >
            <MenuItem value="before_due">לפני תאריך היעד</MenuItem>
            <MenuItem value="on_date">בתאריך מסוים</MenuItem>
            <MenuItem value="on_status">בשינוי סטטוס</MenuItem>
          </TextField>
          {newNotification.type === 'before_due' && (
            <TextField
              type="number"
              fullWidth
              label="מספר ימים לפני"
              value={newNotification.days_before}
              onChange={(e) => setNewNotification({ ...newNotification, days_before: parseInt(e.target.value) })}
              InputProps={{ 
                inputProps: { min: 1, style: { textAlign: 'right' } }
              }}
              sx={{ mt: 2 }}
            />
          )}

          {newNotification.type === 'on_date' && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="תאריך התראה"
                value={newNotification.notify_date}
                onChange={(date) => setNewNotification({ ...newNotification, notify_date: date })}
                sx={{ mt: 2, width: '100%' }}
                slotProps={{
                  textField: {
                    InputProps: { style: { textAlign: 'right' } },
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          )}

          {newNotification.type === 'on_status' && (
            <TextField
              select
              fullWidth
              label="סטטוס להתראה"
              value={newNotification.status}
              onChange={(e) => setNewNotification({ ...newNotification, status: e.target.value })}
              sx={{ mt: 2, textAlign: 'right' }}
              InputProps={{ style: { textAlign: 'right' } }}
              SelectProps={{ 
                MenuProps: { 
                  anchorOrigin: { vertical: "bottom", horizontal: "right" },
                  transformOrigin: { vertical: "top", horizontal: "right" }
                }
              }}
            >
              {Object.entries(TASK_STATUS).map(([key, value]) => (
                <MenuItem key={key} value={key}>{value}</MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            select
            fullWidth
            label="שיטת התראה"
            value={newNotification.notification_method}
            onChange={(e) => setNewNotification({ ...newNotification, notification_method: e.target.value })}
            sx={{ mt: 2, textAlign: 'right' }}
            InputProps={{ style: { textAlign: 'right' } }}
            SelectProps={{ 
              MenuProps: { 
                anchorOrigin: { vertical: "bottom", horizontal: "right" },
                transformOrigin: { vertical: "top", horizontal: "right" }
              }
            }}
          >
            <MenuItem value="email">אימייל</MenuItem>
            <MenuItem value="browser">התראת דפדפן</MenuItem>
            <MenuItem value="both">שניהם</MenuItem>
          </TextField>

          <TextField
            select
            fullWidth
            label="תדירות"
            value={newNotification.repeat}
            onChange={(e) => setNewNotification({ ...newNotification, repeat: e.target.value })}
            sx={{ mt: 2, textAlign: 'right' }}
            InputProps={{ style: { textAlign: 'right' } }}
            SelectProps={{ 
              MenuProps: { 
                anchorOrigin: { vertical: "bottom", horizontal: "right" },
                transformOrigin: { vertical: "top", horizontal: "right" }
              }
            }}
          >
            <MenuItem value="once">פעם אחת</MenuItem>
            <MenuItem value="daily">כל יום</MenuItem>
            <MenuItem value="weekly">כל שבוע</MenuItem>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setNotificationDialog(false)}>ביטול</Button>
        <Button
          variant="contained"
          onClick={handleAddNotification}
          startIcon={<NotificationsIcon />}
          sx={{ 
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(25, 118, 210, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 12px rgba(25, 118, 210, 0.3)',
            }
          }}
        >
          הוסף התראה
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 3 }}>
      <ToastContainer />
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        backgroundColor: 'background.paper',
        padding: '16px 24px',
        borderRadius: '16px',
        boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ 
            fontWeight: 700, 
            color: 'primary.dark',
            mr: 3,
            position: 'relative',
            '&:after': {
              content: '""',
              position: 'absolute',
              bottom: -1,
              left: 0,
              width: '40%',
              height: '3px',
              backgroundColor: 'primary.main',
              borderRadius: '2px'
            }
          }}>
            משימות ואירועים
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            backgroundColor: 'rgba(0,0,0,0.02)', 
            borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.08)',
            overflow: 'hidden',
            mr: 2,
            transition: 'all 0.2s',
            '&:hover': {
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            }
          }}>
            <TextField
              placeholder="חיפוש משימות..."
              size="small"
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                sx: { 
                  borderRadius: '8px',
                  '& fieldset': { border: 'none' },
                }
              }}
              sx={{ width: '220px' }}
            />
          </Box>
          
          <TextField
            select
            size="small"
            defaultValue="all"
            sx={{ 
              width: '150px',
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                backgroundColor: 'rgba(0,0,0,0.02)',
                border: '1px solid rgba(0,0,0,0.08)',
                '& fieldset': { border: 'none' },
              }
            }}
            SelectProps={{
              MenuProps: { 
                anchorOrigin: { vertical: "bottom", horizontal: "right" },
                transformOrigin: { vertical: "top", horizontal: "right" }
              }
            }}
          >
            <MenuItem value="all">כל הסוגים</MenuItem>
            {eventTypes.map((type) => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </TextField>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedTask(null);
              setNewTask({ title: '', description: '', status: 'TODO', type: 'משימה', customType: '', date: null, subtasks: [], owner: '' });
              setOpenDialog(true);
            }}
            sx={{ 
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(25, 118, 210, 0.15)',
              padding: '8px 16px',
              fontWeight: 600,
              '&:hover': {
                boxShadow: '0 6px 12px rgba(25, 118, 210, 0.25)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.2s',
            }}
          >
            משימה חדשה
          </Button>
          <ExportButtons
            data={exportData}
            filename="רשימת_משימות"
            columns={exportColumns}
            sx={{
              '& .MuiButton-root': {
                borderRadius: '8px',
                padding: '8px 16px',
                transition: 'all 0.2s',
                fontWeight: 600,
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)'
                },
              }
            }}
          />
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: '8px', mb: 3 }}>{error}</Alert>
      ) : tasks.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: '8px', mb: 3 }}>אין משימות</Alert>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Grid container spacing={3}>
            {Object.keys(TASK_STATUS).map((status) => (
              <Grid item xs={12} md={4} key={status}>
                <Card sx={{ 
                  height: '100%', 
                  backgroundColor: status === 'DONE' ? 'rgba(76, 175, 80, 0.04)' :
                                  status === 'IN_PROGRESS' ? 'rgba(255, 152, 0, 0.04)' :
                                  'rgba(33, 150, 243, 0.04)',
                  overflow: 'visible',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <CardContent>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 2 
                    }}>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 600,
                        color: status === 'DONE' ? 'success.dark' :
                              status === 'IN_PROGRESS' ? 'warning.dark' :
                              'info.dark',
                      }}>
                        {TASK_STATUS[status]}
                      </Typography>
                      <Chip
                        size="small"
                        label={getTasksByStatus(status).length}
                        sx={{
                          backgroundColor: status === 'DONE' ? 'success.light' :
                                        status === 'IN_PROGRESS' ? 'warning.light' :
                                        'info.light',
                          color: '#fff',
                          fontWeight: 'bold',
                        }}
                      />
                    </Box>
                    <Droppable droppableId={status}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          sx={{ 
                            minHeight: 100,
                            backgroundColor: snapshot.isDraggingOver ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                            transition: 'background-color 0.2s ease',
                            borderRadius: 2,
                            p: 1
                          }}
                        >
                          {getTasksByStatus(status).map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id.toString()}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <Card 
                                    sx={{ 
                                      mb: 1.5,
                                      cursor: 'grab',
                                      transform: snapshot.isDragging ? 'rotate(2deg) !important' : 'none',
                                      zIndex: snapshot.isDragging ? 1 : 'auto',
                                      position: 'relative',
                                      '&:hover': {
                                        boxShadow: '0 6px 12px rgba(0,0,0,0.1)',
                                        transform: 'translateY(-3px)',
                                      },
                                      '&:active': {
                                        cursor: 'grabbing',
                                      },
                                      borderLeft: '4px solid',
                                      borderLeftColor: task.status === 'DONE' ? 'success.main' : 
                                                  task.status === 'IN_PROGRESS' ? 'warning.main' : 
                                                  'info.main',
                                      borderRadius: '8px',
                                      backgroundColor: snapshot.isDragging ? 'grey.100' : 'background.paper',
                                      transition: 'all 0.2s ease-in-out',
                                      overflow: 'visible',
                                    }}
                                  >
                                    <CardContent sx={{ 
                                      p: 2, 
                                      '&:last-child': { 
                                        pb: 2 
                                      },
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 1
                                    }}>
                                      <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start'
                                      }}>
                                        <Typography 
                                          variant="h6" 
                                          component="div" 
                                          sx={{ 
                                            fontWeight: 'bold',
                                            fontSize: '1rem',
                                            mb: 1,
                                            maxWidth: '80%',
                                            wordBreak: 'break-word'
                                          }}
                                        >
                                          {task.title}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                          <IconButton 
                                            size="small" 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedTask(task);
                                              setEditingTaskId(task.id);
                                              setNewTask({
                                                title: task.title,
                                                description: task.description || '',
                                                status: task.status || 'TODO',
                                                priority: task.priority || 'MEDIUM',
                                                due_date: task.due_date ? new Date(task.due_date) : null,
                                                owner: task.owner || '',
                                                subtasks: task.subtasks || []
                                              });
                                              setTaskDialog(true);
                                            }}
                                            sx={{ 
                                              color: 'primary.main',
                                              backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                              '&:hover': {
                                                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                              },
                                              transition: 'all 0.2s',
                                              padding: '4px',
                                            }}
                                          >
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                          <IconButton 
                                            size="small" 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteClick(task.id);
                                            }}
                                            sx={{ 
                                              color: 'error.main',
                                              backgroundColor: 'rgba(211, 47, 47, 0.04)',
                                              '&:hover': {
                                                backgroundColor: 'rgba(211, 47, 47, 0.12)',
                                              },
                                              transition: 'all 0.2s',
                                              padding: '4px',
                                            }}
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedNotificationTask(task);
                                              setSelectedSubtaskIndex(null);
                                              setNotificationDialog(true);
                                            }}
                                            sx={{ 
                                              color: 'primary.main',
                                              backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                              '&:hover': {
                                                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                              },
                                              transition: 'all 0.2s',
                                              padding: '4px',
                                            }}
                                          >
                                            <NotificationsIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                      
                                      {task.description && (
                                        <Typography 
                                          variant="body2" 
                                          color="text.secondary"
                                          sx={{ 
                                            mb: 1.5,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            fontSize: '0.85rem',
                                            lineHeight: 1.4
                                          }}
                                        >
                                          {task.description}
                                        </Typography>
                                      )}
                                      
                                      <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: 1,
                                        mt: 'auto'
                                      }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          {task.due_date && (
                                            <Tooltip title="תאריך יעד">
                                              <Chip
                                                icon={<EventIcon fontSize="small" />}
                                                label={new Date(task.due_date).toLocaleDateString('he-IL')}
                                                size="small"
                                                sx={{ 
                                                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                                  borderRadius: '16px',
                                                  '& .MuiChip-icon': {
                                                    color: 'primary.main'
                                                  }
                                                }}
                                              />
                                            </Tooltip>
                                          )}
                                          
                                          {task.priority && (
                                            <Tooltip title="עדיפות">
                                              <Chip
                                                label={PRIORITY_LABELS[task.priority]}
                                                size="small"
                                                sx={{ 
                                                  backgroundColor: getPriorityColor(task.priority, 0.1),
                                                  color: getPriorityColor(task.priority),
                                                  borderRadius: '16px',
                                                  fontWeight: 500
                                                }}
                                              />
                                            </Tooltip>
                                          )}
                                        </Box>
                                        
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          {task.owner && (
                                            <Tooltip title={`אחראי: ${task.owner.name || task.owner.email}`}>
                                              <Avatar 
                                                sx={{ 
                                                  width: 28, 
                                                  height: 28,
                                                  fontSize: '0.875rem',
                                                  bgcolor: 'primary.main'
                                                }}
                                              >
                                                {(task.owner.name || task.owner.email).substring(0, 1).toUpperCase()}
                                              </Avatar>
                                            </Tooltip>
                                          )}
                                          
                                          {task.subtasks && task.subtasks.length > 0 && (
                                            <Tooltip title={`${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length} תתי-משימות הושלמו`}>
                                              <Chip
                                                size="small"
                                                label={`${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length}`}
                                                sx={{ 
                                                  height: 24,
                                                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                                                  '& .MuiChip-label': {
                                                    px: 1
                                                  }
                                                }}
                                              />
                                            </Tooltip>
                                          )}
                                        </Box>
                                      </Box>
                                      
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <Box sx={{ 
                                          mt: 2, 
                                          pt: 1, 
                                          borderTop: '1px dashed rgba(0,0,0,0.1)',
                                        }}>
                                          <Typography 
                                            variant="caption" 
                                            sx={{ 
                                              display: 'block', 
                                              mb: 0.5, 
                                              color: 'text.secondary',
                                              fontWeight: 500
                                            }}
                                          >
                                            תתי-משימות ({task.subtasks.length})
                                          </Typography>
                                          <Box sx={{ maxHeight: '120px', overflowY: 'auto' }}>
                                            {task.subtasks.map((subtask, idx) => (
                                              <Box 
                                                key={idx} 
                                                sx={{ 
                                                  display: 'flex', 
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  py: 0.5,
                                                  borderBottom: idx < task.subtasks.length - 1 ? '1px dotted rgba(0,0,0,0.05)' : 'none'
                                                }}
                                              >
                                                <Typography 
                                                  variant="body2" 
                                                  sx={{ 
                                                    fontSize: '0.8rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    textDecoration: subtask.completed ? 'line-through' : 'none',
                                                    color: subtask.completed ? 'text.secondary' : 'text.primary',
                                                  }}
                                                >
                                                  <Box 
                                                    component="span" 
                                                    sx={{ 
                                                      width: '6px', 
                                                      height: '6px', 
                                                      borderRadius: '50%', 
                                                      backgroundColor: subtask.completed ? 'success.light' : 'primary.light',
                                                      display: 'inline-block'
                                                    }}
                                                  />
                                                  {typeof subtask === 'string' ? subtask : subtask.title}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                  <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleToggleSubtask(task.id, idx);
                                                    }}
                                                    sx={{ 
                                                      color: subtask.completed ? 'success.main' : 'text.secondary',
                                                      p: 0.5,
                                                      opacity: 0.6,
                                                      '&:hover': {
                                                        opacity: 1,
                                                        backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                                      }
                                                    }}
                                                  >
                                                    {subtask.completed ? 
                                                      <CheckCircleIcon sx={{ fontSize: '14px' }} /> : 
                                                      <RadioButtonUncheckedIcon sx={{ fontSize: '14px' }} />
                                                    }
                                                  </IconButton>
                                                </Box>
                                              </Box>
                                            ))}
                                          </Box>
                                        </Box>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </Box>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DragDropContext>
      )}
      <TaskDialog />
      <DeleteConfirmDialog />
      <NotificationDialog />
    </Box>
  );
};

export default TaskList;