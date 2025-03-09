import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import SignaturePad from 'react-signature-canvas';
import { supabase } from '../supabaseClient';
import ExportButtons from './ExportButtons';

// הגדרת פונט עברי

const staffMembers = ['אברי', 'בעז'];

function EquipmentTracker() {
  const [equipment, setEquipment] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    item_name: '',
    quantity: 1,
    checkout_date: new Date().toISOString().split('T')[0],
    staff_member: '',
    borrower_name: '',
    notes: '',
    signature: null,
    event_id: '' // מזהה אירוע
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const signatureRef = useRef();
  const [selectedTab, setSelectedTab] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [events, setEvents] = useState([]); // רשימת אירועים
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [expandedEvents, setExpandedEvents] = useState({}); // מצב פתיחה/סגירה של אירועים

  const fetchEquipment = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_tracking')
        .select('*')
        .order('checkout_date', { ascending: false });

      if (error) {
        setAlert({ open: true, message: 'שגיאה בטעינת הציוד', severity: 'error' });
        throw error;
      }
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      setAlert({ open: true, message: 'שגיאה בטעינת הציוד', severity: 'error' });
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  const handleSaveItem = async () => {
    try {
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setErrors(errors);
        return;
      }

      let signature = newItem.signature;
      if (signatureRef.current && !signature) {
        if (signatureRef.current.isEmpty()) {
          setErrors({ signature: 'חתימה נדרשת' });
          return;
        }
        signature = signatureRef.current.toDataURL();
      }

      if (newItem.id) {
        // עדכון פריט קיים
        const { error } = await supabase
          .from('equipment_tracking')
          .update({
            item_name: newItem.item_name.trim(),
            quantity: newItem.quantity,
            checkout_date: newItem.checkout_date,
            staff_member: newItem.staff_member.trim(),
            borrower_name: newItem.borrower_name.trim(),
            notes: newItem.notes?.trim() || '',
            borrower_signature: signature,
            event_id: newItem.event_id || null
          })
          .eq('id', newItem.id);

        if (error) {
          console.error('Error updating item:', error);
          setAlert({
            open: true,
            message: 'שגיאה בעדכון הפריט',
            severity: 'error'
          });
          return;
        }

        setAlert({
          open: true,
          message: 'הפריט עודכן בהצלחה',
          severity: 'success'
        });
      } else {
        // הוספת פריט חדש
        const { data, error } = await supabase
          .from('equipment_tracking')
          .insert({
            item_name: newItem.item_name.trim(),
            quantity: newItem.quantity,
            checkout_date: newItem.checkout_date,
            staff_member: newItem.staff_member.trim(),
            borrower_name: newItem.borrower_name.trim(),
            notes: newItem.notes?.trim() || '',
            borrower_signature: signature,
            event_id: newItem.event_id || null
          });

        if (error) {
          console.error('Error adding item:', error);
          setAlert({
            open: true,
            message: 'שגיאה בהוספת הפריט',
            severity: 'error'
          });
          return;
        }

        setAlert({
          open: true,
          message: 'הפריט נוסף בהצלחה',
          severity: 'success'
        });
      }

      fetchEquipment();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving item:', error);
      setAlert({
        open: true,
        message: 'שגיאה בשמירת הפריט',
        severity: 'error'
      });
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setErrors({});
    setNewItem({
      item_name: '',
      quantity: 1,
      checkout_date: new Date().toISOString().split('T')[0],
      staff_member: '',
      borrower_name: '',
      notes: '',
      signature: null,
      event_id: ''
    });
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setErrors({});
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handleEditItem = (item) => {
    setNewItem({
      id: item.id,
      item_name: item.item_name,
      quantity: item.quantity || 1,
      checkout_date: item.checkout_date,
      staff_member: item.staff_member,
      borrower_name: item.borrower_name,
      notes: item.notes || '',
      signature: item.borrower_signature,
      event_id: item.event_id || ''
    });
    setOpenDialog(true);
  };

  const handleDeleteClick = (itemId) => {
    setItemToDelete(itemId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from('equipment_tracking')
        .delete()
        .eq('id', itemToDelete);

      if (error) throw error;

      setEquipment(equipment.filter(item => item.id !== itemToDelete));
      setAlert({
        open: true,
        message: 'הפריט נמחק בהצלחה',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      setAlert({
        open: true,
        message: 'שגיאה במחיקת הפריט',
        severity: 'error'
      });
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleReturn = async (item) => {
    try {
      const { data, error } = await supabase
        .from('equipment_tracking')
        .update({
          return_date: new Date().toISOString().split('T')[0],
          borrower_name: '',
          staff_member: ''
        })
        .eq('id', item.id);

      if (error) throw error;

      // עדכון הממשק
      setEquipment(equipment.map(eq => 
        eq.id === item.id 
          ? { 
              ...eq, 
              return_date: new Date().toISOString().split('T')[0],
              borrower_name: '',
              staff_member: ''
            }
          : eq
      ));

      setAlert({ open: true, message: 'הפריט הוחזר בהצלחה', severity: 'success' });
    } catch (error) {
      console.error('Error returning item:', error);
      setAlert({ open: true, message: 'שגיאה בהחזרת הפריט', severity: 'error' });
    }
  };

  // הגדרת העמודות לייצוא
  const exportColumns = [
    { field: 'item_name', headerName: 'שם הפריט' },
    { field: 'quantity', headerName: 'כמות' },
    { field: 'borrower_name', headerName: 'שואל' },
    { field: 'checkout_date', headerName: 'תאריך השאלה' },
    { field: 'staff_member', headerName: 'אחראי' },
    { field: 'notes', headerName: 'הערות' }
  ];

  // עיבוד הנתונים לייצוא
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('he-IL');
  };

  const exportData = equipment.map(item => ({
    ...item,
    checkout_date: formatDate(item.checkout_date),
    return_date: formatDate(item.return_date)
  }));

  // פילטור הציוד לפי טאב
  const borrowedEquipment = equipment.filter(item => !item.return_date);
  const returnedEquipment = equipment.filter(item => item.return_date);

  // קיבוץ הציוד לפי אירועים
  const groupEquipmentByEvent = useCallback((equipmentList) => {
    const grouped = {};
    const noEventItems = [];

    // קיבוץ פריטים לפי אירוע
    equipmentList.forEach(item => {
      if (item.event_id) {
        if (!grouped[item.event_id]) {
          const event = events.find(e => e.id === item.event_id);
          grouped[item.event_id] = {
            id: item.event_id,
            title: event ? event.title : 'אירוע לא ידוע',
            items: []
          };
        }
        grouped[item.event_id].items.push(item);
      } else {
        noEventItems.push(item);
      }
    });

    // המרה למערך
    const result = Object.values(grouped);
    
    // הוספת קטגוריה לפריטים ללא אירוע
    if (noEventItems.length > 0) {
      result.push({
        id: 'no-event',
        title: 'פריטים ללא אירוע',
        items: noEventItems
      });
    }

    return result;
  }, [events]);

  const toggleEventExpand = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const groupedBorrowedEquipment = groupEquipmentByEvent(borrowedEquipment);
  const groupedReturnedEquipment = groupEquipmentByEvent(returnedEquipment);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*');

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const validateForm = () => {
    const errors = {};
    if (!newItem.item_name || newItem.item_name.trim() === '') {
      errors.item_name = 'שם הפריט נדרש';
    }
    if (!newItem.quantity || newItem.quantity < 1) {
      errors.quantity = 'כמות חייבת להיות לפחות 1';
    }
    if (!newItem.checkout_date) {
      errors.checkout_date = 'תאריך משיכה נדרש';
    }
    if (!newItem.staff_member || newItem.staff_member.trim() === '') {
      errors.staff_member = 'שם איש צוות נדרש';
    }
    if (!newItem.borrower_name || newItem.borrower_name.trim() === '') {
      errors.borrower_name = 'שם השואל נדרש';
    }
    
    setErrors(errors);
    return errors;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">מעקב ציוד</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            הוסף פריט חדש
          </Button>
          <ExportButtons
            data={exportData}
            filename="מעקב_ציוד"
            columns={exportColumns}
          />
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} dir="rtl">
          <Tab label="פריטים מושאלים" />
          <Tab label="פריטים שהוחזרו" />
        </Tabs>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שם הפריט / אירוע</TableCell>
              <TableCell>כמות</TableCell>
              <TableCell>שם השואל</TableCell>
              <TableCell>תאריך משיכה</TableCell>
              <TableCell>תאריך החזרה</TableCell>
              <TableCell>איש צוות</TableCell>
              <TableCell>הערות</TableCell>
              <TableCell>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(selectedTab === 0 ? groupedBorrowedEquipment : groupedReturnedEquipment).map((group) => (
              <React.Fragment key={group.id}>
                {/* שורת האירוע */}
                <TableRow 
                  sx={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    }
                  }}
                  onClick={() => toggleEventExpand(group.id)}
                >
                  <TableCell colSpan={8} sx={{ fontWeight: 'bold' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {expandedEvents[group.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      <Box sx={{ mr: 1 }}>{group.title} ({group.items.length} פריטים)</Box>
                    </Box>
                  </TableCell>
                </TableRow>

                {/* שורות הפריטים */}
                {expandedEvents[group.id] && group.items.map((item) => (
                  <TableRow key={item.id} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.quantity || 1}</TableCell>
                    <TableCell>{item.borrower_name}</TableCell>
                    <TableCell>{formatDate(item.checkout_date)}</TableCell>
                    <TableCell>{formatDate(item.return_date)}</TableCell>
                    <TableCell>{item.staff_member}</TableCell>
                    <TableCell>{item.notes}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditItem(item)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(item.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                        {selectedTab === 0 && (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleReturn(item)}
                          >
                            הוחזר
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{newItem.id ? 'ערוך פריט' : 'הוסף פריט חדש'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="staff-member-label">איש צוות</InputLabel>
              <Select
                labelId="staff-member-label"
                value={newItem.staff_member}
                onChange={(e) => setNewItem({ ...newItem, staff_member: e.target.value })}
                error={!!errors.staff_member}
              >
                {staffMembers.map((member) => (
                  <MenuItem key={member} value={member}>{member}</MenuItem>
                ))}
              </Select>
              {errors.staff_member && (
                <Typography color="error" variant="caption">
                  {errors.staff_member}
                </Typography>
              )}
            </FormControl>

            <TextField
              label="שם השואל"
              value={newItem.borrower_name}
              onChange={(e) => setNewItem({ ...newItem, borrower_name: e.target.value })}
              error={!!errors.borrower_name}
              helperText={errors.borrower_name}
              required
              fullWidth
            />

            <TextField
              label="תאריך משיכה"
              type="date"
              value={newItem.checkout_date}
              onChange={(e) => setNewItem({ ...newItem, checkout_date: e.target.value })}
              error={!!errors.checkout_date}
              helperText={errors.checkout_date}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="event-label">אירוע</InputLabel>
              <Select
                labelId="event-label"
                value={newItem.event_id}
                onChange={(e) => setNewItem({ ...newItem, event_id: e.target.value })}
                label="אירוע"
              >
                <MenuItem value="">בחר אירוע</MenuItem>
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>{event.title}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="שם הפריט"
              fullWidth
              value={newItem.item_name}
              onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
              error={!!errors.item_name}
              helperText={errors.item_name}
              sx={{ mb: 2 }}
            />

            <TextField
              label="כמות"
              type="number"
              fullWidth
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              error={!!errors.quantity}
              helperText={errors.quantity}
              sx={{ mb: 2 }}
              InputProps={{ inputProps: { min: 1 } }}
            />

            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                חתימת השואל
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  width: '100%',
                  height: 200,
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 1
                }}
              >
                <SignaturePad
                  ref={signatureRef}
                  canvasProps={{
                    width: 500,
                    height: 200,
                    className: 'signature-canvas'
                  }}
                />
              </Paper>
              <Button
                variant="outlined"
                size="small"
                onClick={() => signatureRef.current && signatureRef.current.clear()}
              >
                נקה חתימה
              </Button>
              {errors.signature && (
                <Typography color="error" variant="caption" display="block">
                  {errors.signature}
                </Typography>
              )}
            </Box>

            <TextField
              label="הערות"
              value={newItem.notes}
              onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSaveItem} variant="contained">
            {newItem.id ? 'עדכן' : 'שמור'}
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
          האם למחוק את הפריט?
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

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default EquipmentTracker;
