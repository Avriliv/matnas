import React, { useState } from 'react';
import {
  Box,
  Container,
  CssBaseline,
  Tabs,
  Tab,
  ThemeProvider,
  createTheme,
  useMediaQuery
} from '@mui/material';
import TaskList from './components/TaskList';
import InventoryList from './components/InventoryList';
import EquipmentTracker from './components/EquipmentTracker';
import Calendar from './components/Calendar';
import DepartmentEvents from './components/DepartmentEvents';
import EducationDates from './components/EducationDates';
import { createTheme } from '@mui/material/styles';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';

// Create rtl cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: 'Assistant, Arial, sans-serif',
  },
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ height: '100%', overflow: 'auto' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}>
          <Container maxWidth={false} sx={{ 
            flex: 1, 
            display: 'flex',
            flexDirection: 'column',
            p: isMobile ? 1 : 2
          }}>
            <Box sx={{ 
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              bgcolor: 'white',
              borderRadius: 1,
              overflow: 'hidden',
              flex: 1,
              mt: 1
            }}>
              <Tabs
                orientation={isMobile ? "horizontal" : "vertical"}
                variant="scrollable"
                value={currentTab}
                onChange={handleTabChange}
                sx={{
                  borderRight: isMobile ? 0 : 1,
                  borderBottom: isMobile ? 1 : 0,
                  borderColor: 'divider',
                  minHeight: isMobile ? 'auto' : undefined,
                  '& .MuiTab-root': {
                    minWidth: isMobile ? 'auto' : 130,
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    py: isMobile ? 1 : 2
                  }
                }}
              >
                <Tab label="משימות" />
                <Tab label="מלאי והזמנות" />
                <Tab label="ציוד" />
                <Tab label="לוח שנה" />
                <Tab label="אירועי מחלקה" />
                <Tab label="חופשות וחגים" />
              </Tabs>
              <Box sx={{ 
                flex: 1,
                overflow: 'auto',
                height: isMobile ? 'calc(100vh - 120px)' : 'auto'
              }}>
                <TabPanel value={currentTab} index={0}>
                  <TaskList />
                </TabPanel>
                <TabPanel value={currentTab} index={1}>
                  <InventoryList />
                </TabPanel>
                <TabPanel value={currentTab} index={2}>
                  <EquipmentTracker />
                </TabPanel>
                <TabPanel value={currentTab} index={3}>
                  <Calendar />
                </TabPanel>
                <TabPanel value={currentTab} index={4}>
                  <DepartmentEvents />
                </TabPanel>
                <TabPanel value={currentTab} index={5}>
                  <EducationDates />
                </TabPanel>
              </Box>
            </Box>
          </Container>
        </Box>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default App;
