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
  Person as PersonIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ExportButtons from './ExportButtons';
import { showNewTaskNotification, showNewSubtaskNotification } from '../services/notificationService';

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

        // בדיקה אם למשתמש יש הרשאת view_all_tasks
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('permissions')
          .eq('id', user.id)
          .single();

        let query = supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        // אם אין הרשאת view_all_tasks, מציגים רק את המשימות של המשתמש
        if (!userProfile?.permissions?.includes('view_all_tasks')) {
          query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) throw error;
        setTasks(data || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
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

      if (error) {
        throw error;
      }
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

      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        status: newTask.status,
        type: newTask.type === 'אחר' ? newTask.customType : newTask.type,
        date: newTask.date ? new Date(newTask.date).toISOString().split('T')[0] : null,
        subtasks: newTask.subtasks || [],
        owner: newTask.owner?.trim() || null,
        created_at: new Date().toISOString()
      };

      let updatedTask;
      
      if (selectedTask) {
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', selectedTask.id)
          .select()
          .single();

        if (error) throw error;
        updatedTask = data;
        
        setTasks(tasks.map(task => 
          task.id === selectedTask.id ? updatedTask : task
        ));
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert([taskData])
          .select()
          .single();

        if (error) throw error;
        updatedTask = data;
        
        setTasks([...tasks, updatedTask]);
        showNewTaskNotification(updatedTask);
      }

      setOpenDialog(false);
      setSelectedTask(null);
      setNewTask({ title: '', description: '', status: 'TODO', type: 'משימה', customType: '', date: null, subtasks: [], owner: '' });
    } catch (error) {
      console.error('שגיאה בשמירת משימה:', error);
      alert('שגיאה בשמירת המשימה: ' + error.message);
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
      const taskIndex = updatedTasks.findIndex(t => t.id.toString() === taskId);
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
      showNewSubtaskNotification(parentTask, newSubtask);
    } catch (error) {
      console.error('שגיאה בהוספת תת משימה:', error);
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">משימות ואירועים</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedTask(null);
              setNewTask({ title: '', description: '', status: 'TODO', type: 'משימה', customType: '', date: null, subtasks: [], owner: '' });
              setOpenDialog(true);
            }}
            sx={{ mb: 3 }}
          >
            משימה חדשה
          </Button>
          <ExportButtons
            data={exportData}
            filename="רשימת_משימות"
            columns={exportColumns}
          />
        </Box>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : tasks.length === 0 ? (
        <Alert severity="info">אין משימות</Alert>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Grid container spacing={2}>
            {Object.keys(TASK_STATUS).map((status) => (
              <Grid item xs={12} md={4} key={status}>
                <Card sx={{ height: '100%', backgroundColor: '#f5f5f5', overflow: 'visible' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {TASK_STATUS[status]}
                    </Typography>
                    <Droppable droppableId={status}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          sx={{ 
                            minHeight: 100,
                            backgroundColor: snapshot.isDraggingOver ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                            transition: 'background-color 0.2s ease',
                            borderRadius: 1,
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
                                      mb: 1,
                                      cursor: 'grab',
                                      transform: snapshot.isDragging ? 'rotate(2deg) !important' : 'none',
                                      zIndex: snapshot.isDragging ? 1 : 'auto',
                                      position: 'relative',
                                      '&:hover': {
                                        boxShadow: 3,
                                        transform: 'translateY(-2px)',
                                      },
                                      '&:active': {
                                        cursor: 'grabbing',
                                      },
                                      borderRight: 3,
                                      borderColor: task.status === 'DONE' ? 'success.light' : 
                                                 task.status === 'IN_PROGRESS' ? 'warning.light' : 
                                                 'info.light',
                                      backgroundColor: snapshot.isDragging ? 'grey.100' : 'background.paper'
                                    }}
                                  >
                                    <CardContent>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                                          {task.title}
                                        </Typography>
                                        <Box>
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
                                            sx={{ color: 'primary.main' }}
                                          >
                                            <EditIcon />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteClick(task.id);
                                            }}
                                            sx={{ color: 'error.main' }}
                                          >
                                            <DeleteIcon />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                      {task.description && (
                                        <Typography 
                                          variant="body2" 
                                          color="text.secondary" 
                                          sx={{ 
                                            mb: 2,
                                            backgroundColor: 'grey.50',
                                            p: 1,
                                            borderRadius: 1
                                          }}
                                        >
                                          {task.description}
                                        </Typography>
                                      )}
                                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                                        <Box>
                                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                            סוג משימה
                                          </Typography>
                                          <Chip
                                            size="small"
                                            label={task.type}
                                            sx={{ 
                                              backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                              color: 'primary.main',
                                              fontWeight: 'medium'
                                            }}
                                          />
                                        </Box>
                                        {(task.date || task.owner) && (
                                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                                            {task.date && (
                                              <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                  תאריך יעד
                                                </Typography>
                                                <Chip
                                                  size="small"
                                                  label={new Date(task.date).toLocaleDateString('he-IL')}
                                                  icon={<EventIcon />}
                                                  sx={{ 
                                                    backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                    color: 'secondary.main',
                                                    '& .MuiChip-icon': {
                                                      color: 'secondary.main'
                                                    }
                                                  }}
                                                />
                                              </Box>
                                            )}
                                            {task.owner && (
                                              <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                  אחראי
                                                </Typography>
                                                <Chip
                                                  size="small"
                                                  label={task.owner}
                                                  icon={<PersonIcon />}
                                                  sx={{ 
                                                    backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                                    color: 'success.main',
                                                    '& .MuiChip-icon': {
                                                      color: 'success.main'
                                                    }
                                                  }}
                                                />
                                              </Box>
                                            )}
                                          </Box>
                                        )}
                                      </Box>
                                      <Box 
                                        sx={{ 
                                          backgroundColor: 'grey.50',
                                          borderRadius: 1,
                                          p: 1
                                        }}
                                      >
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                          תתי משימות
                                        </Typography>
                                        {task.subtasks && task.subtasks.length > 0 && (
                                          <List dense sx={{ mb: 1 }}>
                                            {task.subtasks.map((subtask, index) => (
                                              <ListItem
                                                key={index}
                                                dense
                                                disablePadding
                                                sx={{
                                                  py: 0.5,
                                                  pr: { xs: 8, sm: 7 },
                                                  pl: { xs: 1, sm: 2 },
                                                }}
                                                secondaryAction={
                                                  <Checkbox
                                                    edge="end"
                                                    checked={subtask.completed}
                                                    onChange={() => handleToggleSubtask(task.id, index)}
                                                    sx={{
                                                      color: 'primary.light',
                                                      '&.Mui-checked': {
                                                        color: 'success.main',
                                                      },
                                                      mr: -6,
                                                      transform: 'scale(1.1)'
                                                    }}
                                                  />
                                                }
                                              >
                                                <ListItemText 
                                                  primary={
                                                    <Box component="span" sx={{ 
                                                      display: 'flex', 
                                                      alignItems: 'center',
                                                      width: '100%'
                                                    }}>
                                                      <Typography
                                                        component="span"
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{ 
                                                          minWidth: '25px',
                                                          fontWeight: 'medium',
                                                          ml: { xs: 0, sm: 1 }
                                                        }}
                                                      >
                                                        {index + 1}.
                                                      </Typography>
                                                      <Typography
                                                        component="span"
                                                        sx={{
                                                          textDecoration: subtask.completed ? 'line-through' : 'none',
                                                          color: subtask.completed ? 'text.secondary' : 'text.primary',
                                                          fontSize: { xs: '0.9rem', sm: '1rem' },
                                                          pr: 3
                                                        }}
                                                      >
                                                        {subtask.title}
                                                      </Typography>
                                                    </Box>
                                                  }
                                                />
                                              </ListItem>
                                            ))}
                                          </List>
                                        )}
                                        {editingTaskId === task.id ? (
                                          <Box sx={{ display: 'flex', gap: 1 }}>
                                            <TextField
                                              size="small"
                                              fullWidth
                                              placeholder="הוסף תת משימה"
                                              value={newSubtask}
                                              onChange={(e) => setNewSubtask(e.target.value)}
                                              onKeyPress={(e) => {
                                                if (e.key === 'Enter' && newSubtask.trim()) {
                                                  handleAddSubtask(task.id, newSubtask.trim());
                                                }
                                              }}
                                            />
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              onClick={() => {
                                                if (newSubtask.trim()) {
                                                  handleAddSubtask(task.id, newSubtask.trim());
                                                }
                                              }}
                                            >
                                              הוסף
                                            </Button>
                                          </Box>
                                        ) : (
                                          <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => setEditingTaskId(task.id)}
                                            sx={{ mt: task.subtasks?.length > 0 ? 1 : 0 }}
                                          >
                                            הוסף תת משימה
                                          </Button>
                                        )}
                                      </Box>
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTask ? 'עריכת משימה' : 'משימה חדשה'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                label="כותרת"
                fullWidth
                required
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                error={!newTask.title.trim()}
                helperText={!newTask.title.trim() ? 'שדה חובה' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="סוג משימה"
                fullWidth
                value={newTask.type === 'אחר' && newTask.customType ? 'אחר' : newTask.type}
                onChange={(e) => {
                  if (e.target.value === 'אחר') {
                    setNewTask({ ...newTask, type: 'אחר', customType: '' });
                  } else {
                    setNewTask({ ...newTask, type: e.target.value, customType: '' });
                  }
                }}
                required
              >
                {eventTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {(newTask.type === 'אחר' || !eventTypes.includes(newTask.type)) && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="הזן סוג משימה"
                  value={newTask.customType}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewTask({ ...newTask, type: 'אחר', customType: value });
                  }}
                  required
                  placeholder="הקלד סוג משימה מותאם אישית"
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label="תיאור"
                fullWidth
                multiline
                rows={4}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="תאריך יעד"
                  value={newTask.date}
                  onChange={(newDate) => setNewTask({ ...newTask, date: newDate })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="אחראי משימה"
                fullWidth
                value={newTask.owner}
                onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })}
                placeholder="הזן את שם האחראי"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="סטטוס"
                fullWidth
                value={newTask.status}
                onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
              >
                <MenuItem value="TODO">לביצוע</MenuItem>
                <MenuItem value="IN_PROGRESS">בתהליך</MenuItem>
                <MenuItem value="DONE">הושלם</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                תתי משימות
              </Typography>
              <List dense>
                {newTask.subtasks.map((subtask, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => {
                        const newSubtasks = [...newTask.subtasks];
                        newSubtasks.splice(index, 1);
                        setNewTask({ ...newTask, subtasks: newSubtasks });
                      }}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText 
                      primary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                            sx={{ minWidth: '25px', fontWeight: 'medium' }}
                          >
                            {index + 1}.
                          </Typography>
                          <Typography component="span">
                            {subtask.title}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="הוסף תת משימה"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newSubtask.trim()) {
                      const subtask = {
                        title: newSubtask.trim(),
                        completed: false
                      };
                      setNewTask({
                        ...newTask,
                        subtasks: [...newTask.subtasks, subtask]
                      });
                      setNewSubtask('');
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (newSubtask.trim()) {
                      const subtask = {
                        title: newSubtask.trim(),
                        completed: false
                      };
                      setNewTask({
                        ...newTask,
                        subtasks: [...newTask.subtasks, subtask]
                      });
                      setNewSubtask('');
                    }
                  }}
                >
                  הוסף
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>ביטול</Button>
          <Button onClick={handleSaveTask} variant="contained" color="primary">
            {selectedTask ? 'שמור שינויים' : 'צור משימה'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        dir="rtl"
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          האם למחוק את המשימה?
        </DialogTitle>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
          >
            כן, למחוק
          </Button>
          <Button
            variant="outlined"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            ביטול
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskList;
