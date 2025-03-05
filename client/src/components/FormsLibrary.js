import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Grid,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  CreateNewFolder as CreateNewFolderIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

const FormsLibrary = () => {
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [openPreview, setOpenPreview] = useState(false);

  // טעינת תיקיות
  useEffect(() => {
    loadFolders();
  }, []);

  // טעינת קבצים כשבוחרים תיקייה
  useEffect(() => {
    if (currentFolder) {
      loadFiles(currentFolder.id);
    }
  }, [currentFolder]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('form_folders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (folderId) => {
    try {
      setLoading(true);
      console.log('Loading files for folder:', folderId);

      // טעינת המטא-דאטה מהטבלה
      const { data: fileMetadata, error: metadataError } = await supabase
        .from('form_files')
        .select('*')
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false });

      if (metadataError) {
        console.error('Error loading file metadata:', metadataError);
        throw metadataError;
      }

      console.log('Files loaded:', fileMetadata);
      setFiles(fileMetadata || []);
    } catch (error) {
      console.error('Error loading files:', error);
      alert('שגיאה בטעינת הקבצים: ' + (error.message || error.error_description || 'שגיאה לא ידועה'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('form_folders')
        .insert([{ name: newFolderName }])
        .select();

      if (error) throw error;

      setFolders([...folders, data[0]]);
      setNewFolderDialog(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = (folder, event) => {
    event.stopPropagation();
    setFolderToDelete(folder);
    setDeleteConfirmDialog(true);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      setLoading(true);
      
      // מחיקת כל הקבצים בתיקייה
      const { data: files } = await supabase.storage
        .from('forms')
        .list(folderToDelete.id.toString());

      if (files?.length > 0) {
        const filePaths = files.map(file => `${folderToDelete.id}/${file.name}`);
        const { error: deleteFilesError } = await supabase.storage
          .from('forms')
          .remove(filePaths);

        if (deleteFilesError) throw deleteFilesError;
      }

      // מחיקת התיקייה עצמה
      const { error: deleteFolderError } = await supabase
        .from('form_folders')
        .delete()
        .eq('id', folderToDelete.id);

      if (deleteFolderError) throw deleteFolderError;

      loadFolders();
      setFolderToDelete(null);
      setDeleteConfirmDialog(false);
      setCurrentFolder(null);
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('שגיאה במחיקת התיקייה: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file || !currentFolder) return;
    
    setFileToUpload(file);
    event.target.value = '';
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !currentFolder) return;

    try {
      setLoading(true);
      console.log('Starting file upload process');
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // המרת שם הקובץ לאנגלית
      const timestamp = new Date().getTime();
      const fileExtension = file.name.split('.').pop();
      const safeFileName = `file_${timestamp}.${fileExtension}`;
      
      const filePath = `${currentFolder.id}/${safeFileName}`;
      console.log('Uploading file to path:', filePath);
      
      const { data, error: uploadError } = await supabase.storage
        .from('forms')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message || 'שגיאה בהעלאת הקובץ');
      }

      // שמירת המידע על הקובץ בטבלה
      const { error: metadataError } = await supabase
        .from('form_files')
        .insert({
          folder_id: currentFolder.id,
          storage_path: filePath,
          original_name: file.name,
          display_name: file.name,
          size: file.size,
          type: file.type
        });

      if (metadataError) {
        console.error('Metadata error:', metadataError);
        // מחיקת הקובץ אם נכשלה שמירת המטא-דאטה
        await supabase.storage.from('forms').remove([filePath]);
        throw new Error('שגיאה בשמירת מידע הקובץ');
      }

      console.log('File uploaded successfully');
      await loadFiles(currentFolder.id);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('שגיאה בהעלאת הקובץ: ' + (error.message || error.error_description || 'שגיאה לא ידועה'));
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (fileName) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('forms')
        .download(`${currentFolder.id}/${fileName}`);

      if (error) throw error;

      // יצירת קישור להורדה
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('שגיאה בהורדת הקובץ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (fileName) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('forms')
        .download(`${currentFolder.id}/${fileName}`);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
        };
      } else {
        alert('אנא אפשר חלונות קופצים בדפדפן כדי להדפיס');
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error printing file:', error);
      alert('שגיאה בהדפסת הקובץ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (fileName) => {
    try {
      setLoading(true);
      const { data: { signedUrl }, error } = await supabase.storage
        .from('forms')
        .createSignedUrl(`${currentFolder.id}/${fileName}`, 24 * 60 * 60);

      if (error) throw error;

      await navigator.clipboard.writeText(signedUrl);
      alert('הקישור הועתק ללוח! הקישור יהיה תקף ל-24 שעות.');
    } catch (error) {
      console.error('Error sharing file:', error);
      alert('שגיאה בשיתוף הקובץ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileName) => {
    try {
      setLoading(true);
      
      // מחיקת הקובץ מהאחסון
      const { error: storageError } = await supabase.storage
        .from('forms')
        .remove([`${currentFolder.id}/${fileName}`]);

      if (storageError) throw storageError;

      // מחיקת המטא-דאטה מהטבלה
      const { error: metadataError } = await supabase
        .from('form_files')
        .delete()
        .eq('storage_path', `${currentFolder.id}/${fileName}`);

      if (metadataError) throw metadataError;

      await loadFiles(currentFolder.id);
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('שגיאה במחיקת הקובץ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (fileName) => {
    try {
      setLoading(true);
      const { data: { signedUrl }, error } = await supabase.storage
        .from('forms')
        .createSignedUrl(`${currentFolder.id}/${fileName}`, 3600); // URL תקף לשעה

      if (error) throw error;

      // פתיחת הקובץ בחלון חדש במקום בדיאלוג
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Error creating preview URL:', error);
      alert('שגיאה ביצירת תצוגה מקדימה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* כותרת וכפתור יצירת תיקייה */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>אישורים וטפסים</Typography>
        <Button
          startIcon={<CreateNewFolderIcon />}
          variant="contained"
          onClick={() => setNewFolderDialog(true)}
          disabled={loading}
        >
          תיקייה חדשה
        </Button>
      </Box>

      {/* לואדר */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* תצוגת תיקיות */}
      {!currentFolder && (
        <Grid container spacing={3}>
          {folders.map((folder) => (
            <Grid item xs={12} sm={6} md={4} key={folder.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    bgcolor: 'action.hover',
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s'
                  },
                  height: '100%'
                }}
                onClick={() => setCurrentFolder(folder)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FolderIcon sx={{ mr: 1, color: 'primary.main', fontSize: 40 }} />
                      <Box>
                        <Typography variant="h6">{folder.name}</Typography>
                      </Box>
                    </Box>
                    <IconButton 
                      onClick={(e) => handleDeleteFolder(folder, e)}
                      disabled={loading}
                      sx={{ 
                        color: 'error.main',
                        '&:hover': { 
                          bgcolor: 'error.light',
                          color: 'white'
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* תצוגת קבצים בתוך תיקייה */}
      {currentFolder && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button 
              startIcon={<ArrowBackIcon />}
              onClick={() => setCurrentFolder(null)}
              disabled={loading}
            >
              חזרה לתיקיות
            </Button>
            <Typography variant="h6" sx={{ flex: 1, ml: 2 }}>{currentFolder.name}</Typography>
            <input
              type="file"
              id="file-upload"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload">
              <Button
                component="span"
                startIcon={<UploadFileIcon />}
                variant="contained"
                disabled={loading}
              >
                העלאת קובץ
              </Button>
            </label>
          </Box>

          <Grid container spacing={2}>
            {files.map((file) => (
              <Grid item xs={12} key={file.storage_path}>
                <Paper 
                  sx={{ 
                    p: 2,
                    '&:hover': { 
                      bgcolor: 'action.hover',
                      transition: 'all 0.2s'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ direction: 'rtl' }}>
                        {file.display_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Math.round(file.size / 1024)} KB
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton 
                        onClick={() => handlePreview(file.storage_path.split('/').pop())}
                        disabled={loading}
                        title="תצוגה מקדימה"
                        sx={{ color: 'primary.main' }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton 
                        onClick={() => handleDownload(file.storage_path.split('/').pop())}
                        disabled={loading}
                        title="הורדה"
                        sx={{ color: 'primary.main' }}
                      >
                        <DownloadIcon />
                      </IconButton>
                      <IconButton 
                        onClick={() => handlePrint(file.storage_path.split('/').pop())}
                        disabled={loading}
                        title="הדפסה"
                        sx={{ color: 'primary.main' }}
                      >
                        <PrintIcon />
                      </IconButton>
                      <IconButton 
                        onClick={() => handleShare(file.storage_path.split('/').pop())}
                        disabled={loading}
                        title="שיתוף"
                        sx={{ color: 'primary.main' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        onClick={() => handleDeleteFile(file.storage_path.split('/').pop())}
                        disabled={loading}
                        title="מחיקה"
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* דיאלוג יצירת תיקייה חדשה */}
      <Dialog 
        open={newFolderDialog} 
        onClose={() => setNewFolderDialog(false)}
        PaperProps={{
          sx: { minWidth: '300px' }
        }}
      >
        <DialogTitle>יצירת תיקייה חדשה</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="שם התיקייה"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFolderDialog(false)}>ביטול</Button>
          <Button 
            onClick={handleCreateFolder} 
            variant="contained"
            disabled={!newFolderName.trim() || loading}
          >
            יצירה
          </Button>
        </DialogActions>
      </Dialog>

      {/* דיאלוג אישור מחיקת תיקייה */}
      <Dialog 
        open={deleteConfirmDialog} 
        onClose={() => setDeleteConfirmDialog(false)}
      >
        <DialogTitle>מחיקת תיקייה</DialogTitle>
        <DialogContent>
          <Typography>
            האם אתה בטוח שברצונך למחוק את התיקייה "{folderToDelete?.name}"?
            <br />
            כל הקבצים בתיקייה ימחקו לצמיתות.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog(false)}>ביטול</Button>
          <Button 
            onClick={confirmDeleteFolder} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            מחיקה
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FormsLibrary;
