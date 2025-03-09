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
  CircularProgress
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

const TaskList = ({ tasks: initialTasks }) => {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
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
  const [newSubtask, setNewSubtask] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
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
    setTasks(initialTasks || []);
  }, [initialTasks]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // קבלת המשתמש הנוכחי
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('לא נמצא משתמש מחובר');
        }

        // קבלת הפרופיל של המשתמש עם ההרשאות
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('can_view_tasks_from')
          .eq('id', user.id)
          .single();

        // מביאים את המשימות של המשתמש עצמו ושל המשתמשים שהוא יכול לראות
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .or(`user_id.eq.${user.id}${userProfile?.can_view_tasks_from?.length ? `,user_id.in.(${userProfile.can_view_tasks_from.join(',')})` : ''}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTasks(data || []);

        // בדיקת התראות
        await checkCustomNotifications(supabase);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();

    // הגדרת בדיקת התראות כל דקה
    const notificationInterval = setInterval(async () => {
      await checkCustomNotifications(supabase);
    }, 60000);

    return () => clearInterval(notificationInterval);
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
    try {
      if (!newTask.title.trim()) {
        alert('נא למלא כותרת למשימה');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('לא נמצא משתמש מחובר');
      }

      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        status: newTask.status,
        type: newTask.type === 'אחר' ? newTask.customType : newTask.type,
        date: newTask.date ? new Date(newTask.date).toISOString() : null,
        due_date: newTask.date ? new Date(newTask.date).toISOString() : null,
        subtasks: newTask.subtasks || [],
        owner: newTask.owner?.trim() || null,
        user_id: user.id,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;

      // עדכון הרשימה המקומית
      setTasks(prevTasks => [data, ...prevTasks]);
      setOpenDialog(false);
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

      // שליחת התראה על משימה חדשה
      await showNewTaskNotification(data);

      toast.success('המשימה נוספה בהצלחה');
    } catch (error) {
      console.error('שגיאה בשמירת משימה:', error);
      toast.error('שגיאה בשמירת המשימה');
    }
  };

  const handleUpdateTask = async () => {
    try {
      if (!newTask.title.trim()) {
        alert('נא למלא כותרת למשימה');
        return;
      }

      if (!selectedTask) {
        throw new Error('לא נבחרה משימה לעדכון');
      }

      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        status: newTask.status,
        type: newTask.type === 'אחר' ? newTask.customType : newTask.type,
        date: newTask.date ? new Date(newTask.date).toISOString() : null,
        due_date: newTask.date ? new Date(newTask.date).toISOString() : null,
        subtasks: newTask.subtasks || [],
        owner: newTask.owner?.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', selectedTask.id)
        .select()
        .single();

      if (error) throw error;

      // עדכון הרשימה המקומית
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === selectedTask.id ? data : task
        )
      );
      
      setOpenDialog(false);
      setSelectedTask(null);
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

      toast.success('המשימה עודכנה בהצלחה');
    } catch (error) {
      console.error('שגיאה בעדכון משימה:', error);
      toast.error('שגיאה בעדכון המשימה');
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
      const updatedTasks = [...tasks];
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        console.error('משימה לא נמצאה:', taskId);
        return;
      }
      
      // עדכון הסטטוס של תת המשימה
      updatedTasks[taskIndex].subtasks[subtaskIndex].completed = !updatedTasks[taskIndex].subtasks[subtaskIndex].completed;

      const { error } = await supabase
        .from('tasks')
        .update({ subtasks: updatedTasks[taskIndex].subtasks })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(updatedTasks);
    } catch (error) {
      console.error('שגיאה בעדכון תת משימה:', error);
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
        <TextField
          margin="dense"
          label="אחראי"
          type="text"
          fullWidth
          value={newTask.owner}
          onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })}
          InputProps={{ style: { textAlign: 'right' } }}
          sx={{ mb: 2 }}
        />
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
          onClick={selectedTask ? handleUpdateTask : handleSaveTask}
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
                                    <CardContent sx={{ p: 2 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                        <Typography variant="subtitle1" component="div" sx={{ 
                                          fontWeight: 600,
                                          fontSize: '0.95rem',
                                          lineHeight: 1.3,
                                          color: 'text.primary',
                                          mb: 0.5
                                        }}>
                                          {task.title}
                                        </Typography>
                                        <Box sx={{ 
                                          display: 'flex', 
                                          gap: 0.5,
                                          opacity: 0.4,
                                          transition: 'opacity 0.2s',
                                          '.MuiCard-root:hover &': {
                                            opacity: 1
                                          }
                                        }}>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedTask(task);
                                              setNewTask({
                                                title: task.title,
                                                description: task.description,
                                                status: task.status,
                                                type: task.type,
                                                customType: task.customType,
                                                date: task.date ? new Date(task.date) : null,
                                                subtasks: task.subtasks || [],
                                                owner: task.owner || ''
                                              });
                                              setOpenDialog(true);
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
                                      
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                        <Chip
                                          size="small"
                                          label={task.type}
                                          sx={{ 
                                            backgroundColor: 'rgba(33, 150, 243, 0.08)',
                                            color: 'info.dark',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            height: '22px',
                                            borderRadius: '4px'
                                          }}
                                        />
                                        {task.date && (
                                          <Chip
                                            size="small"
                                            icon={<EventIcon style={{ fontSize: '14px' }} />}
                                            label={new Date(task.date).toLocaleDateString('he-IL')}
                                            sx={{ 
                                              backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                              color: 'success.dark',
                                              fontWeight: 500,
                                              fontSize: '0.75rem',
                                              height: '22px',
                                              borderRadius: '4px'
                                            }}
                                          />
                                        )}
                                        {task.owner && (
                                          <Chip
                                            size="small"
                                            icon={<PersonIcon style={{ fontSize: '14px' }} />}
                                            label={task.owner}
                                            sx={{ 
                                              backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                              color: 'secondary.dark',
                                              fontWeight: 500,
                                              fontSize: '0.75rem',
                                              height: '22px',
                                              borderRadius: '4px'
                                            }}
                                          />
                                        )}
                                      </Box>
                                      
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <Box sx={{ 
                                          mt: 1, 
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
                                          <Box sx={{ maxHeight: '100px', overflowY: 'auto' }}>
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
                                                  {subtask.title}
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
                                                  <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedNotificationTask(task);
                                                      setSelectedSubtaskIndex(idx);
                                                      setNotificationDialog(true);
                                                    }}
                                                    sx={{ 
                                                      color: 'primary.main',
                                                      p: 0.5,
                                                      opacity: 0.6,
                                                      '&:hover': {
                                                        opacity: 1,
                                                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                                      }
                                                    }}
                                                  >
                                                    <NotificationsIcon sx={{ fontSize: '14px' }} />
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