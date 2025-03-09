import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Tooltip as MuiTooltip,
  Stack,
  InputAdornment
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { he } from 'date-fns/locale';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import TimelineIcon from '@mui/icons-material/Timeline';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import GridOnIcon from '@mui/icons-material/GridOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DateRangeIcon from '@mui/icons-material/DateRange';
import PieChartIcon from '@mui/icons-material/PieChart';
import { supabase } from '../supabaseClient';

// פונקציה להמרת תאריך לפורמט עברי
const formatDateToHebrew = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('he-IL', { 
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

// רשימת סוגי האירועים המותרים
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
  // ערכי ברירת מחדל
  const defaultEvent = {
    name: '',
    type: eventTypes[0],
    date: null,
    description: '',
    participants: settlements.reduce((acc, settlement) => ({
      ...acc,
      [settlement]: 0
    }), {}),
    budget: 0
  };

  const defaultStats = {
    totalEvents: 0,
    totalParticipants: 0,
    averageParticipantsPerEvent: 0,
    eventsByType: {},
    participantsByType: {}
  };

  const defaultChartData = {
    eventTypeChartData: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderWidth: 1
      }]
    },
    avgParticipantsChartData: {
      labels: [],
      datasets: [{
        label: 'ממוצע משתתפים',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 0.8)',
        borderWidth: 1
      }]
    }
  };

  // מצב התחלתי
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [newEvent, setNewEvent] = useState(defaultEvent);
  const [monthlyStats, setMonthlyStats] = useState(defaultStats);
  const [chartData, setChartData] = useState(defaultChartData);
  const [filters, setFilters] = useState({ searchText: '', eventType: '' });
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
    action: null
  });
  // הוספת state לניהול הדיאלוג של הגרפים
  const [chartDialog, setChartDialog] = useState({
    open: false,
    chartType: null
  });

  useEffect(() => {
    fetchEvents();
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const filteredEvents = events
      .filter(event => {
        const matchesSearch = !filters.searchText || 
          event.title.toLowerCase().includes(filters.searchText.toLowerCase()) ||
          event.type.toLowerCase().includes(filters.searchText.toLowerCase()) ||
          (event.description || '').toLowerCase().includes(filters.searchText.toLowerCase());
        
        const matchesType = !filters.eventType || event.type === filters.eventType;
        
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const dateA = new Date(a.start_date);
        const dateB = new Date(b.start_date);
        return dateB - dateA;
      });

    const stats = calculateMonthlyStats(filteredEvents);
    setMonthlyStats(stats);

    const chartData = prepareChartData(stats);
    setChartData(chartData);
  }, [events, filters]);

  const parseEventDescription = (description) => {
    if (!description) {
      return { text: '', participants: {} };
    }

    try {
      // בדיקה אם התיאור הוא כבר אובייקט
      if (typeof description === 'object') {
        return {
          text: description.text || '',
          participants: description.participants || {}
        };
      }

      // ניסיון לפרק כ-JSON
      const parsed = JSON.parse(description);
      return {
        text: parsed.text || '',
        participants: parsed.participants || {}
      };
    } catch (error) {
      // אם לא הצליח לפרק כ-JSON, נניח שזה טקסט רגיל
      return {
        text: description,
        participants: {}
      };
    }
  };

  const calculateMonthlyStats = (eventsData) => {
    const stats = {
      totalEvents: eventsData.length,
      totalParticipants: 0,
      averageParticipantsPerEvent: 0,
      eventsByType: {},
      participantsByType: {}
    };

    // אתחול מונים לפי סוג אירוע
    eventTypes.forEach(type => {
      stats.eventsByType[type] = 0;
      stats.participantsByType[type] = 0;
    });

    // חישוב סטטיסטיקות
    eventsData.forEach(event => {
      const { participants } = parseEventDescription(event.description);
      const totalParticipants = Object.values(participants).reduce((sum, count) => sum + count, 0);
      
      stats.totalParticipants += totalParticipants;
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      stats.participantsByType[event.type] = (stats.participantsByType[event.type] || 0) + totalParticipants;
    });

    // חישוב ממוצע משתתפים לאירוע
    stats.averageParticipantsPerEvent = stats.totalEvents > 0 
      ? Math.round(stats.totalParticipants / stats.totalEvents)
      : 0;

    return stats;
  };

  const prepareChartData = (stats) => {
    const colors = [
      'rgba(54, 162, 235, 0.8)',   // כחול
      'rgba(75, 192, 192, 0.8)',   // טורקיז
      'rgba(153, 102, 255, 0.8)',  // סגול
      'rgba(255, 159, 64, 0.8)',   // כתום
      'rgba(255, 99, 132, 0.8)'    // ורוד
    ];

    // נתונים לגרף עוגה של סוגי אירועים
    const eventTypeLabels = [];
    const eventTypeData = [];
    const eventTypeColors = [];

    Object.entries(stats.eventsByType)
      .filter(([_, count]) => count > 0)
      .forEach(([type, count], index) => {
        eventTypeLabels.push(type);
        eventTypeData.push(count);
        eventTypeColors.push(colors[index % colors.length]);
      });

    // נתונים לגרף עמודות של ממוצע משתתפים
    const avgParticipantsLabels = [];
    const avgParticipantsData = [];

    Object.entries(stats.participantsByType)
      .filter(([type, _]) => stats.eventsByType[type] > 0)
      .forEach(([type, totalParticipants]) => {
        avgParticipantsLabels.push(type);
        avgParticipantsData.push(Math.round(totalParticipants / stats.eventsByType[type]));
      });

    return {
      eventTypeChartData: {
        labels: eventTypeLabels,
        datasets: [{
          data: eventTypeData,
          backgroundColor: eventTypeColors,
          borderWidth: 1
        }]
      },
      avgParticipantsChartData: {
        labels: avgParticipantsLabels,
        datasets: [{
          label: 'ממוצע משתתפים',
          data: avgParticipantsData,
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 0.8)',
          borderWidth: 1
        }]
      }
    };
  };

  const eventTypeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: 'Rubik, sans-serif'
          }
        }
      }
    }
  };

  const avgParticipantsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: 'Rubik, sans-serif'
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: 'Rubik, sans-serif'
          }
        }
      },
      x: {
        ticks: {
          font: {
            family: 'Rubik, sans-serif'
          }
        }
      }
    }
  };

  const fetchEvents = async () => {
    try {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_date', { ascending: false });

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setAlert({
        open: true,
        message: 'שגיאה בטעינת האירועים',
        severity: 'error',
        action: null
      });
    }
  };

  const handleOpenDialog = (event = null) => {
    if (event) {
      setEditMode(true);
      setSelectedEventId(event.id);
      setNewEvent({
        name: event.title,
        type: event.type,
        date: new Date(event.start_date),
        description: event.description,
        participants: event.participants || {},
        budget: event.budget || 0
      });
    } else {
      setEditMode(false);
      setSelectedEventId(null);
      setNewEvent(defaultEvent);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setSelectedEventId(null);
    setNewEvent(defaultEvent);
  };

  const handleEventChange = (field, value) => {
    setNewEvent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleParticipantChange = (settlement, value) => {
    const numValue = Number(value) || 0;
    setNewEvent(prev => ({
      ...prev,
      participants: {
        ...prev.participants,
        [settlement]: numValue
      }
    }));
  };

  const handleSaveEvent = async () => {
    try {
      if (!newEvent.name || !newEvent.type || !newEvent.date) {
        setAlert({
          open: true,
          message: 'אנא מלא את כל שדות החובה',
          severity: 'error',
          action: null
        });
        return;
      }

      // וידוא שהתאריך בטווח החודש הנבחר
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      const eventDate = new Date(newEvent.date);

      if (eventDate < startDate || eventDate > endDate) {
        setAlert({
          open: true,
          message: `התאריך חייב להיות בין ${formatDateToHebrew(startDate)} ל-${formatDateToHebrew(endDate)}`,
          severity: 'error',
          action: null
        });
        return;
      }

      // סינון משתתפים עם כמות 0
      const filteredParticipants = Object.entries(newEvent.participants)
        .filter(([_, count]) => count > 0)
        .reduce((acc, [settlement, count]) => ({
          ...acc,
          [settlement]: count
        }), {});

      const eventDescription = JSON.stringify({
        text: newEvent.description || '',
        participants: filteredParticipants
      });

      if (editMode) {
        const { error } = await supabase
          .from('events')
          .update({
            title: newEvent.name,
            type: newEvent.type,
            start_date: newEvent.date.toISOString().split('T')[0],
            description: eventDescription,
            budget: newEvent.budget || 0
          })
          .eq('id', selectedEventId);

        if (error) throw error;

        setAlert({
          open: true,
          message: 'האירוע עודכן בהצלחה',
          severity: 'success',
          action: null
        });
      } else {
        const { error } = await supabase
          .from('events')
          .insert({
            title: newEvent.name,
            type: newEvent.type,
            start_date: newEvent.date.toISOString().split('T')[0],
            description: eventDescription,
            budget: newEvent.budget || 0
          });

        if (error) throw error;

        setAlert({
          open: true,
          message: 'האירוע נוסף בהצלחה',
          severity: 'success',
          action: null
        });
      }

      setOpenDialog(false);
      setEditMode(false);
      setSelectedEventId(null);
      setNewEvent(defaultEvent);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      setAlert({
        open: true,
        message: 'שגיאה בשמירת האירוע',
        severity: 'error',
        action: null
      });
    }
  };

  const handleDeleteClick = (eventId) => {
    setAlert({
      open: true,
      message: 'האם למחוק את האירוע?',
      severity: 'warning',
      action: (
        <Stack direction="row" spacing={1}>
          <Button 
            size="small"
            onClick={() => {
              handleDeleteEvent(eventId);
              setAlert({ open: false, message: '', severity: 'success', action: null });
            }}
            sx={{ 
              fontFamily: 'Rubik, sans-serif',
              minWidth: 60,
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'error.dark'
              }
            }}
          >
            כן
          </Button>
          <Button 
            size="small"
            onClick={() => setAlert({ open: false, message: '', severity: 'success', action: null })}
            sx={{ 
              fontFamily: 'Rubik, sans-serif',
              minWidth: 60,
              bgcolor: 'grey.100',
              '&:hover': {
                bgcolor: 'grey.200'
              }
            }}
          >
            לא
          </Button>
        </Stack>
      )
    });
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setAlert({
        open: true,
        message: 'האירוע נמחק בהצלחה',
        severity: 'success',
        action: null
      });

      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setAlert({
        open: true,
        message: 'שגיאה במחיקת האירוע',
        severity: 'error',
        action: null
      });
    }
  };

  const handleEditClick = (event) => {
    const { text, participants } = parseEventDescription(event.description);

    // וידוא שיש ערך התחלתי לכל הישובים
    const initialParticipants = settlements.reduce((acc, settlement) => ({
      ...acc,
      [settlement]: participants[settlement] || 0
    }), {});

    setSelectedEventId(event.id);
    setNewEvent({
      name: event.title,
      type: event.type,
      date: new Date(event.start_date),
      description: text,
      participants: initialParticipants,
      budget: event.budget
    });
    setEditMode(true);
    setOpenDialog(true);
  };

  // הגדרת עמודות הטבלה
  const columns = [
    {
      field: 'name',
      headerName: 'שם האירוע',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <div style={{ fontFamily: 'Rubik, sans-serif', width: '100%' }}>
          {params.value}
        </div>
      )
    },
    {
      field: 'type',
      headerName: 'סוג',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <div style={{ fontFamily: 'Rubik, sans-serif', width: '100%' }}>
          {params.value}
        </div>
      )
    },
    {
      field: 'date',
      headerName: 'תאריך',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <div style={{ fontFamily: 'Rubik, sans-serif', width: '100%' }}>
          {params.value}
        </div>
      )
    },
    {
      field: 'totalParticipants',
      headerName: 'משתתפים',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <MuiTooltip 
          title={
            <div style={{ fontFamily: 'Rubik, sans-serif' }}>
              {Object.entries(params.row.participants)
                .filter(([_, count]) => count > 0)
                .map(([settlement, count]) => (
                  `${settlement}: ${count}`
                ))
                .join('\n')
              }
            </div>
          }
        >
          <div style={{ fontFamily: 'Rubik, sans-serif', width: '100%' }}>
            {params.value.toLocaleString()}
          </div>
        </MuiTooltip>
      )
    },
    {
      field: 'budget',
      headerName: 'תקציב',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <div style={{ fontFamily: 'Rubik, sans-serif', width: '100%', direction: 'ltr' }}>
          ₪{params.value.toLocaleString()}
        </div>
      )
    },
    {
      field: 'description',
      headerName: 'תיאור',
      flex: 1.5,
      minWidth: 250,
      renderCell: (params) => (
        <div style={{ 
          fontFamily: 'Rubik, sans-serif',
          width: '100%',
          whiteSpace: 'normal',
          lineHeight: '1.2'
        }}>
          {params.value}
        </div>
      )
    },
    {
      field: 'actions',
      headerName: 'פעולות',
      flex: 0.5,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => handleEditClick(params.row)}
            sx={{ 
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteClick(params.row.id)}
            sx={{ 
              color: 'error.main',
              '&:hover': {
                backgroundColor: 'rgba(211, 47, 47, 0.04)'
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ];

  // פונקציה לפתיחת דיאלוג של גרף
  const handleOpenChart = (chartType) => {
    setChartDialog({
      open: true,
      chartType
    });
  };

  // פונקציה לסגירת דיאלוג של גרף
  const handleCloseChart = () => {
    setChartDialog({
      open: false,
      chartType: null
    });
  };

  // פונקציה להכנת נתונים לגרף מגמת אירועים
  const prepareEventsTrendData = () => {
    // מיון האירועים לפי תאריך
    const sortedEvents = [...events].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    
    // יצירת מפה של אירועים לפי חודש
    const eventsByMonth = {};
    const eventsByMonthAndType = {};
    
    sortedEvents.forEach(event => {
      const date = new Date(event.start_date);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      // ספירת אירועים לפי חודש
      eventsByMonth[monthYear] = (eventsByMonth[monthYear] || 0) + 1;
      
      // ספירת אירועים לפי חודש וסוג
      if (!eventsByMonthAndType[event.type]) {
        eventsByMonthAndType[event.type] = {};
      }
      eventsByMonthAndType[event.type][monthYear] = (eventsByMonthAndType[event.type][monthYear] || 0) + 1;
    });
    
    // יצירת נתונים לגרף
    const labels = Object.keys(eventsByMonth).sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      return yearA !== yearB ? yearA - yearB : monthA - monthB;
    });
    
    const datasets = [
      {
        label: 'כל האירועים',
        data: labels.map(month => eventsByMonth[month]),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderWidth: 2,
        fill: true
      }
    ];
    
    // הוספת קווים נפרדים לסוגי אירועים
    Object.keys(eventsByMonthAndType).forEach((type, index) => {
      const colors = [
        'rgba(255, 99, 132, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(255, 205, 86, 1)'
      ];
      
      datasets.push({
        label: type,
        data: labels.map(month => eventsByMonthAndType[type][month] || 0),
        borderColor: colors[index % colors.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        fill: false
      });
    });
    
    return {
      labels,
      datasets
    };
  };

  // פונקציה להכנת נתונים לגרף השוואת אירועים בין שנים
  const prepareYearlyComparisonData = () => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    // יצירת מפה של אירועים לפי חודש ושנה
    const eventsByYearAndMonth = {};
    
    events.forEach(event => {
      const date = new Date(event.start_date);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      if (year === currentYear || year === previousYear) {
        const key = `${year}-${month}`;
        eventsByYearAndMonth[key] = (eventsByYearAndMonth[key] || 0) + 1;
      }
    });
    
    // יצירת נתונים לגרף
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    
    const currentYearData = months.map((_, index) => eventsByYearAndMonth[`${currentYear}-${index}`] || 0);
    const previousYearData = months.map((_, index) => eventsByYearAndMonth[`${previousYear}-${index}`] || 0);
    
    return {
      labels: months,
      datasets: [
        {
          label: `שנה נוכחית (${currentYear})`,
          data: currentYearData,
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: `שנה קודמת (${previousYear})`,
          data: previousYearData,
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  // פונקציה להכנת נתונים לגרף משתתפים לפי ישובים
  const prepareParticipantsBySettlementData = () => {
    // יצירת מפה של משתתפים לפי ישוב
    const participantsBySettlement = {};
    
    events.forEach(event => {
      const { participants } = parseEventDescription(event.description);
      
      Object.entries(participants).forEach(([settlement, count]) => {
        if (count > 0) {
          participantsBySettlement[settlement] = (participantsBySettlement[settlement] || 0) + count;
        }
      });
    });
    
    // מיון הישובים לפי מספר המשתתפים (בסדר יורד)
    const sortedSettlements = Object.entries(participantsBySettlement)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15); // הצגת 15 הישובים המובילים
    
    return {
      labels: sortedSettlements.map(([settlement]) => settlement),
      datasets: [
        {
          label: 'מספר משתתפים',
          data: sortedSettlements.map(([, count]) => count),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  // פונקציה להכנת נתונים למפת חום
  const prepareHeatmapData = () => {
    // יצירת מפה של משתתפים לפי ישוב וסוג אירוע
    const participantsBySettlementAndType = {};
    
    // אתחול המפה
    settlements.forEach(settlement => {
      participantsBySettlementAndType[settlement] = {};
      
      eventTypes.forEach(type => {
        participantsBySettlementAndType[settlement][type] = 0;
      });
    });
    
    // מילוי הנתונים
    events.forEach(event => {
      const { participants } = parseEventDescription(event.description);
      const eventType = event.type;
      
      Object.entries(participants).forEach(([settlement, count]) => {
        if (count > 0 && participantsBySettlementAndType[settlement]) {
          participantsBySettlementAndType[settlement][eventType] = 
            (participantsBySettlementAndType[settlement][eventType] || 0) + count;
        }
      });
    });
    
    // מיון הישובים לפי סך כל המשתתפים
    const totalParticipantsBySettlement = {};
    
    Object.entries(participantsBySettlementAndType).forEach(([settlement, typeData]) => {
      totalParticipantsBySettlement[settlement] = Object.values(typeData).reduce((sum, count) => sum + count, 0);
    });
    
    const sortedSettlements = Object.entries(totalParticipantsBySettlement)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // הצגת 10 הישובים המובילים
      .map(([settlement]) => settlement);
    
    // יצירת נתונים למפת חום
    const datasets = eventTypes.map((type, index) => ({
      label: type,
      data: sortedSettlements.map(settlement => participantsBySettlementAndType[settlement][type] || 0),
      backgroundColor: `rgba(${index * 50}, ${255 - index * 30}, ${150}, 0.8)`
    }));
    
    return {
      labels: sortedSettlements,
      datasets
    };
  };

  // פונקציה להכנת נתונים לגרף משך אירועים לפי סוג
  const prepareEventDurationData = () => {
    // חישוב משך האירועים לפי סוג
    const durationByType = {};
    const countByType = {};
    
    events.forEach(event => {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      
      // חישוב משך האירוע בשעות
      const durationHours = (endDate - startDate) / (1000 * 60 * 60);
      
      if (!durationByType[event.type]) {
        durationByType[event.type] = 0;
        countByType[event.type] = 0;
      }
      
      durationByType[event.type] += durationHours;
      countByType[event.type]++;
    });
    
    // חישוב ממוצע משך אירוע לפי סוג
    const avgDurationByType = {};
    Object.keys(durationByType).forEach(type => {
      avgDurationByType[type] = durationByType[type] / countByType[type];
    });
    
    // מיון הסוגים לפי ממוצע משך האירוע (בסדר יורד)
    const sortedTypes = Object.entries(avgDurationByType)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);
    
    return {
      labels: sortedTypes,
      datasets: [
        {
          label: 'משך ממוצע (שעות)',
          data: sortedTypes.map(type => avgDurationByType[type]),
          backgroundColor: 'rgba(153, 102, 255, 0.8)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  // פונקציה להכנת נתונים לגרף התפלגות אירועים לפי סוג
  const prepareEventTypeDistributionData = () => {
    // יצירת מפה של ספירת אירועים לפי סוג
    const eventCountByType = {};
    
    // אתחול המפה עם כל סוגי האירועים האפשריים
    eventTypes.forEach(type => {
      eventCountByType[type] = 0;
    });
    
    // ספירת האירועים לפי סוג
    events.forEach(event => {
      if (eventCountByType.hasOwnProperty(event.type)) {
        eventCountByType[event.type]++;
      }
    });
    
    // הכנת צבעים לגרף
    const colors = [
      'rgba(255, 99, 132, 0.8)',    // ורוד
      'rgba(54, 162, 235, 0.8)',    // כחול
      'rgba(255, 206, 86, 0.8)',    // צהוב
      'rgba(75, 192, 192, 0.8)',    // טורקיז
      'rgba(153, 102, 255, 0.8)',   // סגול
      'rgba(255, 159, 64, 0.8)',    // כתום
      'rgba(199, 199, 199, 0.8)',   // אפור
    ];
    
    // סינון סוגי אירועים ללא אירועים
    const filteredTypes = Object.entries(eventCountByType)
      .filter(([_, count]) => count > 0)
      .map(([type, _]) => type);
    
    const filteredCounts = Object.entries(eventCountByType)
      .filter(([_, count]) => count > 0)
      .map(([_, count]) => count);
    
    // יצירת נתונים לגרף
    return {
      labels: filteredTypes,
      datasets: [
        {
          data: filteredCounts,
          backgroundColor: colors.slice(0, filteredTypes.length),
          borderColor: colors.slice(0, filteredTypes.length).map(color => color.replace('0.8', '1')),
          borderWidth: 1
        }
      ]
    };
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* כפתורי פעולות */}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontFamily: 'Rubik, sans-serif' }}>שנה</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                label="שנה"
                sx={{ 
                  fontFamily: 'Rubik, sans-serif',
                  '& .MuiMenuItem-root': {
                    fontFamily: 'Rubik, sans-serif'
                  }
                }}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontFamily: 'Rubik, sans-serif' }}>חודש</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="חודש"
                sx={{ 
                  fontFamily: 'Rubik, sans-serif',
                  '& .MuiMenuItem-root': {
                    fontFamily: 'Rubik, sans-serif'
                  }
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <MenuItem key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('he-IL', { month: 'long' })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={4}>
            <Button
              variant="contained"
              onClick={() => {
                setNewEvent(defaultEvent);
                setEditMode(false);
                setOpenDialog(true);
              }}
              sx={{ 
                fontFamily: 'Rubik, sans-serif',
                width: { xs: '100%', md: 'auto' },
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
              startIcon={<AddIcon />}
            >
              הוסף אירוע חדש
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* סטטיסטיקות */}
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Rubik, sans-serif', mb: 1 }}>
          סטטיסטיקות
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 1.5,
                textAlign: 'center',
                height: '100%',
                maxHeight: 100,
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5
              }}
            >
              <Typography variant="body1" color="primary" sx={{ fontFamily: 'Rubik, sans-serif' }}>
                סה"כ אירועים
              </Typography>
              <Typography variant="h4" component="div" color="primary" sx={{ fontFamily: 'Rubik, sans-serif', fontWeight: 'medium' }}>
                {monthlyStats.totalEvents.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 1.5,
                textAlign: 'center',
                height: '100%',
                maxHeight: 100,
                backgroundColor: 'rgba(76, 175, 80, 0.08)',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5
              }}
            >
              <Typography variant="body1" color="success.main" sx={{ fontFamily: 'Rubik, sans-serif' }}>
                סה"כ משתתפים
              </Typography>
              <Typography variant="h4" component="div" color="success.main" sx={{ fontFamily: 'Rubik, sans-serif', fontWeight: 'medium' }}>
                {monthlyStats.totalParticipants.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 1.5,
                textAlign: 'center',
                height: '100%',
                maxHeight: 100,
                backgroundColor: 'rgba(156, 39, 176, 0.08)',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5
              }}
            >
              <Typography variant="body1" color="secondary" sx={{ fontFamily: 'Rubik, sans-serif' }}>
                ממוצע משתתפים לאירוע
              </Typography>
              <Typography variant="h4" component="div" color="secondary" sx={{ fontFamily: 'Rubik, sans-serif', fontWeight: 'medium' }}>
                {monthlyStats.averageParticipantsPerEvent.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* גרפים */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              onClick={() => handleOpenChart('eventsTrend')}
              sx={{ 
                fontFamily: 'Rubik, sans-serif',
                width: { xs: '100%', md: 'auto' },
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
              startIcon={<TimelineIcon />}
            >
              מגמת אירועים
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              onClick={() => handleOpenChart('yearlyComparison')}
              sx={{ 
                fontFamily: 'Rubik, sans-serif',
                width: { xs: '100%', md: 'auto' },
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
              startIcon={<BarChartIcon />}
            >
              השוואת אירועים בין שנים
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              onClick={() => handleOpenChart('participantsBySettlement')}
              sx={{ 
                fontFamily: 'Rubik, sans-serif',
                width: { xs: '100%', md: 'auto' },
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
              startIcon={<PeopleIcon />}
            >
              משתתפים לפי ישובים
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              onClick={() => handleOpenChart('eventTypeDistribution')}
              sx={{ 
                fontFamily: 'Rubik, sans-serif',
                width: { xs: '100%', md: 'auto' },
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
              startIcon={<PieChartIcon />}
            >
              התפלגות אירועים לפי סוג
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              onClick={() => handleOpenChart('eventDuration')}
              sx={{ 
                fontFamily: 'Rubik, sans-serif',
                width: { xs: '100%', md: 'auto' },
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
              startIcon={<AccessTimeIcon />}
            >
              משך אירועים לפי סוג
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* דיאלוג גרפים */}
      <Dialog 
        open={chartDialog.open} 
        onClose={handleCloseChart}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Rubik, sans-serif', pb: 1 }}>
          {chartDialog.chartType === 'eventsTrend' && 'מגמת אירועים'}
          {chartDialog.chartType === 'yearlyComparison' && 'השוואת אירועים בין שנים'}
          {chartDialog.chartType === 'participantsBySettlement' && 'משתתפים לפי ישובים'}
          {chartDialog.chartType === 'eventTypeDistribution' && 'התפלגות אירועים לפי סוג'}
          {chartDialog.chartType === 'eventDuration' && 'משך אירועים לפי סוג'}
        </DialogTitle>
        <DialogContent>
          {chartDialog.chartType === 'eventsTrend' && (
            <Line 
              data={prepareEventsTrendData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      font: {
                        family: 'Rubik, sans-serif'
                      }
                    }
                  }
                }
              }}
            />
          )}
          {chartDialog.chartType === 'yearlyComparison' && (
            <Bar 
              data={prepareYearlyComparisonData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      font: {
                        family: 'Rubik, sans-serif'
                      }
                    }
                  }
                }
              }}
            />
          )}
          {chartDialog.chartType === 'participantsBySettlement' && (
            <Bar 
              data={prepareParticipantsBySettlementData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      font: {
                        family: 'Rubik, sans-serif'
                      }
                    }
                  }
                }
              }}
            />
          )}
          {chartDialog.chartType === 'eventTypeDistribution' && (
            <Pie 
              data={prepareEventTypeDistributionData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      font: {
                        family: 'Rubik, sans-serif'
                      }
                    }
                  }
                }
              }}
            />
          )}
          {chartDialog.chartType === 'eventDuration' && (
            <Bar 
              data={prepareEventDurationData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      font: {
                        family: 'Rubik, sans-serif'
                      }
                    }
                  }
                }
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={handleCloseChart}
            sx={{ 
              fontFamily: 'Rubik, sans-serif',
              minWidth: 100
            }}
          >
            סגור
          </Button>
        </DialogActions>
      </Dialog>

      {/* רשימת האירועים */}
      <Paper sx={{ width: '100%', overflow: 'hidden', mt: 3 }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="חיפוש..."
            value={filters.searchText}
            onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
            sx={{ 
              minWidth: 200,
              flex: { xs: '1 1 100%', sm: '0 1 auto' },
              '& .MuiInputBase-root': {
                fontFamily: 'Rubik, sans-serif'
              }
            }}
          />
          <FormControl 
            size="small" 
            sx={{ 
              minWidth: 200,
              flex: { xs: '1 1 100%', sm: '0 1 auto' }
            }}
          >
            <InputLabel sx={{ fontFamily: 'Rubik, sans-serif' }}>סוג אירוע</InputLabel>
            <Select
              value={filters.eventType}
              onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
              label="סוג אירוע"
              sx={{ 
                fontFamily: 'Rubik, sans-serif',
                '& .MuiMenuItem-root': {
                  fontFamily: 'Rubik, sans-serif'
                }
              }}
            >
              <MenuItem value="">הכל</MenuItem>
              {eventTypes.map(type => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <DataGrid
          rows={events.map(event => {
            const { text, participants } = parseEventDescription(event.description);
            return {
              id: event.id,
              name: event.title,
              type: event.type,
              date: formatDateToHebrew(event.start_date),
              totalParticipants: Object.values(participants).reduce((sum, count) => sum + count, 0),
              participants: participants,
              budget: event.budget || 0,
              description: text
            };
          })}
          columns={columns}
          autoHeight
          disableSelectionOnClick
          pageSize={10}
          rowsPerPageOptions={[10]}
          localeText={{
            noRowsLabel: 'אין נתונים להצגה',
            footerRowSelected: (count) => `${count.toLocaleString()} שורות נבחרו`,
            footerTotalRows: 'סך הכל:',
            footerTotalVisibleRows: (visibleCount, totalCount) =>
              `${visibleCount.toLocaleString()} מתוך ${totalCount.toLocaleString()}`,
            columnMenuLabel: 'תפריט',
            columnMenuShowColumns: 'הצג עמודות',
            columnMenuFilter: 'סנן',
            columnMenuHideColumn: 'הסתר',
            columnMenuUnsort: 'בטל מיון',
            columnMenuSortAsc: 'מיין בסדר עולה',
            columnMenuSortDesc: 'מיין בסדר יורד'
          }}
          sx={{
            '& .MuiDataGrid-root': {
              border: 'none'
            },
            '& .MuiDataGrid-cell': {
              fontFamily: 'Rubik, sans-serif',
              fontSize: '0.875rem'
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              fontFamily: 'Rubik, sans-serif'
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid rgba(224, 224, 224, 1)',
              fontFamily: 'Rubik, sans-serif'
            },
            '& .MuiDataGrid-virtualScroller': {
              minHeight: '200px'
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        />
      </Paper>

      {/* הודעות מערכת */}
      <Snackbar
        open={alert.open}
        autoHideDuration={alert.action ? null : 6000}
        onClose={() => setAlert({ open: false, message: '', severity: 'success', action: null })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity={alert.severity}
          action={alert.action}
          onClose={() => setAlert({ open: false, message: '', severity: 'success', action: null })}
          sx={{ 
            fontFamily: 'Rubik, sans-serif',
            '& .MuiAlert-message': {
              fontFamily: 'Rubik, sans-serif',
              fontSize: '1rem'
            },
            '& .MuiButton-root': {
              fontFamily: 'Rubik, sans-serif'
            }
          }}
        >
          {alert.message}
        </Alert>
      </Snackbar>

      {/* דיאלוג הוספה/עריכת אירוע */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Rubik, sans-serif', pb: 1 }}>
          {editMode ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="שם האירוע"
                value={newEvent.name}
                onChange={(e) => handleEventChange('name', e.target.value)}
                required
                sx={{ 
                  '& .MuiInputLabel-root': {
                    fontFamily: 'Rubik, sans-serif'
                  },
                  '& .MuiInputBase-root': {
                    fontFamily: 'Rubik, sans-serif'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel sx={{ fontFamily: 'Rubik, sans-serif' }}>סוג אירוע</InputLabel>
                <Select
                  value={newEvent.type}
                  onChange={(e) => handleEventChange('type', e.target.value)}
                  label="סוג אירוע"
                  sx={{ 
                    fontFamily: 'Rubik, sans-serif',
                    '& .MuiMenuItem-root': {
                      fontFamily: 'Rubik, sans-serif'
                    }
                  }}
                >
                  {eventTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={he}>
                <DatePicker
                  label="תאריך"
                  value={newEvent.date}
                  onChange={(newValue) => handleEventChange('date', newValue)}
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                      sx: {
                        '& .MuiInputLabel-root': {
                          fontFamily: 'Rubik, sans-serif'
                        },
                        '& .MuiInputBase-root': {
                          fontFamily: 'Rubik, sans-serif'
                        }
                      }
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="תקציב"
                type="number"
                value={newEvent.budget}
                onChange={(e) => handleEventChange('budget', Number(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">₪</InputAdornment>,
                }}
                sx={{ 
                  '& .MuiInputLabel-root': {
                    fontFamily: 'Rubik, sans-serif'
                  },
                  '& .MuiInputBase-root': {
                    fontFamily: 'Rubik, sans-serif'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="תיאור"
                multiline
                rows={4}
                value={newEvent.description}
                onChange={(e) => handleEventChange('description', e.target.value)}
                sx={{ 
                  '& .MuiInputLabel-root': {
                    fontFamily: 'Rubik, sans-serif'
                  },
                  '& .MuiInputBase-root': {
                    fontFamily: 'Rubik, sans-serif'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontFamily: 'Rubik, sans-serif' }}>
                משתתפים לפי יישוב
              </Typography>
              <Grid container spacing={2}>
                {settlements.map(settlement => (
                  <Grid item xs={12} sm={6} md={4} key={settlement}>
                    <TextField
                      fullWidth
                      label={settlement}
                      type="number"
                      value={newEvent.participants[settlement] || 0}
                      onChange={(e) => handleParticipantChange(settlement, Number(e.target.value))}
                      InputProps={{
                        inputProps: { min: 0 }
                      }}
                      sx={{ 
                        '& .MuiInputLabel-root': {
                          fontFamily: 'Rubik, sans-serif'
                        },
                        '& .MuiInputBase-root': {
                          fontFamily: 'Rubik, sans-serif'
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={handleCloseDialog}
            sx={{ 
              fontFamily: 'Rubik, sans-serif',
              minWidth: 100
            }}
          >
            ביטול
          </Button>
          <Button 
            onClick={handleSaveEvent}
            variant="contained"
            sx={{ 
              fontFamily: 'Rubik, sans-serif',
              minWidth: 100,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }}
          >
            {editMode ? 'שמור' : 'הוסף'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EventsDistribution;
