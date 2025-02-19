import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Fab,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  Snackbar,
  Checkbox,
  Autocomplete,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

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

  useEffect(() => {
    fetchTasks();
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

  return (
    <Box>
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
                    <Box key={index} sx={{ ml: 2, mb: 1 }}>
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
