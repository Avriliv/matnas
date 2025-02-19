import React, { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/he'; // Hebrew locale
import { Paper } from '@mui/material';

function SimpleCalendar() {
  const [value, setValue] = useState(dayjs());

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="he">
        <DateCalendar
          value={value}
          onChange={(newValue) => setValue(newValue)}
          showDaysOutsideCurrentMonth
          sx={{
            transform: 'scale(1.2)',
            transformOrigin: 'top center'
          }}
        />
      </LocalizationProvider>
    </Paper>
  );
}

export default SimpleCalendar;
