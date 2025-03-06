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
import ExportButtons from './ExportButtons';

function InventoryList() {
  const [inventory, setInventory] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [newItem, setNewItem] = useState({
    title: '',
    notes: '',
    items: [],
    product_url: '',
    quote_file_url: null
  });
  const [newItemInList, setNewItemInList] = useState({
    item_name: '',
    quantity: '',
    supplier: '',
    price: '',
    include_vat: true
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

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inventory:', error);
        showAlert('שגיאה בטעינת המלאי', 'error');
        return;
      }

      setInventory(data || []);
    } catch (error) {
      console.error('Error:', error);
      showAlert('שגיאה בטעינת המלאי', 'error');
    }
  };

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
        include_vat: item.include_vat || true,
        product_url: item.product_url || '',
        quote_file_url: item.quote_file_url || null
      });
    } else {
      setSelectedItem(null);
      setNewItem({
        title: '',
        notes: '',
        items: [],
        product_url: '',
        quote_file_url: null
      });
      setNewItemInList({
        item_name: '',
        quantity: '',
        supplier: '',
        price: '',
        include_vat: true
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
      if (!newItem.title.trim()) {
        showAlert('נא למלא את כותרת הרשימה', 'error');
        return;
      }

      if (newItem.items.length === 0) {
        showAlert('נא להוסיף לפחות פריט אחד', 'error');
        return;
      }

      // שמירת כל הפריטים
      const itemsToSave = newItem.items.map(item => ({
        item_name: item.item_name.trim(),
        quantity: item.quantity ? parseInt(item.quantity) : 0,
        supplier: item.supplier || null,
        price: item.price ? parseFloat(item.price) : null,
        notes: newItem.notes || null,
        include_vat: item.include_vat === undefined ? true : item.include_vat,
        product_url: newItem.product_url || null,
        quote_file_url: newItem.quote_file_url || null,
        group_title: newItem.title // שמירת הכותרת של הקבוצה
      }));

      const { error } = await supabase
        .from('inventory')
        .insert(itemsToSave);

      if (error) {
        console.error('Error saving items:', error);
        showAlert(error.message || 'שגיאה בשמירת הפריטים', 'error');
        return;
      }

      showAlert('הפריטים נוספו בהצלחה');
      fetchInventory();
      handleCloseDialog();
    } catch (error) {
      console.error('Error:', error);
      showAlert('שגיאה בשמירת הפריטים', 'error');
    }
  };

  const handleAddItemToList = () => {
    if (!newItemInList.item_name.trim()) {
      showAlert('נא למלא את שם הפריט', 'error');
      return;
    }

    setNewItem(prev => ({
      ...prev,
      items: [...prev.items, { ...newItemInList }]
    }));

    // איפוס הטופס של הפריט החדש
    setNewItemInList({
      item_name: '',
      quantity: '',
      supplier: '',
      price: '',
      include_vat: true
    });
  };

  const handleRemoveItemFromList = (index) => {
    setNewItem(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleDeleteClick = (itemId) => {
    setItemToDelete(itemId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemToDelete);

      if (error) throw error;

      setInventory(inventory.filter(item => item.id !== itemToDelete));
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

      // העלאת הקובץ ל-Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `quotes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('inventory-quotes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // קבלת URL לקובץ
      const { data: { publicUrl } } = await supabase.storage
        .from('inventory-quotes')
        .getPublicUrl(filePath);

      // עדכון הרשומה בטבלה
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quote_file_url: publicUrl })
        .eq('id', itemId);

      if (updateError) throw updateError;

      showAlert('הצעת המחיר הועלתה בהצלחה');
      fetchInventory();
    } catch (error) {
      console.error('Error uploading file:', error);
      showAlert('שגיאה בהעלאת הקובץ', 'error');
    }
  };

  // הגדרת העמודות לייצוא
  const exportColumns = [
    { field: 'item_name', headerName: 'שם הפריט' },
    { field: 'quantity', headerName: 'כמות' },
    { field: 'supplier', headerName: 'ספק' },
    { field: 'price', headerName: 'מחיר' },
    { field: 'include_vat', headerName: 'כולל מע"מ' },
    { field: 'notes', headerName: 'הערות' }
  ];

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" component="h2">
          מלאי והזמנות
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          הוסף פריטים
        </Button>
        <ExportButtons
          data={inventory}
          filename="רשימת_מלאי"
          columns={exportColumns}
        />
      </Stack>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">רשימת מלאי</Typography>
          <Box>
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
                      <>
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload(e, item.id)}
                          style={{ display: 'none' }}
                          id={`quote-upload-${item.id}`}
                        />
                        <label htmlFor={`quote-upload-${item.id}`}>
                          <Button component="span" size="small">
                            העלה
                          </Button>
                        </label>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.product_url && (
                      <Link href={item.product_url} target="_blank" rel="noopener noreferrer">
                        קישור
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" component="span">
                      {item.notes}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(item)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteClick(item.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
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

        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedItem ? 'עריכת פריט' : 'הוספת פריטים חדשים'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {!selectedItem && (
                <TextField
                  fullWidth
                  label="כותרת הרשימה"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="למשל: ציוד להכנת מד״צים"
                />
              )}
              
              <TextField
                fullWidth
                multiline
                rows={2}
                label="הערות כלליות"
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              />

              <TextField
                fullWidth
                label="קישור למוצר"
                value={newItem.product_url}
                onChange={(e) => setNewItem({ ...newItem, product_url: e.target.value })}
              />

              {!selectedItem && (
                <>
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    פריטים
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>שם הפריט</TableCell>
                            <TableCell>כמות</TableCell>
                            <TableCell>ספק</TableCell>
                            <TableCell>מחיר</TableCell>
                            <TableCell>כולל מע"מ</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {newItem.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.item_name}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.supplier}</TableCell>
                              <TableCell>
                                {item.price ? `₪${parseFloat(item.price).toLocaleString()}` : '-'}
                              </TableCell>
                              <TableCell>{item.include_vat ? 'כן' : 'לא'}</TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveItemFromList(index)}
                                  sx={{ color: 'error.main' }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      label="שם הפריט"
                      value={newItemInList.item_name}
                      onChange={(e) => setNewItemInList({ ...newItemInList, item_name: e.target.value })}
                      size="small"
                    />
                    <TextField
                      label="כמות"
                      type="number"
                      value={newItemInList.quantity}
                      onChange={(e) => setNewItemInList({ ...newItemInList, quantity: e.target.value })}
                      size="small"
                    />
                    <TextField
                      label="ספק"
                      value={newItemInList.supplier}
                      onChange={(e) => setNewItemInList({ ...newItemInList, supplier: e.target.value })}
                      size="small"
                    />
                    <TextField
                      label="מחיר"
                      type="number"
                      value={newItemInList.price}
                      onChange={(e) => setNewItemInList({ ...newItemInList, price: e.target.value })}
                      size="small"
                    />
                    <FormControl size="small">
                      <InputLabel>כולל מע"מ</InputLabel>
                      <Select
                        value={newItemInList.include_vat}
                        onChange={(e) => setNewItemInList({ ...newItemInList, include_vat: e.target.value })}
                        label="כולל מע״מ"
                      >
                        <MenuItem value={true}>כן</MenuItem>
                        <MenuItem value={false}>לא</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="outlined"
                      onClick={handleAddItemToList}
                      startIcon={<AddIcon />}
                    >
                      הוסף פריט
                    </Button>
                  </Box>
                </>
              )}

              {selectedItem && (
                <>
                  <TextField
                    fullWidth
                    label="שם הפריט"
                    value={newItem.item_name}
                    onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    label="כמות"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    label="ספק"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    label="מחיר"
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  />
                  <FormControl fullWidth>
                    <InputLabel>כולל מע"מ</InputLabel>
                    <Select
                      value={newItem.include_vat}
                      onChange={(e) => setNewItem({ ...newItem, include_vat: e.target.value })}
                      label="כולל מע״מ"
                    >
                      <MenuItem value={true}>כן</MenuItem>
                      <MenuItem value={false}>לא</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>ביטול</Button>
            <Button onClick={handleSaveItem} variant="contained" color="primary">
              {selectedItem ? 'שמור שינויים' : 'הוסף פריטים'}
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
