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
  TextField
} from '@mui/material';
import { showNewTaskNotification } from '../services/notificationService';

function SimpleCalendar() {
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start: '',
    end: '',
    type: 'אירוע'
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      // מביא אירועי מחלקה
      const { data: departmentEvents, error: deptError } = await supabase
        .from('department_events')
        .select('*');

      if (deptError) throw deptError;

      // מביא חופשות וחגים
      const { data: holidays, error: holidaysError } = await supabase
        .from('education_dates')
        .select('*');

      if (holidaysError) throw holidaysError;

      // ממפה את האירועים לפורמט של FullCalendar
      const formattedEvents = [
        ...(departmentEvents || []).map(event => ({
          id: `dept_${event.id}`,
          title: event.title,
          start: event.start_date,
          end: event.end_date,
          backgroundColor: '#1976d2',
          borderColor: '#1976d2',
          type: 'אירוע מחלקה',
          allDay: true
        })),
        ...(holidays || []).map(holiday => ({
          id: `holiday_${holiday.id}`,
          title: holiday.title,
          start: holiday.start_date,
          end: holiday.end_date,
          backgroundColor: '#4caf50',
          borderColor: '#4caf50',
          type: 'חופשה',
          allDay: true
        }))
      ];

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleDateClick = (arg) => {
    setNewEvent({
      title: '',
      start: arg.dateStr,
      end: arg.dateStr,
      type: 'אירוע'
    });
    setOpenDialog(true);
  };

  const handleEventClick = (info) => {
    // כאן אפשר להוסיף לוגיקה לצפייה/עריכה של אירוע קיים
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title || !newEvent.start) return;

    try {
      // שומר את האירוע ב-Supabase
      const { data, error } = await supabase
        .from('department_events')
        .insert([{
          title: newEvent.title,
          start_date: newEvent.start,
          end_date: newEvent.end || newEvent.start
        }])
        .select();

      if (error) throw error;

      // מוסיף את האירוע החדש לרשימת האירועים המקומית
      const newEventFormatted = {
        id: `dept_${data[0].id}`,
        title: newEvent.title,
        start: newEvent.start,
        end: newEvent.end || newEvent.start,
        backgroundColor: '#1976d2',
        borderColor: '#1976d2',
        type: 'אירוע מחלקה',
        allDay: true
      };

      setEvents(prev => [...prev, newEventFormatted]);
      showNewTaskNotification({
        title: newEvent.title,
        due_date: newEvent.start,
        type: 'אירוע מחלקה'
      });
      
      setOpenDialog(false);
      setNewEvent({
        title: '',
        start: '',
        end: '',
        type: 'אירוע'
      });

      // מרענן את הנתונים מהשרת
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  return (
    <Box sx={{ 
      height: '100vh',
      width: '100%',
      p: 2
    }}>
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
            locale={heLocale}
            direction="rtl"
            headerToolbar={{
              start: 'prev,next today',
              center: 'title',
              end: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            views={{
              dayGridMonth: {
                titleFormat: { year: 'numeric', month: 'long' }
              },
              timeGridWeek: {
                titleFormat: { year: 'numeric', month: 'long', day: '2-digit' },
                slotMinTime: '07:00:00',
                slotMaxTime: '20:00:00',
                slotDuration: '00:30:00'
              },
              timeGridDay: {
                titleFormat: { year: 'numeric', month: 'long', day: '2-digit' },
                slotMinTime: '07:00:00',
                slotMaxTime: '20:00:00',
                slotDuration: '00:30:00'
              },
              listWeek: {
                titleFormat: { year: 'numeric', month: 'long' },
                noEventsContent: 'אין אירועים להצגה'
              }
            }}
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            dayMaxEvents={3}
            eventDisplay="block"
            expandRows={true}
            height="100%"
            allDaySlot={true}
            allDayText="כל היום"
            buttonText={{
              today: 'היום',
              month: 'חודש',
              week: 'שבוע',
              day: 'יום',
              list: 'רשימה'
            }}
          />
        </Box>
      </Paper>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>הוספת אירוע חדש</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="כותרת"
            type="text"
            fullWidth
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            sx={{ mb: 2 }}
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
          <Button onClick={() => setOpenDialog(false)}>ביטול</Button>
          <Button onClick={handleSaveEvent} variant="contained" color="primary">
            שמור
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SimpleCalendar;
