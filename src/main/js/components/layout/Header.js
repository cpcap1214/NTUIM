import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  RateReview as ReviewIcon,
  Quiz as QuizIcon,
  Description as DescriptionIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import NavigationTabs from './NavigationTabs';
import { APP_CONFIG, NAVIGATION_ITEMS } from '../../../resources/config/constants';

const iconMap = {
  home: HomeIcon,
  rate_review: ReviewIcon,
  quiz: QuizIcon,
  description: DescriptionIcon,
  info: InfoIcon,
};

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMobileNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <Box sx={{ width: 250, pt: 2 }}>
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {APP_CONFIG.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {APP_CONFIG.englishName}
        </Typography>
      </Box>
      <List>
        {NAVIGATION_ITEMS.map((item) => {
          const IconComponent = iconMap[item.icon];
          const isActive = location.pathname === item.path;
          
          return (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                onClick={() => handleMobileNavigation(item.path)}
                selected={isActive}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    },
                  },
                }}
              >
                <ListItemIcon>
                  <IconComponent 
                    color={isActive ? 'primary' : 'inherit'} 
                    sx={{ fontSize: 20 }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'primary.main' : 'text.primary',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          fullWidth
          size="medium"
          onClick={() => {
            window.open('https://google.com', '_blank');
            setMobileOpen(false);
          }}
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            fontWeight: 600,
            py: 1,
            borderRadius: 2,
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          }}
        >
          註冊資管系 google space  
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'grey.200'
        }}
      >
        <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="開啟選單"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                color: 'primary.main',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/')}
            >
              {APP_CONFIG.name}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              {APP_CONFIG.englishName}
            </Typography>
          </Box>

          {!isMobile && (
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
              <NavigationTabs />
              <Button
                variant="contained"
                size="small"
                onClick={() => window.open('https://google.com', '_blank')}
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'white',
                  fontWeight: 600,
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                註冊資管系 Google space
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 250,
            },
          }}
        >
          {drawer}
        </Drawer>
      )}
    </>
  );
};

export default Header;