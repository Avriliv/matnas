import React, { useState, useRef, useEffect } from 'react';
import SignaturePad from 'react-signature-canvas';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../supabaseClient';

const staffMembers = ['אברי', 'בעז'];

function EquipmentTracker() {
  const [equipment, setEquipment] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    item_name: '',
    container_number: '',
    checkout_date: new Date().toISOString().split('T')[0],
    staff_member: '',
    borrower_name: '',
    notes: '',
    signature: null
  });
  const [errors, setErrors] = useState({});
  const signatureRef = useRef();

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('checkout_date', { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!newItem.item_name) errors.item_name = 'נדרש למלא שם פריט';
    if (!newItem.container_number) errors.container_number = 'נדרש לבחור מכולה';
    if (!newItem.staff_member) errors.staff_member = 'נדרש לבחור איש צוות';
    if (!newItem.borrower_name) errors.borrower_name = 'נדרש למלא שם שואל';
    if (!newItem.checkout_date) errors.checkout_date = 'נדרש למלא תאריך משיכה';
    
    setErrors(errors);
    return Object.keys(errors).length === 0;
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
      container_number: '',
      checkout_date: new Date().toISOString().split('T')[0],
      staff_member: '',
      borrower_name: '',
      notes: '',
      signature: null
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const signature = signatureRef.current?.isEmpty()
        ? null
        : signatureRef.current?.getTrimmedCanvas().toDataURL('image/png');

      const itemData = {
        ...newItem,
        signature
      };

      let error;
      if (newItem.id) {
        const { error: updateError } = await supabase
          .from('equipment')
          .update(itemData)
          .eq('id', newItem.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('equipment')
          .insert([itemData]);
        error = insertError;
      }

      if (error) throw error;

      handleCloseDialog();
      fetchEquipment();
    } catch (error) {
      console.error('Error saving equipment:', error);
    }
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
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">ציוד</Typography>
        <Button
          variant="contained"
          onClick={handleOpenDialog}
        >
          הוסף פריט חדש
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שם הפריט</TableCell>
              <TableCell>מכולה</TableCell>
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
                <TableCell>{item.container_number}</TableCell>
                <TableCell>
                  {new Date(item.checkout_date).toLocaleDateString('he-IL', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })}
                </TableCell>
                <TableCell>{item.staff_member}</TableCell>
                <TableCell>{item.borrower_name}</TableCell>
                <TableCell>{item.notes}</TableCell>
                <TableCell>
                  {item.signature && (
                    <img
                      src={item.signature}
                      alt="חתימה"
                      style={{ width: '60px', height: '30px', objectFit: 'contain' }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEditItem(item)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteItem(item.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{newItem.id ? 'עריכת פריט' : 'הוספת פריט חדש'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="שם הפריט"
              value={newItem.item_name}
              onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
              error={!!errors.item_name}
              helperText={errors.item_name}
              required
              fullWidth
            />

            <FormControl fullWidth required>
              <InputLabel>מכולה</InputLabel>
              <Select
                value={newItem.container_number}
                label="מכולה"
                onChange={(e) => setNewItem({ ...newItem, container_number: e.target.value })}
                error={!!errors.container_number}
              >
                <MenuItem value="1">מכולה 1</MenuItem>
                <MenuItem value="2">מכולה 2</MenuItem>
              </Select>
            </FormControl>

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

            <FormControl fullWidth required>
              <InputLabel>איש צוות</InputLabel>
              <Select
                value={newItem.staff_member}
                label="איש צוות"
                onChange={(e) => setNewItem({ ...newItem, staff_member: e.target.value })}
                error={!!errors.staff_member}
              >
                {staffMembers.map((member) => (
                  <MenuItem key={member} value={member}>{member}</MenuItem>
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
              fullWidth
            />

            <TextField
              label="הערות"
              value={newItem.notes}
              onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                חתימת השואל
              </Typography>
              <SignaturePad
                ref={signatureRef}
                canvasProps={{
                  className: 'signature-canvas',
                  style: { width: '100%', height: '150px', border: '1px solid #ccc' }
                }}
              />
              <Button onClick={() => signatureRef.current?.clear()} size="small" sx={{ mt: 1 }}>
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
    </Box>
  );
}

export default EquipmentTracker;
