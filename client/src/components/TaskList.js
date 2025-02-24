import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Tooltip,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient';

const eventTypes = [
  'משימה',
  'אירוע',
  'טיול מועצתי',
  'טיול ישובי',
  'אירוע מועצתי',
  'מפעל חיצוני',
  'אחר'
];

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('משימה');
  const [customType, setCustomType] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(null);
  const [status, setStatus] = useState('pending');
  const [expandedTasks, setExpandedTasks] = useState([]);
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [currentParentTask, setCurrentParentTask] = useState(null);
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    status: 'pending'
  });
  
  // פילטרים ומיון
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');

  const fetchTasks = useCallback(async () => {
    try {
      console.log('מתחיל לטעון משימות ראשיות...');
      const { data: mainTasks, error: mainError } = await supabase
        .from('tasks')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (mainError) {
        console.error('שגיאה בטעינת משימות ראשיות:', mainError);
        throw mainError;
      }

      console.log('טוען משימות משנה...');
      const { data: subtasks, error: subtasksError } = await supabase
        .from('tasks')
        .select('*')
        .not('parent_id', 'is', null);

      if (subtasksError) {
        console.error('שגיאה בטעינת משימות משנה:', subtasksError);
        throw subtasksError;
      }

      // מיפוי משימות המשנה למשימות הראשיות
      const tasksWithSubtasks = mainTasks.map(task => ({
        ...task,
        subtasks: subtasks.filter(subtask => subtask.parent_id === task.id)
      }));
      
      console.log('משימות נטענו בהצלחה:', tasksWithSubtasks);
      setTasks(tasksWithSubtasks || []);
      applyFiltersAndSort(tasksWithSubtasks);
    } catch (error) {
      console.error('Error fetching tasks:', error.message || error);
    }
  }, []);

  const applyFiltersAndSort = useCallback((taskList = tasks) => {
    let filtered = [...taskList];

    // הפעלת פילטרים
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(task => task.type === typeFilter);
    }

    // מיון
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'asc' 
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'title') {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      return 0;
    });

    setFilteredTasks(filtered);
  }, [statusFilter, typeFilter, sortBy, sortOrder, tasks]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [statusFilter, typeFilter, sortBy, sortOrder, tasks, applyFiltersAndSort]);

  useEffect(() => {
    fetchTasks();

    const subscription = supabase
      .channel('tasks_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('Real-time update:', payload);
        fetchTasks();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchTasks]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !type || !date || !status) {
      alert('נא למלא את כל השדות החובה');
      return;
    }
    
    try {
      if (editTask && editTask.id) {
        const { error } = await supabase
          .from('tasks')
          .update({
            title,
            type,
            description,
            date,
            status
          })
          .eq('id', editTask.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([
            {
              title,
              type,
              description,
              date,
              status
            }
          ]);

        if (error) throw error;
      }

      setOpen(false);
      clearForm();
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('אירעה שגיאה בשמירת המשימה');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      // מחיקת משימות משנה קודם
      const { error: subtasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('parent_id', taskId);

      if (subtasksError) throw subtasksError;

      // מחיקת המשימה הראשית
      const { error: mainTaskError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (mainTaskError) throw mainTaskError;

      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('שגיאה במחיקת המשימה');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error deleting subtask:', error);
      alert('שגיאה במחיקת משימת המשנה');
    }
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setTitle(task.title);
    setType(task.type);
    setDescription(task.description || '');
    setDate(task.date);
    setStatus(task.status || 'pending');
    setOpen(true);
  };

  const clearForm = () => {
    setEditTask(null);
    setTitle('');
    setType('משימה');
    setDescription('');
    setDate(null);
    setStatus('pending');
  };

  const handleClose = () => {
    setOpen(false);
    clearForm();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'משימה':
        return 'primary';
      case 'אירוע':
        return 'secondary';
      case 'תזכורת':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleSubtaskSubmit = async (e) => {
    e.preventDefault();
    if (!newSubtask.title) {
      alert('נא להזין כותרת למשימת המשנה');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            title: newSubtask.title,
            description: newSubtask.description,
            status: newSubtask.status,
            parent_id: currentParentTask.id,
            type: 'subtask'
          }
        ]);

      if (error) throw error;

      setSubtaskDialogOpen(false);
      setNewSubtask({ title: '', description: '', status: 'pending' });
      fetchTasks();
    } catch (error) {
      console.error('Error adding subtask:', error);
      alert('שגיאה בהוספת משימת משנה');
    }
  };

  const renderSubtasks = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) return null;

    return (
      <Collapse in={expandedTasks.includes(task.id)}>
        <List sx={{ pl: 4 }}>
          {task.subtasks.map((subtask) => (
            <ListItem
              key={subtask.id}
              sx={{
                borderLeft: '1px solid #ccc',
                mb: 1,
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="body1" component="div">
                    {subtask.title}
                  </Typography>
                }
                secondary={
                  <Box component="div">
                    <Typography variant="body2" component="div" color="textSecondary" sx={{ mb: 1 }}>
                      {subtask.description}
                    </Typography>
                    <Chip
                      label={subtask.status === 'completed' ? 'הושלם' : 'בתהליך'}
                      color={subtask.status === 'completed' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeleteSubtask(subtask.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Collapse>
    );
  };

  const toggleTaskExpansion = (taskId) => {
    if (expandedTasks.includes(taskId)) {
      setExpandedTasks(expandedTasks.filter(id => id !== taskId));
    } else {
      setExpandedTasks([...expandedTasks, taskId]);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpen(true)}
        >
          הוסף משימה חדשה
        </Button>
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>סטטוס</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="סטטוס"
            size="small"
          >
            <MenuItem value="all">הכל</MenuItem>
            <MenuItem value="pending">בהמתנה</MenuItem>
            <MenuItem value="in_progress">בביצוע</MenuItem>
            <MenuItem value="completed">הושלם</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>סוג</InputLabel>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            label="סוג"
            size="small"
          >
            <MenuItem value="all">הכל</MenuItem>
            <MenuItem value="משימה">משימה</MenuItem>
            <MenuItem value="אירוע">אירוע</MenuItem>
            <MenuItem value="תזכורת">תזכורת</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>מיין לפי</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label="מיין לפי"
            size="small"
          >
            <MenuItem value="date">תאריך</MenuItem>
            <MenuItem value="title">כותרת</MenuItem>
          </Select>
        </FormControl>

        <Tooltip title={sortOrder === 'asc' ? 'סדר עולה' : 'סדר יורד'}>
          <IconButton onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
            <SortIcon sx={{ transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none' }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editTask ? 'ערוך משימה' : 'הוסף משימה חדשה'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="כותרת"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="סוג"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  {eventTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {type === 'אחר' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="סוג מותאם אישית"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    required
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="תיאור"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={4}
                />
              </Grid>
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="תאריך"
                    value={date}
                    onChange={(newDate) => setDate(newDate)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="סטטוס"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="pending">בהמתנה</MenuItem>
                  <MenuItem value="in_progress">בביצוע</MenuItem>
                  <MenuItem value="completed">הושלם</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>ביטול</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editTask ? 'שמור שינויים' : 'צור משימה'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={subtaskDialogOpen} onClose={() => setSubtaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>הוסף משימת משנה</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="כותרת"
                  value={newSubtask.title}
                  onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="תיאור"
                  value={newSubtask.description}
                  onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubtaskDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleSubtaskSubmit} variant="contained" color="primary">
            הוסף משימת משנה
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={2}>
        {filteredTasks.map((task) => (
          <Grid item xs={12} sm={6} md={4} key={task.id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              position: 'relative',
              opacity: task.status === 'completed' ? 0.8 : 1
            }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs>
                    <Typography variant="h6" component="div" sx={{ 
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none'
                    }}>
                      {task.title}
                    </Typography>
                    <Typography color="text.secondary">{task.description}</Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        label={task.type === 'אחר' ? task.customType : task.type} 
                        size="small"
                        color={getTypeColor(task.type)}
                      />
                      <Chip 
                        label={
                          task.status === 'completed' ? 'הושלם' :
                          task.status === 'in_progress' ? 'בביצוע' : 'בהמתנה'
                        }
                        size="small"
                        color={getStatusColor(task.status)}
                      />
                    </Box>
                  </Grid>
                  <Grid item>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        onClick={() => handleEdit(task)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteTask(task.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setCurrentParentTask(task);
                          setSubtaskDialogOpen(true);
                        }}
                        color="primary"
                      >
                        <AddIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => toggleTaskExpansion(task.id)}
                        color="primary"
                      >
                        {expandedTasks.includes(task.id) ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                      </IconButton>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
              {renderSubtasks(task)}
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TaskList;
