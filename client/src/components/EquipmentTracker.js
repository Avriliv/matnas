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
  ButtonGroup,
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
  Select
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import ShareIcon from '@mui/icons-material/Share';
import GetAppIcon from '@mui/icons-material/GetApp';
import SignaturePad from 'react-signature-canvas';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// הגדרת פונט עברי

const staffMembers = ['אברי', 'בעז'];

function EquipmentTracker() {
  const [equipment, setEquipment] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
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

  const handleDeleteItem = async (id) => {
    try {
      const { error } = await supabase
        .from('equipment_tracking')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      setAlert({ open: true, message: 'שגיאה במחיקת הפריט', severity: 'error' });
    }
  };

  const exportToCSV = () => {
    // הכנת כותרות העמודות
    const headers = ['שם הפריט', 'כמות', 'תאריך משיכה', 'איש צוות', 'שם השואל', 'הערות'];
    
    // הכנת שורות הנתונים
    const rows = equipment.map(item => [
      item.item_name,
      item.quantity || '1',
      new Date(item.checkout_date).toLocaleDateString('he-IL'),
      item.staff_member,
      item.borrower_name,
      item.notes || ''
    ]);

    // יצירת תוכן ה-CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // יצירת ה-Blob עם BOM כדי שהעברית תוצג נכון
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { 
      type: 'text/csv;charset=utf-8' 
    });

    // הורדת הקובץ
    saveAs(blob, 'מעקב_ציוד.csv');
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`מעקב ציוד:\n\n${equipment.map(item => 
      `שם הפריט: ${item.item_name}\nכמות: ${item.quantity || 1}\nתאריך משיכה: ${new Date(item.checkout_date).toLocaleDateString('he-IL')}\nאיש צוות: ${item.staff_member}\nשם השואל: ${item.borrower_name}\n${item.notes ? `הערות: ${item.notes}\n` : ''}\n`
    ).join('\n')}`);
    window.open(`https://wa.me/?text=${text}`);
    setShareAnchorEl(null);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('מעקב ציוד');
    const body = encodeURIComponent(`מעקב ציוד:\n\n${equipment.map(item => 
      `שם הפריט: ${item.item_name}\nכמות: ${item.quantity || 1}\nתאריך משיכה: ${new Date(item.checkout_date).toLocaleDateString('he-IL')}\nאיש צוות: ${item.staff_member}\nשם השואל: ${item.borrower_name}\n${item.notes ? `הערות: ${item.notes}\n` : ''}\n`
    ).join('\n')}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareAnchorEl(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="h6">מעקב ציוד</Typography>
          <ButtonGroup variant="contained" size="small">
            <Button startIcon={<GetAppIcon />} onClick={exportToCSV}>
              ייצא לקובץ
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
          onClick={handleOpenDialog}
        >
          הוסף פריט חדש
        </Button>
      </Box>

      <Menu
        anchorEl={shareAnchorEl}
        open={Boolean(shareAnchorEl)}
        onClose={() => setShareAnchorEl(null)}
      >
        <MenuItem onClick={shareViaWhatsApp}>WhatsApp</MenuItem>
        <MenuItem onClick={shareViaEmail}>אימייל</MenuItem>
      </Menu>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שם הפריט</TableCell>
              <TableCell>כמות</TableCell>
              <TableCell>תאריך משיכה</TableCell>
              <TableCell>איש צוות</TableCell>
              <TableCell>שם השואל</TableCell>
              <TableCell>הערות</TableCell>
              <TableCell>חתימה</TableCell>
              <TableCell>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {equipment.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.item_name}</TableCell>
                <TableCell>{item.quantity || 1}</TableCell>
                <TableCell>{new Date(item.checkout_date).toLocaleDateString('he-IL')}</TableCell>
                <TableCell>{item.staff_member}</TableCell>
                <TableCell>{item.borrower_name}</TableCell>
                <TableCell>{item.notes}</TableCell>
                <TableCell>
                  {item.signature && (
                    <img src={item.signature} alt="חתימה" style={{ maxWidth: 100, maxHeight: 50 }} />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEditItem(item)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteItem(item.id)} size="small">
                    <DeleteIcon />
                  </IconButton>
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
