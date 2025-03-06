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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [newItem, setNewItem] = useState({
    item_name: '',
    quantity: '',
    supplier: '',
    price: '',
    notes: '',
    include_vat: true,
    product_url: '',
    quote_file_url: null
  });

  useEffect(() => {
    const loadInventoryItems = async () => {
      try {
        setLoading(true);
        setError(null);

        // קבלת המשתמש הנוכחי
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('לא נמצא משתמש מחובר');
        }

        // קבלת הפרופיל של המשתמש עם ההרשאות
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('can_view_tasks_from')
          .eq('id', user.id)
          .single();

        // מביאים את הפריטים של המשתמש עצמו ושל המשתמשים שהוא יכול לראות
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .or(`user_id.eq.${user.id}${userProfile?.can_view_tasks_from?.length ? `,user_id.in.(${userProfile.can_view_tasks_from.join(',')})` : ''}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInventory(data || []);
      } catch (error) {
        console.error('Error loading inventory items:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadInventoryItems();

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
          loadInventoryItems(); // טעינה מחדש של המלאי
        }
      )
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
        item_name: '',
        quantity: '',
        supplier: '',
        price: '',
        notes: '',
        include_vat: true,
        product_url: '',
        quote_file_url: null
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
      if (!newItem.item_name.trim()) {
        showAlert('נא למלא את שם הפריט', 'error');
        return;
      }

      const itemData = {
        item_name: newItem.item_name.trim(),
        quantity: newItem.quantity ? parseInt(newItem.quantity) : 0,
        supplier: newItem.supplier || null,
        price: newItem.price ? parseFloat(newItem.price) : null,
        notes: newItem.notes || null,
        include_vat: newItem.include_vat === undefined ? true : newItem.include_vat,
        product_url: newItem.product_url || null,
        quote_file_url: newItem.quote_file_url || null
      };

      if (selectedItem?.id) {
        itemData.id = selectedItem.id;
      }

      const { error } = await supabase
        .from('inventory')
        .upsert([itemData]);

      if (error) {
        console.error('Error saving item:', error);
        showAlert(error.message || 'שגיאה בשמירת הפריט', 'error');
        return;
      }

      showAlert(selectedItem ? 'פריט עודכן בהצלחה' : 'פריט נוסף בהצלחה');
      loadInventoryItems();
      handleCloseDialog();
    } catch (error) {
      console.error('Error:', error);
      showAlert('שגיאה בשמירת הפריט', 'error');
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
      loadInventoryItems();
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
      {loading ? (
        <Typography variant="h6" component="p">
          טוען מלאי...
        </Typography>
      ) : error ? (
        <Typography variant="h6" component="p" color="error">
          {error}
        </Typography>
      ) : (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h5" component="h2">
              מלאי והזמנות
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              הוסף פריט
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

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="include-vat-label">מחיר כולל מע"מ</InputLabel>
                    <Select
                      labelId="include-vat-label"
                      label="מחיר כולל מע"מ"
                      value={newItem.include_vat}
                      onChange={(e) => setNewItem({ ...newItem, include_vat: e.target.value })}
                    >
                      <MenuItem value={true}>כולל מע"מ</MenuItem>
                      <MenuItem value={false}>לא כולל מע"מ</MenuItem>
                    </Select>
                  </FormControl>

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
        </>
      )}
    </Box>
  );
}

export default InventoryList;
