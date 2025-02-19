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
        title: 'חופשת קיץ',
        start_date: '2024-07-01',
        end_date: '2024-08-31',
        return_date: '2024-09-01',
        type: 'חופשה'
      },
      {
        id: 2,
        title: 'היערכות והכנה לשנת הלימודים',
        start_date: '2024-09-01',
        end_date: '2024-09-01',
        type: 'אחר'
      },
      {
        id: 3,
        title: 'ראש השנה',
        start_date: '2024-10-02',
        end_date: '2024-10-04',
        return_date: '2024-10-05',
        type: 'חג'
      },
      {
        id: 4,
        title: 'יום כיפור',
        start_date: '2024-10-11',
        end_date: '2024-10-12',
        return_date: '2024-10-13',
        type: 'חג'
      },
      {
        id: 5,
        title: 'סוכות',
        start_date: '2024-10-16',
        end_date: '2024-10-18',
        return_date: '2024-10-19',
        type: 'חג'
      },
      {
        id: 6,
        title: 'חופשת סוכות',
        start_date: '2024-10-19',
        end_date: '2024-10-25',
        return_date: '2024-10-26',
        type: 'חופשה'
      },
      {
        id: 7,
        title: 'חנוכה',
        start_date: '2024-12-25',
        end_date: '2025-01-02',
        return_date: '2025-01-03',
        type: 'חג'
      },
      {
        id: 8,
        title: 'ט"ו בשבט',
        start_date: '2025-01-25',
        end_date: '2025-01-25',
        type: 'חג'
      },
      {
        id: 9,
        title: 'תענית אסתר',
        start_date: '2025-03-13',
        end_date: '2025-03-13',
        type: 'חג'
      },
      {
        id: 10,
        title: 'פורים',
        start_date: '2025-03-14',
        end_date: '2025-03-14',
        return_date: '2025-03-15',
        type: 'חג'
      },
      {
        id: 11,
        title: 'שושן פורים',
        start_date: '2025-03-15',
        end_date: '2025-03-15',
        type: 'חג'
      },
      {
        id: 12,
        title: 'חופשת פסח',
        start_date: '2025-04-12',
        end_date: '2025-04-19',
        return_date: '2025-04-20',
        type: 'חופשה'
      },
      {
        id: 13,
        title: 'יום הזיכרון לשואה ולגבורה',
        start_date: '2025-04-28',
        end_date: '2025-04-28',
        type: 'אחר'
      },
      {
        id: 14,
        title: 'יום הזיכרון לחללי מערכות ישראל',
        start_date: '2025-05-01',
        end_date: '2025-05-01',
        type: 'אחר'
      },
      {
        id: 15,
        title: 'יום העצמאות',
        start_date: '2025-05-02',
        end_date: '2025-05-02',
        return_date: '2025-05-03',
        type: 'חג'
      },
      {
        id: 16,
        title: "ל''ג בעומר",
        start_date: '2025-05-18',
        end_date: '2025-05-18',
        type: 'חג'
      },
      {
        id: 17,
        title: 'יום ירושלים',
        start_date: '2025-05-28',
        end_date: '2025-05-28',
        type: 'אחר'
      },
      {
        id: 18,
        title: 'שבועות',
        start_date: '2025-06-01',
        end_date: '2025-06-01',
        return_date: '2025-06-02',
        type: 'חג'
      },
      {
        id: 19,
        title: 'סיום שנת הלימודים',
        start_date: '2025-06-20',
        end_date: '2025-08-31',
        return_date: '2025-09-01',
        type: 'חופשה'
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
