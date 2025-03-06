import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  Alert,
  Snackbar,
  Chip
} from '@mui/material';

function EducationDates() {
  const [holidays, setHolidays] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    // נטען את כל החופשות ישירות בקומפוננטה
    const holidays = [
      {
        id: 1,
        title: 'ראש השנה',
        start_date: '2024-10-02',
        end_date: '2024-10-04',
        return_date: '2024-10-06',
        type: 'חג'
      },
      {
        id: 2,
        title: 'יום כיפור',
        start_date: '2024-10-11',
        end_date: '2024-10-12',
        return_date: '2024-10-13',
        type: 'חג'
      },
      {
        id: 3,
        title: 'חופשת סוכות',
        start_date: '2024-10-13',
        end_date: '2024-10-24',
        return_date: '2024-10-25',
        type: 'חופשה'
      },
      {
        id: 4,
        title: 'חנוכה',
        start_date: '2024-12-27',
        end_date: '2025-01-02',
        return_date: '2025-01-03',
        type: 'חג'
      },
      {
        id: 5,
        title: 'פורים',
        start_date: '2025-03-14',
        end_date: '2025-03-16',
        return_date: '2025-03-17',
        type: 'חג'
      },
      {
        id: 6,
        title: 'חופשת פסח',
        start_date: '2025-04-04',
        end_date: '2025-04-19',
        return_date: '2025-04-20',
        type: 'חופשה'
      },
      {
        id: 7,
        title: 'יום העצמאות',
        start_date: '2025-05-01',
        end_date: '2025-05-01',
        return_date: '2025-05-02',
        type: 'חג'
      },
      {
        id: 8,
        title: 'שבועות',
        start_date: '2025-06-01',
        end_date: '2025-06-02',
        return_date: '2025-06-03',
        type: 'חג'
      },
      {
        id: 9,
        title: 'סיום שנת הלימודים - חטיבות ביניים ובתי ספר על-יסודיים (5 ימי לימוד)',
        start_date: '2025-06-19',
        end_date: '2025-06-19',
        type: 'סיום לימודים'
      },
      {
        id: 10,
        title: 'סיום שנת הלימודים - חטיבות ביניים ובתי ספר על-יסודיים (6 ימי לימוד)',
        start_date: '2025-06-20',
        end_date: '2025-06-20',
        type: 'סיום לימודים'
      },
      {
        id: 11,
        title: 'סיום שנת הלימודים - גני ילדים ובתי ספר יסודיים',
        start_date: '2025-06-30',
        end_date: '2025-06-30',
        type: 'סיום לימודים'
      }
    ];
    setHolidays(holidays);
  }, []);

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const formatDateRange = (startDate, endDate, returnDate) => {
    const start = new Date(startDate).toLocaleDateString('he-IL');
    const end = endDate ? new Date(endDate).toLocaleDateString('he-IL') : null;
    const back = returnDate ? new Date(returnDate).toLocaleDateString('he-IL') : null;
    
    return (
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          {end ? `${start} - ${end}` : start}
        </Typography>
        {back && (
          <Typography variant="body2" color="success.main">
            {`חזרה ללימודים: ${back}`}
          </Typography>
        )}
      </Stack>
    );
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">לוח חופשות וחגים - תשפ"ה</Typography>
        </Box>

        <List>
          {holidays.map((holiday, index) => (
            <React.Fragment key={holiday.id}>
              {index > 0 && <Divider />}
              <ListItem>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{holiday.title}</Typography>
                      <Chip 
                        label={holiday.type}
                        size="small"
                        color={
                          holiday.type === 'חג' ? 'primary' : 
                          holiday.type === 'חופשה' ? 'secondary' : 
                          'default'
                        }
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={formatDateRange(holiday.start_date, holiday.end_date, holiday.return_date)}
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Paper>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default EducationDates;
