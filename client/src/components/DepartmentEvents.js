import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  Snackbar,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const eventTypes = [
  'אירוע',
  'אירוע מועצתי',
  'טיול מועצתי',
  'טיול ישובי',
  'מפעל חיצוני'
];

function DepartmentEvents() {
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);

  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'אירוע',
    start_date: '',
    end_date: '',
    description: ''
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', today)  // רק אירועים מהיום והלאה
        .order('start_date', { ascending: true });  // מסודר לפי תאריך התחלה

      if (error) {
        throw error;
      }

      // נביא גם אירועים מהחודש האחרון
      const { data: pastEvents, error: pastError } = await supabase
        .from('events')
        .select('*')
        .lt('start_date', today)  // אירועים מלפני היום
        .gte('start_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])  // מהחודש האחרון
        .order('start_date', { ascending: false });  // מסודר לפי תאריך התחלה יורד

      if (pastError) {
        throw pastError;
      }

      // נשלב את האירועים: קודם העתידיים ואז העבר הקרוב
      setEvents([...(data || []), ...(pastEvents || [])]);
    } catch (error) {
      console.error('Error fetching events:', error);
      showAlert('שגיאה בטעינת האירועים', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleOpenDialog = (event = null) => {
    if (event) {
      setSelectedEvent(event);
      setNewEvent({
        title: event.title,
        type: event.type,
        start_date: event.start_date,
        end_date: event.end_date || '',
        description: event.description || ''
      });
    } else {
      setSelectedEvent(null);
      setNewEvent({
        title: '',
        type: 'אירוע',
        start_date: '',
        end_date: '',
        description: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = async () => {
    try {
      if (!newEvent.title || !newEvent.type || !newEvent.start_date) {
        showAlert('נא למלא את כל שדות החובה', 'error');
        return;
      }

      if (selectedEvent) {
        const { error } = await supabase
          .from('events')
          .update(newEvent)
          .eq('id', selectedEvent.id);

        if (error) throw error;
        showAlert('האירוע עודכן בהצלחה');
      } else {
        const { error } = await supabase
          .from('events')
          .insert([newEvent]);

        if (error) throw error;
        showAlert('האירוע נוסף בהצלחה');
      }

      await fetchEvents();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving event:', error);
      showAlert('שגיאה בשמירת האירוע', 'error');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק אירוע זה?')) {
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        showAlert('האירוע נמחק בהצלחה');
        await fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        showAlert('שגיאה במחיקת האירוע', 'error');
      }
    }
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate).toLocaleDateString('he-IL');
    if (!endDate) return start;
    const end = new Date(endDate).toLocaleDateString('he-IL');
    return `${start} - ${end}`;
  };

  return (
    <Box>
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>

      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">אירועי המחלקה</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            הוסף אירוע
          </Button>
        </Box>

        {loading ? (
          <Typography>טוען אירועים...</Typography>
        ) : events.length === 0 ? (
          <Typography>אין אירועים להצגה</Typography>
        ) : (
          <List>
            {events.map((event, index) => {
              const isEventPast = new Date(event.start_date) < new Date();
              return (
                <React.Fragment key={event.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6">{event.title}</Typography>
                          <Chip 
                            label={event.type} 
                            size="small" 
                            color={isEventPast ? "default" : "primary"}
                          />
                          {isEventPast && (
                            <Chip 
                              label="הסתיים" 
                              size="small" 
                              color="default"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatDateRange(event.start_date, event.end_date)}
                          </Typography>
                          <Typography variant="body2">{event.description}</Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleOpenDialog(event)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleDeleteEvent(event.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedEvent ? 'עריכת אירוע' : 'הוספת אירוע חדש'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="כותרת"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              required
              fullWidth
            />

            <TextField
              select
              label="סוג אירוע"
              value={newEvent.type}
              onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
              required
              fullWidth
            >
              {eventTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="תאריך התחלה"
              type="date"
              value={newEvent.start_date}
              onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="תאריך סיום"
              type="date"
              value={newEvent.end_date}
              onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="תיאור"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSaveEvent} variant="contained">
            {selectedEvent ? 'עדכן' : 'שמור'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DepartmentEvents;
