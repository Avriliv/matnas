import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  Snackbar,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';

function InventoryList() {
  const [inventory, setInventory] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [exportAnchorEl, setExportAnchorEl] = useState(null);

  const [newItem, setNewItem] = useState({
    item_name: '',
    quantity: '',
    supplier: '',
    price: '',
    notes: '',
    include_vat: true,
    product_url: ''
  });

  useEffect(() => {
    fetchInventory();

    // הגדרת מאזין לשינויים בזמן אמת
    const subscription = supabase
      .channel('inventory-channel')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'inventory'
        }, 
        (payload) => {
          console.log('שינוי במלאי התקבל:', payload);
          fetchInventory(); // טעינה מחדש של המלאי
      })
      .subscribe();

    // ניקוי המאזין כשהקומפוננטה מתפרקת
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchInventory() {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('item_name');

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      showAlert('שגיאה בטעינת נתוני המלאי', 'error');
    }
  }

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setNewItem({
        item_name: item.item_name,
        quantity: item.quantity.toString(),
        supplier: item.supplier || '',
        price: item.price?.toString() || '',
        notes: item.notes || '',
        include_vat: item.include_vat ?? true,
        product_url: item.product_url || ''
      });
    } else {
      setSelectedItem(null);
      setNewItem({
        item_name: '',
        quantity: '',
        supplier: '',
        price: '',
        notes: '',
        include_vat: true,
        product_url: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
  };

  const calculatePriceWithVat = (price, includeVat) => {
    if (!price) return '-';
    const numPrice = Number(price);
    return `₪${(includeVat ? numPrice : numPrice * 1.18).toLocaleString()}`;
  };

  const handleSaveItem = async () => {
    try {
      const itemData = {
        item_name: newItem.item_name,
        quantity: parseInt(newItem.quantity) || 0,
        supplier: newItem.supplier,
        price: parseFloat(newItem.price) || null,
        notes: newItem.notes,
        include_vat: newItem.include_vat,
        product_url: newItem.product_url
      };

      if (selectedItem) {
        const { error } = await supabase
          .from('inventory')
          .update(itemData)
          .eq('id', selectedItem.id);

        if (error) throw error;
        showAlert('פריט עודכן בהצלחה');
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert([itemData]);

        if (error) throw error;
        showAlert('פריט נוסף בהצלחה');
      }

      fetchInventory();
      handleCloseDialog();
    } catch (error) {
      showAlert('שגיאה בשמירת הפריט', 'error');
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק פריט זה?')) {
      try {
        const { error } = await supabase
          .from('inventory')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        showAlert('הפריט נמחק בהצלחה');
        fetchInventory();
      } catch (error) {
        showAlert('שגיאה במחיקת הפריט', 'error');
      }
    }
  };

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const exportToExcel = () => {
    const exportData = inventory.map(item => ({
      'שם הפריט': item.item_name,
      'כמות': item.quantity,
      'ספק': item.supplier || '',
      'מחיר': item.price ? calculatePriceWithVat(item.price, item.include_vat) : '',
      'כולל מע"מ': item.include_vat ? 'כן' : 'לא',
      'קישור למוצר': item.product_url || '',
      'הערות': item.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'מלאי והזמנות');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'מלאי והזמנות.xlsx');
    handleExportClose();
  };

  const handleEmailExport = () => {
    const totalItems = inventory.length;
    const subject = 'מלאי והזמנות';
    const body = `רשימת המלאי מצורפת.\n\nסה"כ פריטים: ${totalItems}`;
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
    handleExportClose();
  };

  const handleFileUpload = async (event, itemId) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `quotes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('inventory-quotes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl }, error: urlError } = await supabase.storage
        .from('inventory-quotes')
        .getPublicUrl(filePath);

      if (urlError) throw urlError;

      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          quote_file_url: publicUrl,
          quote_file_name: file.name
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      showAlert('הצעת המחיר הועלתה בהצלחה');
      fetchInventory();
    } catch (error) {
      showAlert('שגיאה בהעלאת הקובץ', 'error');
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">מלאי והזמנות</Typography>
          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ ml: 1 }}
            >
              הוספת פריט חדש
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportClick}
              sx={{ ml: 1 }}
            >
              ייצא
            </Button>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>שם הפריט</TableCell>
                <TableCell>כמות</TableCell>
                <TableCell>ספק</TableCell>
                <TableCell>מחיר</TableCell>
                <TableCell>כולל מע״מ</TableCell>
                <TableCell>הצעת מחיר</TableCell>
                <TableCell>קישור למוצר</TableCell>
                <TableCell>הערות</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{calculatePriceWithVat(item.price, item.include_vat)}</TableCell>
                  <TableCell>{item.include_vat ? 'כן' : 'לא'}</TableCell>
                  <TableCell>
                    {item.quote_file_url ? (
                      <Link href={item.quote_file_url} target="_blank" rel="noopener noreferrer">
                        צפה בהצעת מחיר
                      </Link>
                    ) : (
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, item.id)}
                        style={{ display: 'none' }}
                        id={`quote-upload-${item.id}`}
                      />
                    )}
                    <label htmlFor={`quote-upload-${item.id}`}>
                      <Button component="span" size="small">
                        {item.quote_file_url ? 'החלף' : 'העלה'}
                      </Button>
                    </label>
                  </TableCell>
                  <TableCell>
                    {item.product_url && (
                      <Link href={item.product_url} target="_blank" rel="noopener noreferrer">
                        קישור למוצר
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>{item.notes}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="ערוך">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(item)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="מחק">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Menu
          anchorEl={exportAnchorEl}
          open={Boolean(exportAnchorEl)}
          onClose={handleExportClose}
        >
          <MenuItem onClick={exportToExcel}>
            ייצא ל-Excel
          </MenuItem>
          <MenuItem onClick={handleEmailExport}>
            שלח במייל
          </MenuItem>
        </Menu>

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {selectedItem ? 'עריכת פריט' : 'הוספת פריט חדש'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="שם הפריט"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="כמות"
                value={newItem.quantity}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setNewItem({ ...newItem, quantity: value });
                }}
                type="text"
                required
                fullWidth
              />

              <TextField
                label="ספק"
                value={newItem.supplier}
                onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                fullWidth
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="מחיר"
                  value={newItem.price}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setNewItem({ ...newItem, price: value });
                  }}
                  type="text"
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>מע״מ</InputLabel>
                  <Select
                    value={newItem.include_vat}
                    label="מע״מ"
                    onChange={(e) => setNewItem({ ...newItem, include_vat: e.target.value })}
                  >
                    <MenuItem value={true}>כולל מע״מ</MenuItem>
                    <MenuItem value={false}>לא כולל מע״מ</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TextField
                label="קישור למוצר"
                value={newItem.product_url}
                onChange={(e) => setNewItem({ ...newItem, product_url: e.target.value })}
                fullWidth
                type="url"
              />

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
              {selectedItem ? 'עדכן' : 'שמור'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={() => setAlert({ ...alert, open: false })}
        >
          <Alert
            onClose={() => setAlert({ ...alert, open: false })}
            severity={alert.severity}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}

export default InventoryList;
