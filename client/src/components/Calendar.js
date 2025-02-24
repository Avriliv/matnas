import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import heLocale from '@fullcalendar/core/locales/he';
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
  IconButton,
  Alert,
  Snackbar,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const eventTypes = [
  'אירוע',
  'טיול מועצתי',
  'טיול ישובי',
  'אירוע מועצתי',
  'מפעל חיצוני',
  'חופשה'
];

function Calendar() {
  const [events, setEvents] = useState([]);
  const [educationDates, setEducationDates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'אירוע',
    start_date: '',
    end_date: '',
    description: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchEducationDates();
  }, []);

  async function fetchEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      showAlert('שגיאה בטעינת האירועים', 'error');
    }
  }

  async function fetchEducationDates() {
    try {
      const { data, error } = await supabase
        .from('education_dates')
        .select('*')
        .order('start_date');

      if (error) throw error;
      setEducationDates(data || []);
    } catch (error) {
      showAlert('שגיאה בטעינת מועדי החינוך', 'error');
    }
  }

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

      fetchEvents();
      handleCloseDialog();
    } catch (error) {
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
        fetchEvents();
      } catch (error) {
        showAlert('שגיאה במחיקת האירוע', 'error');
      }
    }
  };

  const handleBulkImport = async () => {
    const events = [
      {
        title: 'כנס חשיפה שנות שירות ומכינות',
        type: 'אירוע מועצתי',
        start_date: '2024-09-11',
        description: null
      },
      {
        title: 'ערב פתיחת שנה',
        type: 'אירוע מועצתי',
        start_date: '2024-09-19',
        description: null
      },
      {
        title: 'כנס פתיחה לצוותי שנות התבגרות מועצתי',
        type: 'אירוע מועצתי',
        start_date: '2024-09-24',
        description: null
      },
      {
        title: 'סמינר פתיחת שנה (כחולים)',
        type: 'אירוע מועצתי',
        start_date: '2024-09-27',
        end_date: '2024-09-28',
        description: null
      },
      {
        title: 'הרמת כוסית חגי תשרי',
        type: 'אירוע',
        start_date: '2024-09-30',
        description: null
      },
      {
        title: 'הכנה לחג תנועות הנוער',
        type: 'אירוע',
        start_date: '2024-10-08',
        description: null
      },
      {
        title: 'חג תנועות הנוער',
        type: 'אירוע מועצתי',
        start_date: '2024-10-15',
        description: null
      },
      {
        title: 'טיול סתיו א-ג',
        type: 'טיול מועצתי',
        start_date: '2024-10-20',
        description: null
      },
      {
        title: 'סמינר פתיחת שנה - חינוך בעיתות מלחמה',
        type: 'אירוע מועצתי',
        start_date: '2024-10-29',
        description: null
      },
      {
        title: 'סמינר פתיחת שנה (קהילה)',
        type: 'אירוע מועצתי',
        start_date: '2024-11-01',
        end_date: '2024-11-02',
        description: null
      },
      {
        title: 'בונים תקווה - אירוע לזכר יצחק רבין',
        type: 'אירוע מועצתי',
        start_date: '2024-11-12',
        description: null
      },
      {
        title: 'תערוכה ליום הזיכרון הטרנסי',
        type: 'אירוע',
        start_date: '2024-11-17',
        end_date: '2024-11-23',
        description: null
      },
      {
        title: 'הכנת מדריכים - מסע יב',
        type: 'אירוע',
        start_date: '2024-11-25',
        end_date: '2024-11-26',
        description: null
      },
      {
        title: 'נשף חורף',
        type: 'אירוע מועצתי',
        start_date: '2024-12-25',
        description: null
      },
      {
        title: 'כנס מובילים שנת התבגרות',
        type: 'אירוע מועצתי',
        start_date: '2025-02-07',
        end_date: '2025-02-08',
        description: null
      },
      {
        title: 'טיול חורף א-ג',
        type: 'טיול מועצתי',
        start_date: '2025-02-21',
        description: null
      },
      {
        title: 'הכנת מדריכים לכנס יא',
        type: 'אירוע',
        start_date: '2025-02-26',
        description: null
      },
      {
        title: 'טיול נעורים חניתה נמרוד',
        type: 'טיול ישובי',
        start_date: '2025-03-06',
        end_date: '2025-03-07',
        description: null
      },
      {
        title: 'הכנת מדצים למחנה פסח',
        type: 'אירוע',
        start_date: '2025-03-07',
        end_date: '2025-03-08',
        description: null
      },
      {
        title: 'טיול נעורים רגבה נריה',
        type: 'טיול ישובי',
        start_date: '2025-03-07',
        end_date: '2025-03-08',
        description: null
      },
      {
        title: 'כנס יא',
        type: 'אירוע מועצתי',
        start_date: '2025-03-20',
        end_date: '2025-03-22',
        description: null
      },
      {
        title: 'מסע BIG',
        type: 'מפעל חיצוני',
        start_date: '2025-03-27',
        end_date: '2025-03-29',
        description: null
      },
      {
        title: 'טיול נעורים רגבה נריה',
        type: 'טיול ישובי',
        start_date: '2025-03-28',
        end_date: '2025-03-29',
        description: null
      },
      {
        title: 'חלוץ מחנה פסח',
        type: 'אירוע מועצתי',
        start_date: '2025-04-06',
        description: null
      },
      {
        title: 'מחנה פסח',
        type: 'אירוע מועצתי',
        start_date: '2025-04-07',
        end_date: '2025-04-08',
        description: null
      },
      {
        title: 'מסע נוער אדמית נמרוד',
        type: 'טיול ישובי',
        start_date: '2025-04-10',
        end_date: '2025-04-11',
        description: null
      },
      {
        title: 'טיול אביב א-ג',
        type: 'טיול מועצתי',
        start_date: '2025-04-15',
        description: null
      },
      {
        title: 'ימי הבנה',
        type: 'אירוע מועצתי',
        start_date: '2025-05-12',
        end_date: '2025-05-14',
        description: null
      },
      {
        title: 'מסע אתגר (כרמל)',
        type: 'מפעל חיצוני',
        start_date: '2025-05-15',
        end_date: '2025-05-17',
        description: null
      },
      {
        title: 'ערב הוקרה לצוותי חינוך בלתי פורמלי',
        type: 'אירוע מועצתי',
        start_date: '2025-05-29',
        description: null
      }
    ];

    try {
      const { error } = await supabase.from('events').insert(events);
      if (error) throw error;
      showAlert('כל האירועים נוספו בהצלחה!');
      fetchEvents();
    } catch (error) {
      showAlert('שגיאה בהוספת האירועים: ' + error.message, 'error');
    }
  };

  const handleImportEducationDates = async () => {
    const educationDates = [
      {
        title: 'חופשת ראש השנה',
        type: 'חופשה',
        start_date: '2024-10-02',
        end_date: '2024-10-04',
        notes: 'חזרה ללימודים: 6 באוקטובר 2024'
      },
      {
        title: 'חופשת יום הכיפורים',
        type: 'חופשה',
        start_date: '2024-10-11',
        end_date: '2024-10-12',
        notes: 'חזרה ללימודים: 13 באוקטובר 2024'
      },
      {
        title: 'חופשת סוכות',
        type: 'חופשה',
        start_date: '2024-10-13',
        end_date: '2024-10-24',
        notes: 'חזרה ללימודים: 25 באוקטובר 2024'
      },
      {
        title: 'חופשת חנוכה',
        type: 'חופשה',
        start_date: '2024-12-27',
        end_date: '2025-01-02',
        notes: 'חזרה ללימודים: 3 בינואר 2025'
      },
      {
        title: 'חופשת פורים',
        type: 'חופשה',
        start_date: '2025-03-14',
        end_date: '2025-03-16',
        notes: 'חזרה ללימודים: 17 במרץ 2025'
      },
      {
        title: 'חופשת פסח',
        type: 'חופשה',
        start_date: '2025-04-04',
        end_date: '2025-04-19',
        notes: 'חזרה ללימודים: 20 באפריל 2025'
      },
      {
        title: 'יום העצמאות',
        type: 'חופשה',
        start_date: '2025-05-01',
        end_date: '2025-05-01',
        notes: 'חזרה ללימודים: 2 במאי 2025'
      },
      {
        title: 'חופשת שבועות',
        type: 'חופשה',
        start_date: '2025-06-01',
        end_date: '2025-06-02',
        notes: 'חזרה ללימודים: 3 ביוני 2025'
      },
      {
        title: 'סיום שנת הלימודים - גני ילדים ובתי ספר יסודיים',
        type: 'סיום שנה',
        start_date: '2025-06-30',
        end_date: '2025-06-30',
        notes: null
      },
      {
        title: 'סיום שנת הלימודים - חטיבות ביניים ועל-יסודיים (6 ימים)',
        type: 'סיום שנה',
        start_date: '2025-06-20',
        end_date: '2025-06-20',
        notes: null
      },
      {
        title: 'סיום שנת הלימודים - חטיבות ביניים ועל-יסודיים (5 ימים)',
        type: 'סיום שנה',
        start_date: '2025-06-19',
        end_date: '2025-06-19',
        notes: null
      }
    ];

    try {
      const { error } = await supabase.from('education_dates').insert(educationDates);
      if (error) throw error;
      showAlert('חופשות משרד החינוך נוספו בהצלחה!');
      fetchEducationDates();
    } catch (error) {
      showAlert('שגיאה בהוספת חופשות משרד החינוך: ' + error.message, 'error');
    }
  };

  return (
    <Box sx={{ p: 2, height: '90vh' }}>
      <Paper elevation={3} sx={{ 
        p: 3, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">לוח אירועים</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              onClick={handleImportEducationDates}
              size="large"
            >
              ייבוא חופשות משרד החינוך
            </Button>
            <Button
              variant="outlined"
              onClick={handleBulkImport}
              size="large"
            >
              ייבוא אירועי המחלקה
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="large"
            >
              הוסף אירוע
            </Button>
          </Stack>
        </Box>

        <Box sx={{ flexGrow: 1, '& .fc': { height: '100%' } }}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={heLocale}
            direction="rtl"
            headerToolbar={{
              start: 'today prev,next',
              center: 'title',
              end: ''
            }}
            events={events.map(event => ({
              title: event.title,
              start: event.start_date,
              end: event.end_date,
              backgroundColor: event.type === 'חופשה' ? '#4caf50' : '#1976d2'
            }))}
            height="100%"
            dayMaxEvents={4}
            eventDisplay="block"
            displayEventTime={false}
            eventClick={(info) => {
              const event = events.find(e => 
                e.title === info.event.title && 
                e.start_date === info.event.startStr
              );
              if (event) handleOpenDialog(event);
            }}
          />
        </Box>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEvent ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="כותרת"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              select
              label="סוג אירוע"
              value={newEvent.type}
              onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
              fullWidth
              required
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
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="תאריך סיום"
              type="date"
              value={newEvent.end_date}
              onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
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
          <Button
            onClick={handleSaveEvent}
            variant="contained"
            disabled={!newEvent.title || !newEvent.start_date}
          >
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

export default Calendar;
