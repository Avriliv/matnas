import React, { useState } from 'react';
import { 
  CssBaseline, 
  Container, 
  Box, 
  Tabs, 
  Tab, 
  ThemeProvider, 
  createTheme 
} from '@mui/material';
import TaskList from './components/TaskList';
import InventoryList from './components/InventoryList';
import EquipmentTracker from './components/EquipmentTracker';
import SimpleCalendar from './components/SimpleCalendar';
import DepartmentEvents from './components/DepartmentEvents';
import EducationDates from './components/EducationDates';

// יצירת ערכת נושא בהירה ונקייה
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      'Rubik',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="lg">
          <Box sx={{ width: '100%', bgcolor: 'white', mt: 2, borderRadius: 1 }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              centered
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="משימות" />
              <Tab label="מלאי והזמנות" />
              <Tab label="ציוד" />
              <Tab label="לוח שנה" />
              <Tab label="אירועי מחלקה" />
              <Tab label="חופשות וחגים" />
            </Tabs>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            {currentTab === 0 && <TaskList />}
            {currentTab === 1 && <InventoryList />}
            {currentTab === 2 && <EquipmentTracker />}
            {currentTab === 3 && <SimpleCalendar />}
            {currentTab === 4 && <DepartmentEvents />}
            {currentTab === 5 && <EducationDates />}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
