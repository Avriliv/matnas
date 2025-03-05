import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  CssBaseline,
  Tabs,
  Tab,
  ThemeProvider,
  useMediaQuery
} from '@mui/material';
import { createTheme } from '@mui/material/styles';
import TaskList from './components/TaskList';
import InventoryList from './components/InventoryList';
import EquipmentTracker from './components/EquipmentTracker';
import SimpleCalendar from './components/SimpleCalendar';
import DepartmentEvents from './components/DepartmentEvents';
import EducationDates from './components/EducationDates';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { checkUpcomingItems, requestNotificationPermission } from './services/notificationService';
import { supabase } from './supabaseClient';

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
  palette: {
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [departmentEvents, setDepartmentEvents] = useState([]);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // בקשת אישור להתראות
    const setupNotifications = async () => {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        console.log('אישור להתראות התקבל');
      }
    };

    setupNotifications();
  }, []);

  useEffect(() => {
    // טעינת משימות ואירועים
    const fetchData = async () => {
      try {
        // טעינת משימות
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*');
        
        if (tasksError) throw tasksError;
        setTasks(tasksData || []);

        // טעינת אירועים
        const { data: eventsData, error: eventsError } = await supabase
          .from('department_events')
          .select('*');
        
        if (eventsError) throw eventsError;
        setDepartmentEvents(eventsData || []);

        // בדיקה מיידית של אירועים ומשימות קרובים
        setTimeout(() => {
          checkUpcomingItems(tasksData || [], eventsData || []);
        }, 2000); // מחכים 2 שניות כדי לתת לממשק להיטען קודם
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // בדיקת משימות ואירועים קרובים בכל בוקר בשעה 8:00
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const timeUntilCheck = tomorrow - now;
    
    const checkNotifications = () => {
      const currentHour = new Date().getHours();
      if (currentHour === 8) {
        checkUpcomingItems(tasks, departmentEvents);
      }
    };

    // הפעלה ראשונית
    const initialTimeout = setTimeout(() => {
      checkNotifications();
      // הפעלה כל 24 שעות
      setInterval(checkNotifications, 24 * 60 * 60 * 1000);
    }, timeUntilCheck);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, [tasks, departmentEvents]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ 
          minHeight: '100vh',
          backgroundColor: '#f5f5f5'
        }}>
          <Container maxWidth={false}>
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              p: isMobile ? 1 : 2
            }}>
              {/* לוגו */}
              <Box 
                sx={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 2,
                  mt: 1,
                  '& img': {
                    maxWidth: isMobile ? '80%' : '300px',
                    height: 'auto'
                  }
                }}
              >
                <img src="/logo.png" alt="לוגו המתנ״ס" />
              </Box>

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
                  <Tab label="מעקב ציוד" />
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
                    <SimpleCalendar />
                  </TabPanel>
                  <TabPanel value={currentTab} index={4}>
                    <DepartmentEvents />
                  </TabPanel>
                  <TabPanel value={currentTab} index={5}>
                    <EducationDates />
                  </TabPanel>
                </Box>
              </Box>
            </Box>
          </Container>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            style={{
              zIndex: 9999,
              fontSize: '1rem',
              fontFamily: 'Rubik, sans-serif'
            }}
            toastStyle={{
              backgroundColor: '#fff',
              color: '#333',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              padding: '16px',
              minHeight: '64px'
            }}
          />
        </Box>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default App;
