import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  CssBaseline,
  Tab,
  Tabs,
  Typography,
  ThemeProvider,
  useMediaQuery,
  Button
} from '@mui/material';
import { createTheme } from '@mui/material/styles';
import TaskList from './components/TaskList';
import SimpleCalendar from './components/SimpleCalendar';
import DepartmentEvents from './components/DepartmentEvents';
import EducationDates from './components/EducationDates';
import FormsLibrary from './components/FormsLibrary';
import InventoryList from './components/InventoryList';
import EquipmentTracker from './components/EquipmentTracker';
import Login from './components/Login';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import { supabase } from './supabaseClient';

// Create rtl cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// Create theme instance
const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: 'Assistant, Arial, sans-serif',
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          direction: 'rtl',
        },
      },
    },
  },
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // בדיקת משתמש מחובר
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    checkUser();

    // האזנה לשינויים במצב ההתחברות
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*');
        
        if (tasksError) throw tasksError;
        setTasks(tasksData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [user]);

  const handleLogin = (user) => {
    setUser(user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (!user) {
    return (
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
          <Login onLogin={handleLogin} />
        </ThemeProvider>
      </CacheProvider>
    );
  }

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <Box sx={{
          minHeight: '100vh',
          backgroundColor: '#f5f5f5'
        }}>
          <Container maxWidth="lg">
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              width: '100%',
              mb: 2,
              mt: 1,
              px: 2
            }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => handleLogout()}
                sx={{
                  minWidth: 'auto',
                  px: 2
                }}
              >
                התנתק
              </Button>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1
              }}>
                <img 
                  src="/images/logo.png" 
                  alt="לוגו מתנס" 
                  style={{ 
                    height: '100px',
                    width: 'auto',
                    margin: '15px 0'
                  }} 
                />
              </Box>
              <Box sx={{ minWidth: '64px' }} /> {/* שומר על איזון */}
            </Box>

            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}>
              <Box sx={{
                width: '100%',
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1,
                display: 'flex',
                justifyContent: 'center'
              }}>
                <Tabs
                  orientation="horizontal"
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  value={currentTab}
                  onChange={handleTabChange}
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    maxWidth: 'md',
                    '& .MuiTab-root': {
                      fontSize: '1rem',
                      py: 2,
                      px: 3,
                      minHeight: '48px',
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        color: 'primary.main',
                        fontWeight: 'medium'
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: 'primary.main'
                    },
                    '& .MuiTabs-flexContainer': {
                      justifyContent: 'center'
                    }
                  }}
                >
                  <Tab label="משימות" {...a11yProps(0)} />
                  <Tab label="יומן" {...a11yProps(1)} />
                  <Tab label="אירועי מחלקה" {...a11yProps(2)} />
                  <Tab label="חופשות וחגים" {...a11yProps(3)} />
                  <Tab label="אישורים וטפסים" {...a11yProps(4)} />
                  <Tab label="מלאי והזמנות" {...a11yProps(5)} />
                  <Tab label="מעקב ציוד" {...a11yProps(6)} />
                </Tabs>
              </Box>

              <Box sx={{ flex: 1 }}>
                <TabPanel value={currentTab} index={0}>
                  <TaskList tasks={tasks} />
                </TabPanel>
                <TabPanel value={currentTab} index={1}>
                  <SimpleCalendar />
                </TabPanel>
                <TabPanel value={currentTab} index={2}>
                  <DepartmentEvents />
                </TabPanel>
                <TabPanel value={currentTab} index={3}>
                  <EducationDates />
                </TabPanel>
                <TabPanel value={currentTab} index={4}>
                  <FormsLibrary />
                </TabPanel>
                <TabPanel value={currentTab} index={5}>
                  <InventoryList />
                </TabPanel>
                <TabPanel value={currentTab} index={6}>
                  <EquipmentTracker />
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
