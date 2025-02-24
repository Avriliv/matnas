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
  Delete as DeleteIcon
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
    signature: null
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const signatureRef = useRef();
  const [selectedTab, setSelectedTab] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

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

  const validateForm = () => {
    const errors = {};
    if (!newItem.item_name?.trim()) errors.item_name = 'נדרש למלא שם פריט';
    if (!newItem.quantity || newItem.quantity < 1) errors.quantity = 'נדרש להזין כמות חוקית';
    if (!newItem.staff_member) errors.staff_member = 'נדרש לבחור איש צוות';
    if (!newItem.borrower_name?.trim()) errors.borrower_name = 'נדרש למלא שם שואל';
    if (!newItem.checkout_date) errors.checkout_date = 'נדרש למלא תאריך משיכה';
    
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setAlert({ open: true, message: 'נא למלא את כל השדות החובה', severity: 'error' });
      return;
    }

    try {
      let signature = null;
      if (signatureRef.current && !signatureRef.current.isEmpty()) {
        signature = signatureRef.current.toDataURL();
      }

      // Create base item data
      const itemData = {
        item_name: newItem.item_name.trim(),
        checkout_date: newItem.checkout_date,
        staff_member: newItem.staff_member,
        borrower_name: newItem.borrower_name.trim(),
        notes: newItem.notes?.trim() || '',
        signature: signature
      };

      // Add quantity only if the column exists
      try {
        const { data: columns } = await supabase
          .from('equipment_tracking')
          .select()
          .limit(1);
        
        if (columns && columns[0] && 'quantity' in columns[0]) {
          itemData.quantity = parseInt(newItem.quantity) || 1;
        }
      } catch (e) {
        console.warn('Could not verify quantity column:', e);
      }

      let error;
      if (newItem.id) {
        const { error: updateError } = await supabase
          .from('equipment_tracking')
          .update(itemData)
          .eq('id', newItem.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('equipment_tracking')
          .insert([itemData]);
        error = insertError;
      }

      if (error) {
        console.error('Supabase error:', error);
        setAlert({ open: true, message: 'שגיאה בשמירת הפריט: ' + error.message, severity: 'error' });
        throw error;
      }

      setAlert({ open: true, message: newItem.id ? 'הפריט עודכן בהצלחה' : 'הפריט נוסף בהצלחה', severity: 'success' });
      handleCloseDialog();
      fetchEquipment();
    } catch (error) {
      console.error('Error saving equipment:', error);
      setAlert({ open: true, message: 'שגיאה בשמירת הפריט: ' + (error.message || error), severity: 'error' });
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setErrors({});
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewItem({
      item_name: '',
      quantity: 1,
      checkout_date: new Date().toISOString().split('T')[0],
      staff_member: '',
      borrower_name: '',
      notes: '',
      signature: null
    });
  };

  const handleEditItem = (item) => {
    setNewItem(item);
    setOpenDialog(true);
    if (signatureRef.current) {
      signatureRef.current.clear();
      if (item.signature) {
        // אם יש צורך לטעון חתימה קיימת
      }
    }
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

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">מעקב ציוד</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setNewItem({
                item_name: '',
                quantity: 1,
                checkout_date: new Date().toISOString().split('T')[0],
                staff_member: '',
                borrower_name: '',
                notes: '',
                signature: null
              });
              setOpenDialog(true);
            }}
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
              <TableCell>שם הפריט</TableCell>
              <TableCell>שם השואל</TableCell>
              <TableCell>תאריך משיכה</TableCell>
              <TableCell>תאריך החזרה</TableCell>
              <TableCell>איש צוות</TableCell>
              <TableCell>הערות</TableCell>
              <TableCell>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(selectedTab === 0 ? borrowedEquipment : returnedEquipment).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.item_name}</TableCell>
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
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{newItem.id ? 'ערוך פריט' : 'הוסף פריט חדש'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="שם הפריט"
              value={newItem.item_name}
              onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
              error={!!errors.item_name}
              helperText={errors.item_name}
              required
            />
            <TextField
              label="כמות"
              type="number"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
              error={!!errors.quantity}
              helperText={errors.quantity}
              required
              InputProps={{ inputProps: { min: 1 } }}
            />
            <TextField
              label="תאריך משיכה"
              type="date"
              value={newItem.checkout_date}
              onChange={(e) => setNewItem({ ...newItem, checkout_date: e.target.value })}
              error={!!errors.checkout_date}
              helperText={errors.checkout_date}
              required
            />
            <FormControl error={!!errors.staff_member} required>
              <InputLabel>איש צוות</InputLabel>
              <Select
                value={newItem.staff_member}
                onChange={(e) => setNewItem({ ...newItem, staff_member: e.target.value })}
                label="איש צוות"
              >
                {staffMembers.map((member) => (
                  <MenuItem key={member} value={member}>
                    {member}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="שם השואל"
              value={newItem.borrower_name}
              onChange={(e) => setNewItem({ ...newItem, borrower_name: e.target.value })}
              error={!!errors.borrower_name}
              helperText={errors.borrower_name}
              required
            />
            <TextField
              label="הערות"
              value={newItem.notes}
              onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              multiline
              rows={3}
            />
            <Box sx={{ border: '1px solid #ccc', p: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                חתימה
              </Typography>
              <SignaturePad
                ref={signatureRef}
                canvasProps={{
                  className: 'signature-canvas',
                  style: { width: '100%', height: '150px' }
                }}
              />
              <Button size="small" onClick={() => signatureRef.current?.clear()}>
                נקה חתימה
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSubmit} variant="contained">
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
