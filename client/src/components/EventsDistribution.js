import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { supabase } from '../supabaseClient';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { he } from 'date-fns/locale';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// רשימת סוגי האירועים
const eventTypes = [
  'טיול מועצתי',
  'טיול ישובי',
  'מפעל חיצוני',
  'פעילות מועצתית',
  'יום יער'
];

// רשימת הישובים
const settlements = [
  'אדמית', 'אילון', 'אפק', 'בית העמק', 'געתון', 'גשר הזיו', 'חניתה',
  'יחיעם', 'יסעור', 'כברי', 'כפר מסריק', 'לוחמי הגטאות', 'מצובה',
  'סער', 'עברון', 'עין המפרץ', 'ראש הנקרה', 'שמרת', 'אחיהוד',
  'בוסתן הגליל', 'בן עמי', 'בצת', 'לימן', 'נתיב השיירה', 'עמקה',
  'רגבה', 'שבי ציון', 'אשרת', 'כליל', 'ערב אל-עראמשה', 'שייח\' דנון',
  'נס עמים'
];

function EventsDistribution() {
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    type: '',
    date: null,
    supplier: '',
    participants: {}
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', '2024-09-01')
        .lte('event_date', '2025-09-01')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewEvent({
      name: '',
      type: '',
      date: null,
      supplier: '',
      participants: {}
    });
  };

  const handleEventChange = (field, value) => {
    setNewEvent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleParticipantsChange = (settlement, value) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0) {
      setNewEvent(prev => ({
        ...prev,
        participants: {
          ...prev.participants,
          [settlement]: numValue
        }
      }));
    }
  };

  const handleSaveEvent = async () => {
    try {
      if (!newEvent.name || !newEvent.type || !newEvent.date) {
        alert('נא למלא את כל השדות החובה');
        return;
      }

      const { error } = await supabase
        .from('events')
        .insert([{
          name: newEvent.name,
          type: newEvent.type,
          event_date: newEvent.date,
          supplier: newEvent.supplier,
          participants: newEvent.participants
        }]);

      if (error) throw error;
      
      fetchEvents();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('אירעה שגיאה בשמירת האירוע');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('האם למחוק את האירוע?')) {
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', eventId);

        if (error) throw error;
        fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('אירעה שגיאה במחיקת האירוע');
      }
    }
  };

  const calculateStats = () => {
    const eventsByType = {};
    const participantsBySettlement = {};
    let totalParticipants = 0;

    events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      Object.entries(event.participants || {}).forEach(([settlement, count]) => {
        participantsBySettlement[settlement] = (participantsBySettlement[settlement] || 0) + count;
        totalParticipants += count;
      });
    });

    return { eventsByType, participantsBySettlement, totalParticipants };
  };

  const stats = calculateStats();

  const pieChartData = {
    labels: eventTypes,
    datasets: [{
      data: eventTypes.map(type => stats.eventsByType[type] || 0),
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF'
      ]
    }]
  };

  const barChartData = {
    labels: settlements,
    datasets: [{
      label: 'מספר משתתפים',
      data: settlements.map(settlement => stats.participantsBySettlement[settlement] || 0),
      backgroundColor: '#36A2EB'
    }]
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          התפלגות אירועים - שנת תשפ"ה
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenDialog}
        >
          הוסף אירוע
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              התפלגות לפי סוג אירוע
            </Typography>
            <Box sx={{ height: 300 }}>
              <Pie data={pieChartData} options={{ maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              התפלגות משתתפים לפי ישוב
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar 
                data={barChartData} 
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              סיכום נתונים
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography>
                  סה"כ אירועים: {events.length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography>
                  סה"כ משתתפים: {stats.totalParticipants}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              רשימת אירועים
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>תאריך</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>שם האירוע</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>סוג</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>ספק</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>סה"כ משתתפים</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const totalParticipants = Object.values(event.participants || {}).reduce((sum, count) => sum + count, 0);
                    return (
                      <tr key={event.id}>
                        <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {new Date(event.event_date).toLocaleDateString('he-IL')}
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{event.name}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{event.type}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{event.supplier}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{totalParticipants}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            מחק
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>הוספת אירוע חדש</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="שם האירוע"
              value={newEvent.name}
              onChange={(e) => handleEventChange('name', e.target.value)}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>סוג האירוע</InputLabel>
              <Select
                value={newEvent.type}
                onChange={(e) => handleEventChange('type', e.target.value)}
                label="סוג האירוע"
              >
                {eventTypes.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={he}>
              <DatePicker
                label="תאריך"
                value={newEvent.date}
                onChange={(date) => handleEventChange('date', date)}
              />
            </LocalizationProvider>

            <TextField
              label="ספק"
              value={newEvent.supplier}
              onChange={(e) => handleEventChange('supplier', e.target.value)}
              fullWidth
            />

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              מספר משתתפים לפי ישוב:
            </Typography>
            
            <Grid container spacing={2}>
              {settlements.map((settlement) => (
                <Grid item xs={12} sm={6} md={4} key={settlement}>
                  <TextField
                    label={settlement}
                    type="number"
                    value={newEvent.participants[settlement] || ''}
                    onChange={(e) => handleParticipantsChange(settlement, e.target.value)}
                    fullWidth
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSaveEvent} variant="contained" color="primary">
            שמור
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EventsDistribution;
