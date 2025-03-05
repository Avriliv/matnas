import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import heLocale from '@fullcalendar/core/locales/he';
import {
  Box,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Popover,
  Snackbar,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { showNewTaskNotification } from '../services/notificationService';

function SimpleCalendar() {
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start: '',
    end: '',
    type: 'אירוע'
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    action: null,
    eventToDelete: null
  });

  useEffect(() => {
    const checkAndCreateTable = async () => {
      try {
        // בודק אם הטבלה קיימת
        const { data, error } = await supabase
          .from('department_events')
          .select('*')
          .limit(1);

        console.log('Table check result:', { data, error });

        if (error) {
          console.error('Error checking table:', error);
        }
      } catch (err) {
        console.error('Error in checkAndCreateTable:', err);
      }
    };

    checkAndCreateTable();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      console.log('Fetching events...');
      
      // מביא אירועי מחלקה מהטבלה הייעודית
      const { data: departmentEvents, error: deptError } = await supabase
        .from('department_events')
        .select('*');

      if (deptError) {
        console.error('Error fetching department events:', deptError);
        throw deptError;
      }

      // מביא אירועי מחלקה מהטאב של אירועי מחלקה
      const { data: departmentTab, error: tabError } = await supabase
        .from('events')  
        .select('*');

      if (tabError) {
        console.error('Error fetching department tab events:', tabError);
        throw tabError;
      }

      // מביא חופשות וחגים
      const { data: holidays, error: holidaysError } = await supabase
        .from('education_dates')
        .select('*');

      if (holidaysError) {
        console.error('Error fetching holidays:', holidaysError);
        throw holidaysError;
      }

      // מסדר את התאריכים כדי למנוע כפילויות
      const uniqueHolidays = (holidays || []).reduce((acc, holiday) => {
        const key = `${holiday.start_date}_${holiday.end_date}`;
        if (!acc[key]) {
          acc[key] = holiday;
        }
        return acc;
      }, {});

      // ממפה את האירועים לפורמט של FullCalendar
      const formattedEvents = [
        // אירועי מחלקה מהטבלה הייעודית
        ...(departmentEvents || []).map(event => ({
          id: `dept_${event.id}`,
          title: event.title,
          start: event.start_date,
          end: new Date(new Date(event.end_date).getTime() + (24 * 60 * 60 * 1000)).toISOString(), // מוסיף יום אחד לתאריך הסיום
          backgroundColor: '#1976d2',
          borderColor: '#1976d2',
          type: 'אירוע מחלקה',
          allDay: true,
          display: 'block'
        })),
        // אירועי מחלקה מהטאב
        ...(departmentTab || []).map(event => ({
          id: `tab_${event.id}`,
          title: event.title || event.name,
          start: event.date || event.start_date,
          end: event.end_date ? new Date(new Date(event.end_date).getTime() + (24 * 60 * 60 * 1000)).toISOString() : event.date, // מוסיף יום אחד לתאריך הסיום אם קיים
          backgroundColor: '#9c27b0',
          borderColor: '#9c27b0',
          type: 'אירוע מחלקה מהטאב',
          allDay: true,
          display: 'block'
        })),
        // חופשות וחגים
        ...Object.values(uniqueHolidays).map(holiday => ({
          id: `holiday_${holiday.id}`,
          title: holiday.title,
          start: holiday.start_date,
          end: new Date(new Date(holiday.end_date).getTime() + (24 * 60 * 60 * 1000)).toISOString(), // מוסיף יום אחד לתאריך הסיום
          backgroundColor: '#4caf50',
          borderColor: '#4caf50',
          type: 'חופשה',
          allDay: true,
          display: 'block'
        }))
      ];

      console.log('All events:', formattedEvents);
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error in fetchEvents:', error);
    }
  };

  const handleDateClick = (arg) => {
    const clickedDate = new Date(arg.dateStr);
    const formattedDate = clickedDate.toISOString().split('T')[0];
    
    setNewEvent({
      title: '',
      start: formattedDate,
      end: formattedDate,
      type: 'אירוע'
    });
    setOpenDialog(true);
  };

  const handleDateSelect = (arg) => {
    const start = arg.start.toISOString().split('T')[0];
    const end = arg.end.toISOString().split('T')[0];

    setNewEvent({
      title: '',
      start,
      end,
      type: 'אירוע'
    });
    setOpenDialog(true);
  };

  const handleEventClick = (info) => {
    if (info.event.id.startsWith('dept_') || info.event.id.startsWith('tab_')) {
      setSelectedEvent(info.event);
      setAnchorEl(info.el);
    }
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setSelectedEvent(null);
  };

  const handleEdit = () => {
    setNewEvent({
      title: selectedEvent.title,
      start: selectedEvent.start.toISOString().split('T')[0],
      end: selectedEvent.end ? selectedEvent.end.toISOString().split('T')[0] : selectedEvent.start.toISOString().split('T')[0],
      type: 'אירוע'
    });
    setEditMode(true);
    setOpenDialog(true);
    handlePopoverClose();
  };

  const handleDelete = () => {
    setSnackbar({
      open: true,
      message: `האם למחוק את האירוע "${selectedEvent.title}"?`,
      action: () => {
        if (selectedEvent.id.startsWith('dept_')) {
          const eventId = selectedEvent.id.replace('dept_', '');
          deleteEvent('department_events', eventId);
        } else if (selectedEvent.id.startsWith('tab_')) {
          const eventId = selectedEvent.id.replace('tab_', '');
          deleteEvent('events', eventId);
        }
      },
      eventToDelete: selectedEvent
    });
    handlePopoverClose();
  };

  const deleteEvent = async (tableName, eventId) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        setSnackbar({
          open: true,
          message: 'לא הצלחנו למחוק את האירוע',
          action: null,
          eventToDelete: null
        });
        return;
      }

      // מסיר את האירוע מהמצב המקומי
      const prefix = tableName === 'department_events' ? 'dept_' : 'tab_';
      setEvents(prev => prev.filter(event => event.id !== `${prefix}${eventId}`));
      
      // מציג הודעת הצלחה
      setSnackbar({
        open: true,
        message: 'האירוע נמחק בהצלחה',
        action: null,
        eventToDelete: null
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      setSnackbar({
        open: true,
        message: 'לא הצלחנו למחוק את האירוע',
        action: null,
        eventToDelete: null
      });
    }
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title || !newEvent.start) {
      alert('נא למלא כותרת ותאריך התחלה');
      return;
    }

    try {
      const startDateTime = new Date(newEvent.start);
      startDateTime.setHours(9, 0, 0);
      
      const endDateTime = new Date(newEvent.end || newEvent.start);
      endDateTime.setHours(18, 0, 0);

      const eventData = {
        title: newEvent.title,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        description: '',
        type: 'אירוע מחלקה'
      };

      if (editMode && selectedEvent) {
        // עדכון אירוע קיים
        const tableName = selectedEvent.id.startsWith('dept_') ? 'department_events' : 'events';
        const eventId = selectedEvent.id.startsWith('dept_') ? 
          selectedEvent.id.replace('dept_', '') : 
          selectedEvent.id.replace('tab_', '');

        const { error } = await supabase
          .from(tableName)
          .update(eventData)
          .eq('id', eventId);

        if (error) {
          console.error('Error updating event:', error);
          alert('לא הצלחנו לעדכן את האירוע');
          return;
        }
      } else {
        // יצירת אירוע חדש
        const { error } = await supabase
          .from('department_events')
          .insert([eventData]);

        if (error) {
          console.error('Error creating event:', error);
          alert('לא הצלחנו ליצור את האירוע');
          return;
        }
      }

      setOpenDialog(false);
      setEditMode(false);
      setSelectedEvent(null);
      setNewEvent({
        title: '',
        start: '',
        end: '',
        type: 'אירוע'
      });
      
      // רענון האירועים
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('שגיאה בשמירת האירוע');
    }
  };

  return (
    <Box sx={{ height: '100vh', width: '100%', p: 2 }}>
      <Paper elevation={3} sx={{ 
        height: '90vh',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRadius: 2
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2
        }}>
          <Typography variant="h5" component="h2">לוח אירועים</Typography>
        </Box>

        <Box sx={{ 
          height: 'calc(100% - 60px)',
          '& .fc': { 
            height: '100%',
            '--fc-button-bg-color': '#fff',
            '--fc-button-border-color': '#e0e0e0',
            '--fc-button-text-color': '#333',
            '--fc-button-hover-bg-color': '#f5f5f5',
            '--fc-button-hover-border-color': '#e0e0e0',
            '--fc-button-active-bg-color': '#1976d2',
            '--fc-button-active-text-color': '#fff',
            '--fc-today-bg-color': 'rgba(25, 118, 210, 0.08)',
            fontFamily: 'Rubik, sans-serif'
          },
          '& .fc-view-harness': {
            height: '100% !important'
          },
          '& .fc-daygrid-day': {
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)'
            }
          },
          '& .fc-toolbar-title': {
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#333'
          },
          '& .fc-button': {
            textTransform: 'capitalize',
            boxShadow: 'none',
            padding: '6px 16px',
            fontSize: '0.9rem',
            fontWeight: 500,
            borderRadius: '8px',
            marginLeft: '4px',
            marginRight: '4px',
            transition: 'all 0.2s',
            '&:focus': {
              boxShadow: '0 0 0 2px rgba(25,118,210,0.25)',
              outline: 'none'
            },
            '&:hover': {
              backgroundColor: '#f5f5f5'
            },
            '&.fc-button-active': {
              backgroundColor: '#1976d2',
              borderColor: '#1976d2',
              color: '#fff',
              '&:hover': {
                backgroundColor: '#1565c0'
              }
            }
          },
          '& .fc-today-button': {
            backgroundColor: '#1976d2',
            borderColor: '#1976d2',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#1565c0',
              borderColor: '#1565c0'
            },
            '&:disabled': {
              backgroundColor: '#e0e0e0',
              borderColor: '#e0e0e0',
              color: '#999'
            }
          },
          '& .fc-prev-button, & .fc-next-button': {
            backgroundColor: '#fff',
            borderColor: '#e0e0e0',
            color: '#666',
            padding: '6px 12px',
            '&:hover': {
              backgroundColor: '#f5f5f5',
              borderColor: '#e0e0e0',
              color: '#333'
            }
          },
          '& .fc-toolbar': {
            marginBottom: '1.5rem',
            padding: '0.5rem',
            borderRadius: '8px',
            backgroundColor: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }
        }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            locale={heLocale}
            direction="rtl"
            headerToolbar={{
              start: 'today prev,next',
              center: 'title',
              end: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            buttonText={{
              today: 'היום',
              month: 'חודש',
              week: 'שבוע',
              day: 'יום',
              list: 'רשימה'
            }}
            height="100%"
            events={events}
            eventDisplay="block"
          />
        </Box>
      </Paper>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Box sx={{ display: 'flex', p: 1 }}>
          <IconButton onClick={handleEdit} size="small" sx={{ mr: 1 }}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={handleDelete} size="small">
            <DeleteIcon />
          </IconButton>
        </Box>
      </Popover>

      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setEditMode(false);
          setNewEvent({
            title: '',
            start: '',
            end: '',
            type: 'אירוע'
          });
        }}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>
          {editMode ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="כותרת"
            type="text"
            fullWidth
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            sx={{ 
              mb: 2,
              '& .MuiInputBase-input': {
                textAlign: 'right',
                direction: 'rtl'
              }
            }}
            InputProps={{
              dir: 'rtl'
            }}
          />
          <TextField
            margin="dense"
            label="תאריך התחלה"
            type="date"
            fullWidth
            value={newEvent.start}
            onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            margin="dense"
            label="תאריך סיום"
            type="date"
            fullWidth
            value={newEvent.end}
            onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setEditMode(false);
            setNewEvent({
              title: '',
              start: '',
              end: '',
              type: 'אירוע'
            });
          }}>ביטול</Button>
          <Button onClick={handleSaveEvent} variant="contained" color="primary">
            שמור
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.action ? null : 3000}
        onClose={() => setSnackbar({ open: false, message: '', action: null, eventToDelete: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.action ? "warning" : "success"}
          action={
            snackbar.action ? (
              <>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    snackbar.action();
                    setSnackbar({ open: false, message: '', action: null, eventToDelete: null });
                  }}
                >
                  כן
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setSnackbar({ open: false, message: '', action: null, eventToDelete: null })}
                >
                  לא
                </Button>
              </>
            ) : null
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SimpleCalendar;
