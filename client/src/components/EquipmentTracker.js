import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Snackbar,
  Alert,
  FormControl,
  MenuItem,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon
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
    event_name: ''
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const signatureRef = useRef();
  const [selectedTab, setSelectedTab] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [expandedEvents, setExpandedEvents] = useState({}); // מצב פתיחה/סגירה של אירועים
  const [selectedItems, setSelectedItems] = useState([]); // פריטים שנבחרו לעריכה מרובה
  const [bulkEditOpen, setBulkEditOpen] = useState(false); // דיאלוג עריכה מרובה
  const [bulkEditEvent, setBulkEditEvent] = useState(''); // אירוע שנבחר לעריכה מרובה
  const [bulkEditNewEventName, setBulkEditNewEventName] = useState(''); // שם אירוע חדש לעריכה מרובה
  const [selectAllVisible, setSelectAllVisible] = useState(false); // האם להציג את כפתור "סמן הכל"
  const [multipleItems, setMultipleItems] = useState(false); // האם להוסיף מספר פריטים בבת אחת
  const [itemsList, setItemsList] = useState([{ name: '', quantity: 1 }]); // רשימת פריטים להוספה מרובה

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
            event_name: newItem.event_name?.trim() || ''
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
        if (multipleItems) {
          // הוספת מספר פריטים בבת אחת
          const itemsToAdd = itemsList.filter(item => item.name.trim() !== '');
          
          if (itemsToAdd.length === 0) {
            setAlert({
              open: true,
              message: 'יש להזין לפחות פריט אחד',
              severity: 'warning'
            });
            return;
          }
          
          const items = itemsToAdd.map(item => ({
            item_name: item.name.trim(),
            quantity: item.quantity,
            checkout_date: newItem.checkout_date,
            staff_member: newItem.staff_member.trim(),
            borrower_name: newItem.borrower_name.trim(),
            notes: newItem.notes?.trim() || '',
            borrower_signature: signature,
            event_name: newItem.event_name?.trim() || ''
          }));
          
          const { data, error } = await supabase
            .from('equipment_tracking')
            .insert(items);

          if (error) {
            console.error('Error adding items:', error);
            setAlert({
              open: true,
              message: 'שגיאה בהוספת הפריטים',
              severity: 'error'
            });
            return;
          }

          setAlert({
            open: true,
            message: `${items.length} פריטים נוספו בהצלחה`,
            severity: 'success'
          });
        } else {
          // הוספת פריט בודד
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
              event_name: newItem.event_name?.trim() || ''
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
      event_name: ''
    });
    setMultipleItems(false);
    setItemsList([{ name: '', quantity: 1 }]);
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
      event_name: item.event_name || ''
    });
    setOpenDialog(true);
  };

  const handleDeleteClick = (itemId) => {
    setItemToDelete(itemId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = (confirmed) => {
    setDeleteConfirmOpen(false);
    
    if (confirmed) {
      handleDeleteItem(itemToDelete);
    }
    
    setItemToDelete(null);
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('equipment_tracking')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error deleting item:', error);
        setAlert({
          open: true,
          message: 'שגיאה במחיקת הפריט',
          severity: 'error'
        });
        return;
      }

      setAlert({
        open: true,
        message: 'הפריט נמחק בהצלחה',
        severity: 'success'
      });
      fetchEquipment();
    } catch (error) {
      console.error('Error deleting item:', error);
      setAlert({
        open: true,
        message: 'שגיאה במחיקת הפריט',
        severity: 'error'
      });
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
      if (item.event_name && item.event_name.trim() !== '') {
        if (!grouped[item.event_name]) {
          grouped[item.event_name] = {
            id: item.event_name,
            title: item.event_name,
            items: []
          };
        }
        grouped[item.event_name].items.push(item);
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
  }, []);
  const groupedBorrowedEquipment = groupEquipmentByEvent(borrowedEquipment);
  const groupedReturnedEquipment = groupEquipmentByEvent(returnedEquipment);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        const newSelectedItems = [...prev, itemId];
        // אם זה הפריט הראשון שנבחר, הצג את כפתור "סמן הכל"
        if (newSelectedItems.length === 1) {
          setSelectAllVisible(true);
        }
        return newSelectedItems;
      }
    });
  };

  const handleSelectAll = (groupId = null) => {
    // אם groupId מוגדר, בחר רק את הפריטים מהקבוצה הזו
    // אחרת, בחר את כל הפריטים מכל הקבוצות שפתוחות
    const itemsToSelect = [];
    
    if (groupId) {
      // בחר רק פריטים מהקבוצה הספציפית
      const group = (selectedTab === 0 ? groupedBorrowedEquipment : groupedReturnedEquipment)
        .find(g => g.id === groupId);
      
      if (group && expandedEvents[group.id]) {
        group.items.forEach(item => {
          itemsToSelect.push(item.id);
        });
      }
    } else {
      // בחר את כל הפריטים מכל הקבוצות הפתוחות
      (selectedTab === 0 ? groupedBorrowedEquipment : groupedReturnedEquipment).forEach(group => {
        if (expandedEvents[group.id]) {
          group.items.forEach(item => {
            itemsToSelect.push(item.id);
          });
        }
      });
    }
    
    setSelectedItems(itemsToSelect);
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
    setSelectAllVisible(false);
  };

  const handleOpenBulkEdit = () => {
    if (selectedItems.length === 0) {
      setAlert({
        open: true,
        message: 'יש לבחור לפחות פריט אחד לעריכה',
        severity: 'warning'
      });
      return;
    }
    setBulkEditOpen(true);
  };

  const handleCloseBulkEdit = () => {
    setBulkEditOpen(false);
    setBulkEditEvent('');
    setBulkEditNewEventName('');
  };

  const handleSaveBulkEdit = async () => {
    try {
      if (bulkEditEvent === '' && (!bulkEditNewEventName || bulkEditNewEventName.trim() === '')) {
        setAlert({
          open: true,
          message: 'יש לבחור אירוע או להזין שם לאירוע חדש',
          severity: 'warning'
        });
        return;
      }

      let eventId = bulkEditEvent;

      // אם נבחר להוסיף אירוע חדש
      if (bulkEditEvent === 'new' && bulkEditNewEventName && bulkEditNewEventName.trim() !== '') {
        // יצירת אירוע חדש
        const { data: newEvent, error: eventError } = await supabase
          .from('events')
          .insert({
            name: bulkEditNewEventName.trim(),
            type: 'אחר',
            date: new Date().toISOString().split('T')[0],
            supplier: '',
            created_at: new Date().toISOString()
          })
          .select();

        if (eventError) {
          console.error('Error creating new event:', eventError);
          setAlert({
            open: true,
            message: 'שגיאה ביצירת אירוע חדש',
            severity: 'error'
          });
          return;
        }

        if (newEvent && newEvent.length > 0) {
          eventId = newEvent[0].id;
          // עדכון רשימת האירועים
          // fetchEvents();
        }
      }

      // בדיקה אם עמודת event_id קיימת
      const { data: testData, error: testError } = await supabase
        .from('equipment_tracking')
        .select('event_name')
        .limit(1);

      if (testError && testError.message && testError.message.includes("column \"event_name\" does not exist")) {
        setAlert({
          open: true,
          message: 'לא ניתן לשייך פריטים לאירוע. נדרשת הרצת מיגרציה להוספת עמודת event_name',
          severity: 'error'
        });
        return;
      }

      // ניסיון לעדכן את הפריטים
      // חלוקת הפריטים לקבוצות של 10 פריטים כדי להימנע ממגבלת אורך URL
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < selectedItems.length; i += batchSize) {
        batches.push(selectedItems.slice(i, i + batchSize));
      }
      
      let hasError = false;
      let columnNotFoundError = false;
      
      // עדכון כל קבוצה בנפרד
      for (const batch of batches) {
        const { error } = await supabase
          .from('equipment_tracking')
          .update({ event_name: eventId })
          .in('id', batch);
          
        if (error) {
          console.error('Error updating items:', error);
          hasError = true;
          
          // בדיקה אם השגיאה היא שהעמודה לא קיימת
          if (error.message && (
              error.message.includes("Could not find the 'event_name' column") || 
              error.message.includes("column \"event_name\" does not exist")
          )) {
            columnNotFoundError = true;
            break; // אין טעם להמשיך אם העמודה לא קיימת
          }
        }
      }
      
      if (columnNotFoundError) {
        setAlert({
          open: true,
          message: 'לא ניתן לשייך פריטים לאירוע. נדרשת הרצת מיגרציה להוספת עמודת event_name',
          severity: 'error'
        });
        return;
      }
      
      if (hasError) {
        setAlert({
          open: true,
          message: 'שגיאה בעדכון חלק מהפריטים',
          severity: 'error'
        });
        return;
      }

      setAlert({
        open: true,
        message: `${selectedItems.length} פריטים עודכנו בהצלחה`,
        severity: 'success'
      });

      // איפוס הבחירה
      setSelectedItems([]);
      setSelectAllVisible(false);
      handleCloseBulkEdit();
      fetchEquipment();
    } catch (error) {
      console.error('Error in bulk edit:', error);
      setAlert({
        open: true,
        message: 'שגיאה בעדכון הפריטים',
        severity: 'error'
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!multipleItems && (!newItem.item_name || newItem.item_name.trim() === '')) {
      errors.item_name = 'שם הפריט נדרש';
    }
    if (!newItem.borrower_name || newItem.borrower_name.trim() === '') {
      errors.borrower_name = 'שם השואל נדרש';
    }
    if (!newItem.staff_member || newItem.staff_member.trim() === '') {
      errors.staff_member = 'שם איש הצוות נדרש';
    }
    if (!newItem.checkout_date) {
      errors.checkout_date = 'תאריך משיכה נדרש';
    }
    if (multipleItems) {
      const validItems = itemsList.filter(item => item.name.trim() !== '');
      if (validItems.length === 0) {
        errors.items = 'יש להזין לפחות פריט אחד';
      }
    }
    return errors;
  };

  const toggleEventExpand = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          מעקב ציוד
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedItems.length > 0 && (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpenBulkEdit}
                startIcon={<EditIcon />}
              >
                עריכה מרובה ({selectedItems.length})
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleDeselectAll}
              >
                בטל בחירה
              </Button>
            </>
          )}
          {selectAllVisible && selectedItems.length === 0 && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => handleSelectAll()}
            >
              סמן הכל
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenDialog}
            startIcon={<AddIcon />}
          >
            הוסף פריט
          </Button>
          <ExportButtons
            data={equipment}
            filename="equipment_tracking"
            sheetName="ציוד"
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
              <TableCell padding="checkbox" sx={{ width: '48px' }}>
                בחירה
              </TableCell>
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
                  <TableCell padding="checkbox">
                    {expandedEvents[group.id] && (
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAll(group.id);
                        }}
                        title="סמן את כל הפריטים בקבוצה זו"
                      >
                        <CheckBoxOutlineBlankIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
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
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                      />
                    </TableCell>
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

            <TextField
              label="אירוע"
              fullWidth
              value={newItem.event_name}
              onChange={(e) => setNewItem({ ...newItem, event_name: e.target.value })}
              sx={{ mb: 2 }}
              placeholder="הזן שם אירוע"
            />

            {!newItem.id && (
              <Box sx={{ mb: 2 }}>
                <FormControl component="fieldset">
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Checkbox
                      checked={multipleItems}
                      onChange={(e) => setMultipleItems(e.target.checked)}
                      inputProps={{ 'aria-label': 'הוסף מספר פריטים' }}
                    />
                    <Typography>הוסף מספר פריטים בבת אחת</Typography>
                  </Box>
                </FormControl>
              </Box>
            )}

            {!multipleItems ? (
              <TextField
                label="שם הפריט"
                fullWidth
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                error={!!errors.item_name}
                helperText={errors.item_name}
                sx={{ mb: 2 }}
              />
            ) : (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                  פריטים
                </Typography>
                {itemsList.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <TextField
                      label="שם הפריט"
                      fullWidth
                      value={item.name}
                      onChange={(e) => {
                        const newList = [...itemsList];
                        newList[index].name = e.target.value;
                        setItemsList(newList);
                      }}
                      sx={{ flexGrow: 1 }}
                    />
                    <TextField
                      label="כמות"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newList = [...itemsList];
                        newList[index].quantity = parseInt(e.target.value) || 1;
                        setItemsList(newList);
                      }}
                      InputProps={{ inputProps: { min: 1 } }}
                      sx={{ width: '100px' }}
                    />
                    <IconButton 
                      color="error" 
                      onClick={() => {
                        if (itemsList.length > 1) {
                          const newList = [...itemsList];
                          newList.splice(index, 1);
                          setItemsList(newList);
                        }
                      }}
                      disabled={itemsList.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setItemsList([...itemsList, { name: '', quantity: 1 }])}
                  sx={{ mt: 1 }}
                >
                  הוסף פריט נוסף
                </Button>
                {errors.items && (
                  <Typography color="error" variant="caption" display="block" sx={{ mt: 1 }}>
                    {errors.items}
                  </Typography>
                )}
              </Box>
            )}

            {!multipleItems && (
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
            )}

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

      {/* דיאלוג עריכה מרובה */}
      <Dialog open={bulkEditOpen} onClose={handleCloseBulkEdit} maxWidth="sm" fullWidth>
        <DialogTitle>עריכה מרובה של {selectedItems.length} פריטים</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="bulk-event-label">אירוע</InputLabel>
              <Select
                labelId="bulk-event-label"
                value={bulkEditEvent}
                onChange={(e) => setBulkEditEvent(e.target.value)}
                label="אירוע"
              >
                <MenuItem value="">בחר אירוע</MenuItem>
                <MenuItem value="new" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  הוסף אירוע חדש...
                </MenuItem>
              </Select>
            </FormControl>

            {bulkEditEvent === 'new' && (
              <TextField
                label="שם האירוע החדש"
                fullWidth
                value={bulkEditNewEventName}
                onChange={(e) => setBulkEditNewEventName(e.target.value)}
                sx={{ mb: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBulkEdit}>ביטול</Button>
          <Button onClick={handleSaveBulkEdit} variant="contained">
            שמור
          </Button>
        </DialogActions>
      </Dialog>

      {/* דיאלוג אישור מחיקה */}
      <Snackbar
        open={deleteConfirmOpen}
        autoHideDuration={10000}
        onClose={() => setDeleteConfirmOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="warning" 
          action={
            <Box>
              <Button color="inherit" size="small" onClick={() => handleDeleteConfirm(false)}>
                לא
              </Button>
              <Button color="inherit" size="small" onClick={() => handleDeleteConfirm(true)}>
                כן
              </Button>
            </Box>
          }
        >
          האם למחוק את הפריט?
        </Alert>
      </Snackbar>

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
