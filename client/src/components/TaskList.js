import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import { supabase } from '../supabaseClient';
import ExportButtons from './ExportButtons';

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

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
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

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      console.log('מתחיל לטעון משימות...');
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('משימות נטענו בהצלחה:', data);
      setTasks(data || []);
    } catch (error) {
      console.error('שגיאה בטעינת משימות:', error);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const taskId = result.draggableId;
    const newStatus = destination.droppableId;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      // עדכון ה-state המקומי
      const updatedTasks = [...tasks];
      const taskIndex = updatedTasks.findIndex(t => t.id.toString() === taskId);
      updatedTasks[taskIndex].status = newStatus;
      setTasks(updatedTasks);
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס משימה:', error);
    }
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

      if (selectedTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', selectedTask.id);

        if (error) {
          console.error('שגיאת עדכון:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);

        if (error) {
          console.error('שגיאת הוספה:', error);
          throw error;
        }
      }

      setOpenDialog(false);
      setSelectedTask(null);
      setNewTask({ title: '', description: '', status: 'TODO', type: 'משימה', customType: '', date: null, subtasks: [], owner: '' });
      fetchTasks();
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
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      const updatedSubtasks = [...(taskToUpdate.subtasks || []), { title: subtaskTitle, completed: false }];
      
      const { error } = await supabase
        .from('tasks')
        .update({ subtasks: updatedSubtasks })
        .eq('id', taskId);

      if (error) throw error;

      const updatedTasks = tasks.map(task =>
        task.id === taskId ? { ...task, subtasks: updatedSubtasks } : task
      );
      setTasks(updatedTasks);
      setNewSubtask('');
      setEditingTaskId(null);
    } catch (error) {
      console.error('שגיאה בהוספת תת משימה:', error);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  // הגדרת העמודות לייצוא
  const exportColumns = [
    { field: 'title', headerName: 'כותרת' },
    { field: 'description', headerName: 'תיאור' },
    { field: 'type', headerName: 'סוג' },
    { field: 'status', headerName: 'סטטוס' },
    { field: 'owner', headerName: 'אחראי' },
    { field: 'due_date', headerName: 'תאריך יעד' },
    { field: 'subtasks', headerName: 'תתי משימות' }
  ];

  // עיבוד הנתונים לייצוא
  const exportData = tasks.map(task => ({
    ...task,
    subtasks: task.subtasks || []
  }));

  return (
    <Box sx={{ p: 2 }}>
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {Object.keys(TASK_STATUS).map((status) => (
            <Grid item xs={12} md={4} key={status}>
              <Card sx={{ height: '100%', backgroundColor: '#f5f5f5' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {TASK_STATUS[status]}
                  </Typography>
                  <Droppable droppableId={status}>
                    {(provided) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{ minHeight: 100 }}
                      >
                        {getTasksByStatus(status).map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id.toString()}
                            index={index}
                          >
                            {(provided) => (
                              <Card 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{ 
                                  mb: 1,
                                  '&:hover': {
                                    boxShadow: 3,
                                    transform: 'translateY(-2px)',
                                    transition: 'all 0.2s ease-in-out'
                                  },
                                  borderRight: 3,
                                  borderColor: task.status === 'DONE' ? 'success.light' : 
                                             task.status === 'IN_PROGRESS' ? 'warning.light' : 
                                             'info.light'
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
                                                }}
                                              />
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
                                                  <Typography
                                                    component="span"
                                                    sx={{
                                                      textDecoration: subtask.completed ? 'line-through' : 'none',
                                                      color: subtask.completed ? 'text.secondary' : 'text.primary'
                                                    }}
                                                  >
                                                    {subtask.title}
                                                  </Typography>
                                                </Box>
                                              }
                                              sx={{ ml: 1 }}
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

      {/* דיאלוג אישור מחיקה */}
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
