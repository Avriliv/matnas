import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  ButtonGroup,
  Menu,
  Snackbar,
  Checkbox,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  Fab,
  Chip,
  Stack,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  GetApp as GetAppIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { initializeNotifications, showNotification } from '../notifications';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// הגדרת פונט עברי
// pdfMake.fonts = {
//   Rubik: {
//     normal: 'Rubik',
//     bold: 'Rubik-Bold',
//   },
//   Helvetica: {
//     normal: 'Helvetica',
//     bold: 'Helvetica-Bold',
//   }
// };

const taskTypes = [
  'משימה',
  'פגישה',
  'אירוע',
  'טיול מועצתי',
  'טיול ישובי',
  'אירוע מועצתי',
  'מפעל חיצוני',
  'אחר'
];

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [newTask, setNewTask] = useState({
    title: '',
    type: 'משימה',
    description: '',
    date: '',
    subtasks: []
  });
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    assignee: '',
    date: '',
    description: ''
  });
  const [shareAnchorEl, setShareAnchorEl] = useState(null);

  useEffect(() => {
    fetchTasks();
    initializeNotifications();

    // הגדרת ערוץ Supabase בזמן אמת
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        }, 
        (payload) => {
          console.log('שינוי התקבל בזמן אמת:', payload);
          
          // עדכון מיידי של המשימות
          if (payload.eventType === 'INSERT') {
            console.log('משימה חדשה נוספה:', payload.new);
            setTasks(currentTasks => [payload.new, ...currentTasks]);
            showNotification('משימה חדשה נוספה', {
              body: `משימה חדשה: ${payload.new.title}`,
              dir: 'rtl'
            });
          } 
          else if (payload.eventType === 'UPDATE') {
            console.log('משימה עודכנה:', payload.new);
            setTasks(currentTasks => 
              currentTasks.map(task => 
                task.id === payload.new.id ? payload.new : task
              )
            );
            showNotification('משימה עודכנה', {
              body: `משימה עודכנה: ${payload.new.title}`,
              dir: 'rtl'
            });
          }
          else if (payload.eventType === 'DELETE') {
            console.log('משימה נמחקה:', payload.old);
            setTasks(currentTasks => 
              currentTasks.filter(task => task.id !== payload.old.id)
            );
          }
      });

    // התחברות לערוץ
    channel.subscribe(status => {
      console.log('סטטוס התחברות לערוץ:', status);
      if (status === 'SUBSCRIBED') {
        console.log('מחובר בהצלחה לעדכונים בזמן אמת');
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        showAlert('שגיאה בטעינת המשימות: ' + error.message, 'error');
        return;
      }
      setTasks(data || []);
    } catch (error) {
      console.error('Error:', error);
      showAlert('שגיאה בטעינת המשימות', 'error');
    }
  }

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setSelectedTask(task);
      setNewTask({
        title: task.title,
        type: task.type,
        description: task.description,
        date: task.date,
        subtasks: task.subtasks || []
      });
    } else {
      setSelectedTask(null);
      setNewTask({
        title: '',
        type: 'משימה',
        description: '',
        date: '',
        subtasks: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTask(null);
  };

  const handleSaveTask = async () => {
    try {
      const taskData = {
        title: newTask.title,
        type: newTask.type,
        description: newTask.description,
        date: newTask.date,
        subtasks: newTask.subtasks || []
      };

      let error;
      if (selectedTask) {
        // Update existing task
        const { error: updateError } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', selectedTask.id);
        error = updateError;
      } else {
        // Insert new task
        const { error: insertError } = await supabase
          .from('tasks')
          .insert([taskData]);
        error = insertError;
      }

      if (error) {
        console.error('Error saving task:', error);
        showAlert('שגיאה בשמירת המשימה: ' + error.message, 'error');
        return;
      }
      
      showAlert(selectedTask ? 'המשימה עודכנה בהצלחה' : 'המשימה נוספה בהצלחה');
      fetchTasks();
      handleCloseDialog();
    } catch (error) {
      console.error('Error:', error);
      showAlert('שגיאה בשמירת המשימה', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      showAlert('המשימה נמחקה בהצלחה');
      fetchTasks();
    } catch (error) {
      showAlert('שגיאה במחיקת המשימה', 'error');
    }
  };

  const handleAddSubtask = () => {
    setNewTask({
      ...newTask,
      subtasks: [...newTask.subtasks, { 
        title: '', 
        completed: false,
        assignee: '',
        date: '',
        description: ''
      }]
    });
  };

  const handleSubtaskChange = (index, field, value) => {
    const updatedSubtasks = [...newTask.subtasks];
    updatedSubtasks[index] = { ...updatedSubtasks[index], [field]: value };
    setNewTask({ ...newTask, subtasks: updatedSubtasks });
  };

  const handleToggleExpand = (taskId) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  const handleToggleSubtask = (taskId, subtaskId) => {
    const updatedTasks = [...tasks];
    const taskIndex = updatedTasks.findIndex((task) => task.id === taskId);
    const subtaskIndex = updatedTasks[taskIndex].subtasks.findIndex((subtask) => subtask.id === subtaskId);
    updatedTasks[taskIndex].subtasks[subtaskIndex].completed = !updatedTasks[taskIndex].subtasks[subtaskIndex].completed;
    setTasks(updatedTasks);
  };

  const exportToCSV = () => {
    // הכנת כותרות העמודות
    const headers = ['כותרת', 'תיאור', 'סוג', 'תאריך', 'תת-משימות'];
    
    // הכנת שורות הנתונים
    const rows = tasks.map(task => [
      task.title,
      task.description || '',
      task.type,
      task.date ? new Date(task.date).toLocaleDateString('he-IL') : '',
      task.subtasks && task.subtasks.length > 0 ? 'כן' : 'לא'
    ]);

    // יצירת תוכן ה-CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // יצירת ה-Blob עם BOM כדי שהעברית תוצג נכון
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { 
      type: 'text/csv;charset=utf-8' 
    });

    // הורדת הקובץ
    saveAs(blob, 'משימות.csv');
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`משימות:\n\n${tasks.map(task => 
      `כותרת: ${task.title}\nתיאור: ${task.description || ''}\nסוג: ${task.type}\nתאריך: ${task.date ? new Date(task.date).toLocaleDateString('he-IL') : ''}\nתת-משימות: ${task.subtasks && task.subtasks.length > 0 ? 'כן' : 'לא'}\n`
    ).join('\n')}`);
    window.open(`https://wa.me/?text=${text}`);
    setShareAnchorEl(null);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('משימות');
    const body = encodeURIComponent(`משימות:\n\n${tasks.map(task => 
      `כותרת: ${task.title}\nתיאור: ${task.description || ''}\nסוג: ${task.type}\nתאריך: ${task.date ? new Date(task.date).toLocaleDateString('he-IL') : ''}\nתת-משימות: ${task.subtasks && task.subtasks.length > 0 ? 'כן' : 'לא'}\n`
    ).join('\n')}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareAnchorEl(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="h6">משימות</Typography>
          <ButtonGroup variant="contained" size="small">
            <Button startIcon={<GetAppIcon />} onClick={exportToCSV}>
              ייצא לקובץ
            </Button>
            <Button
              startIcon={<ShareIcon />}
              onClick={(e) => setShareAnchorEl(e.currentTarget)}
            >
              שתף
            </Button>
          </ButtonGroup>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          הוסף משימה חדשה
        </Button>
      </Box>

      <Menu
        anchorEl={shareAnchorEl}
        open={Boolean(shareAnchorEl)}
        onClose={() => setShareAnchorEl(null)}
      >
        <MenuItem onClick={shareViaWhatsApp}>WhatsApp</MenuItem>
        <MenuItem onClick={shareViaEmail}>אימייל</MenuItem>
      </Menu>

      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          משימות
        </Typography>
        <List>
          {tasks.map((task) => (
            <Paper key={task.id} sx={{ mb: 2 }}>
              <ListItem
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <IconButton onClick={() => handleOpenDialog(task)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteTask(task.id)}>
                      <DeleteIcon />
                    </IconButton>
                    <IconButton onClick={() => handleToggleExpand(task.id)}>
                      {expandedTask === task.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{task.title}</Typography>
                      <Chip label={task.type} size="small" color="primary" variant="outlined" />
                      {task.date && (
                        <Typography variant="body2" color="text.secondary">
                          {new Date(task.date).toLocaleDateString('he-IL')}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={task.description}
                />
              </ListItem>
              {expandedTask === task.id && task.subtasks && (
                <Box sx={{ ml: 3, mt: 1, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    תתי משימות:
                  </Typography>
                  {task.subtasks.map((subtask, index) => (
                    <Box key={index} sx={{ border: '1px solid #ddd', p: 2, borderRadius: 1 }}>
                      <Stack spacing={2}>
                        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          • {subtask.title}
                          {subtask.assignee && (
                            <Chip
                              label={subtask.assignee}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                        </Typography>
                        {subtask.date && (
                          <Typography variant="caption" color="text.secondary">
                            תאריך: {new Date(subtask.date).toLocaleDateString('he-IL')}
                          </Typography>
                        )}
                        {subtask.description && (
                          <Typography variant="body2" color="text.secondary">
                            {subtask.description}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          ))}
        </List>
      </Paper>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => handleOpenDialog()}
      >
        <AddIcon />
      </Fab>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTask ? 'ערוך משימה' : 'משימה חדשה'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="כותרת"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              fullWidth
              required
            />
            <Autocomplete
              freeSolo
              options={taskTypes}
              value={newTask.type}
              onChange={(event, newValue) => setNewTask({ ...newTask, type: newValue || '' })}
              onInputChange={(event, newValue) => setNewTask({ ...newTask, type: newValue })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="סוג"
                  required
                  helperText="ניתן לבחור מהרשימה או להקליד סוג חדש"
                />
              )}
            />
            <TextField
              label="תאריך"
              type="date"
              value={newTask.date}
              onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="תיאור"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            
            <Typography variant="h6" sx={{ mt: 2 }}>תתי משימות</Typography>
            {newTask.subtasks.map((subtask, index) => (
              <Box key={index} sx={{ border: '1px solid #ddd', p: 2, borderRadius: 1 }}>
                <Stack spacing={2}>
                  <TextField
                    label="כותרת תת-משימה"
                    value={subtask.title}
                    onChange={(e) => handleSubtaskChange(index, 'title', e.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    select
                    label="מבצע המשימה"
                    value={subtask.assignee || ''}
                    onChange={(e) => handleSubtaskChange(index, 'assignee', e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="אברי">אברי</MenuItem>
                    <MenuItem value="בעז">בעז</MenuItem>
                  </TextField>
                  <TextField
                    label="תאריך"
                    type="date"
                    value={subtask.date || ''}
                    onChange={(e) => handleSubtaskChange(index, 'date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="תיאור"
                    value={subtask.description || ''}
                    onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                  />
                </Stack>
              </Box>
            ))}
            <Button onClick={handleAddSubtask} variant="outlined" fullWidth>
              הוסף תת-משימה
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSaveTask} variant="contained">
            שמור
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TaskList;
