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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { he } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('משימה');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(null);
  const [status, setStatus] = useState('pending');

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    // הגדרת הsubscription לעדכונים בזמן אמת
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editTask) {
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
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
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

  return (
    <Box sx={{ p: 3 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(true)}
        sx={{ mb: 3 }}
      >
        הוסף משימה חדשה
      </Button>

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
                >
                  <MenuItem value="משימה">משימה</MenuItem>
                  <MenuItem value="אירוע">אירוע</MenuItem>
                  <MenuItem value="תזכורת">תזכורת</MenuItem>
                </TextField>
              </Grid>
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
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={he}>
                  <DatePicker
                    label="תאריך"
                    value={date}
                    onChange={(newDate) => setDate(newDate)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
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

      <Grid container spacing={2}>
        {tasks.map((task) => (
          <Grid item xs={12} sm={6} md={4} key={task.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" component="div">
                    {task.title}
                  </Typography>
                  <Box>
                    <IconButton onClick={() => handleEdit(task)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(task.id)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  {task.type}
                </Typography>
                {task.description && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {task.description}
                  </Typography>
                )}
                {task.date && (
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    תאריך: {format(new Date(task.date), 'dd/MM/yyyy')}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    color:
                      task.status === 'completed'
                        ? 'success.main'
                        : task.status === 'in_progress'
                        ? 'warning.main'
                        : 'text.secondary'
                  }}
                >
                  סטטוס:{' '}
                  {task.status === 'completed'
                    ? 'הושלם'
                    : task.status === 'in_progress'
                    ? 'בביצוע'
                    : 'בהמתנה'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TaskList;
