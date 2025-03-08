import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  MenuItem,
  Stack,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  ButtonGroup,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Menu,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  GetApp as GetAppIcon
} from '@mui/icons-material';

const eventTypes = [
  'אירוע',
  'אירוע מועצתי',
  'טיול מועצתי',
  'טיול ישובי',
  'מפעל חיצוני'
];

const initialEventState = {
  title: '',
  type: 'אירוע',
  start_date: '',
  description: ''
};

function DepartmentEvents() {
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [newEvent, setNewEvent] = useState(initialEventState);
  const [editingEvent, setEditingEvent] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', today)
        .order('start_date', { ascending: true });

      if (error) {
        throw error;
      }

      setEvents(data || []);
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

  const handleAddEvent = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .insert([{
          title: newEvent.title,
          type: newEvent.type,
          start_date: newEvent.start_date,
          description: newEvent.description
        }]);

      if (error) throw error;
      
      showAlert('האירוע נוסף בהצלחה');
      setNewEvent(initialEventState);
      setOpenDialog(false);
      await fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      showAlert('שגיאה בהוספת האירוע', 'error');
    }
  };

  const handleEditEvent = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: editingEvent.title,
          type: editingEvent.type,
          start_date: editingEvent.start_date,
          description: editingEvent.description
        })
        .eq('id', editingEvent.id);

      if (error) throw error;
      
      showAlert('האירוע עודכן בהצלחה');
      setEditingEvent(null);
      setOpenDialog(false);
      await fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      showAlert('שגיאה בעדכון האירוע', 'error');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm('האם למחוק את האירוע?')) {
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
    if (!endDate || endDate === startDate) return start;
    const end = new Date(endDate).toLocaleDateString('he-IL');
    return `${start} - ${end}`;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("אירועי המחלקה", 14, 20);

    const tableData = events.map(event => [
      event.title,
      event.type,
      new Date(event.start_date).toLocaleDateString('he-IL'),
      event.description || ''
    ]);

    doc.autoTable({
      head: [['כותרת', 'סוג', 'תאריך', 'תיאור']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 10 },
      headStyles: { fillColor: [25, 118, 210] }
    });

    doc.save('אירועי_מחלקה.pdf');
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(events.map(event => ({
      'כותרת': event.title,
      'סוג': event.type,
      'תאריך': new Date(event.start_date).toLocaleDateString('he-IL'),
      'תיאור': event.description || ''
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "אירועים");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer]), 'אירועי_מחלקה.xlsx');
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`אירועי המחלקה:\n\n${events.map(event => 
      `כותרת: ${event.title}\nסוג: ${event.type}\nתאריך: ${new Date(event.start_date).toLocaleDateString('he-IL')}\nתיאור: ${event.description || ''}\n`
    ).join('\n')}`);
    window.open(`https://wa.me/?text=${text}`);
    setShareAnchorEl(null);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('אירועי המחלקה');
    const body = encodeURIComponent(`אירועי המחלקה:\n\n${events.map(event => 
      `כותרת: ${event.title}\nסוג: ${event.type}\nתאריך: ${new Date(event.start_date).toLocaleDateString('he-IL')}\nתיאור: ${event.description || ''}\n`
    ).join('\n')}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareAnchorEl(null);
  };

  return (
    <Box sx={{ p: 3 }}>
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
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="h5">אירועי המחלקה</Typography>
            <ButtonGroup variant="contained" size="small">
              <Button startIcon={<GetAppIcon />} onClick={exportToPDF}>
                PDF
              </Button>
              <Button onClick={exportToExcel}>
                Excel
              </Button>
              <Button
                startIcon={<ShareIcon />}
                onClick={(e) => setShareAnchorEl(e.currentTarget)}
              >
                שתף
              </Button>
            </ButtonGroup>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingEvent(null);
              setNewEvent(initialEventState);
              setOpenDialog(true);
            }}
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
                        <Box component="div">
                          <Box component="div" sx={{ color: 'text.secondary' }}>
                            {new Date(event.start_date).toLocaleDateString('he-IL')}
                          </Box>
                          <Box component="div">
                            {event.description}
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => {
                        setEditingEvent({
                          ...event,
                          title: event.title,
                          start_date: event.start_date
                        });
                        setOpenDialog(true);
                      }}>
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

      <Menu
        anchorEl={shareAnchorEl}
        open={Boolean(shareAnchorEl)}
        onClose={() => setShareAnchorEl(null)}
        PaperProps={{
          sx: {
            borderRadius: 1,
            boxShadow: 2,
            mt: 1
          }
        }}
      >
        <MenuItem 
          onClick={shareViaWhatsApp}
          sx={{ py: 1, minWidth: 120 }}
        >
          <ShareIcon sx={{ mr: 1, fontSize: 20 }} />
          WhatsApp
        </MenuItem>
        <MenuItem 
          onClick={shareViaEmail}
          sx={{ py: 1 }}
        >
          <ShareIcon sx={{ mr: 1, fontSize: 20 }} />
          אימייל
        </MenuItem>
      </Menu>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid #eee',
          pb: 2,
          fontWeight: 'bold'
        }}>
          {editingEvent ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              label="כותרת"
              value={editingEvent ? editingEvent.title : newEvent.title}
              onChange={(e) => {
                if (editingEvent) {
                  setEditingEvent({ ...editingEvent, title: e.target.value });
                } else {
                  setNewEvent({ ...newEvent, title: e.target.value });
                }
              }}
              required
              fullWidth
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <TextField
              select
              label="סוג אירוע"
              value={editingEvent ? editingEvent.type : newEvent.type}
              onChange={(e) => {
                if (editingEvent) {
                  setEditingEvent({ ...editingEvent, type: e.target.value });
                } else {
                  setNewEvent({ ...newEvent, type: e.target.value });
                }
              }}
              required
              fullWidth
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              {eventTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="תאריך"
              type="date"
              value={editingEvent ? editingEvent.start_date : newEvent.start_date}
              onChange={(e) => {
                if (editingEvent) {
                  setEditingEvent({ ...editingEvent, start_date: e.target.value });
                } else {
                  setNewEvent({ ...newEvent, start_date: e.target.value });
                }
              }}
              required
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <TextField
              label="תיאור"
              value={editingEvent ? editingEvent.description : newEvent.description}
              onChange={(e) => {
                if (editingEvent) {
                  setEditingEvent({ ...editingEvent, description: e.target.value });
                } else {
                  setNewEvent({ ...newEvent, description: e.target.value });
                }
              }}
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ 
          borderTop: '1px solid #eee',
          pt: 2,
          px: 3,
          pb: 2
        }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            color="inherit"
          >
            ביטול
          </Button>
          <Button 
            onClick={editingEvent ? handleEditEvent : handleAddEvent} 
            variant="contained"
            color="primary"
          >
            {editingEvent ? 'עדכן' : 'שמור'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default DepartmentEvents;