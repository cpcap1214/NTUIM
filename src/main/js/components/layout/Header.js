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
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  RateReview as ReviewIcon,
  Quiz as QuizIcon,
  Description as DescriptionIcon,
  Info as InfoIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import NavigationTabs from './NavigationTabs';
import { APP_CONFIG, NAVIGATION_ITEMS } from '../../../resources/config/constants';
import { useAuth } from '../../contexts/AuthContext';

const iconMap = {
  home: HomeIcon,
  rate_review: ReviewIcon,
  quiz: QuizIcon,
  description: DescriptionIcon,
  info: InfoIcon,
};

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isAdmin } = useAuth();

  // 管理員導航項目
  const adminNavItems = [
    {
      id: 'admin-panel',
      label: '用戶管理',
      path: '/admin',
      icon: AdminIcon,
    },
    {
      id: 'admin-upload',
      label: '上傳資源',
      path: '/admin/upload',
      icon: UploadIcon,
    },
    {
      id: 'admin-exam-manage',
      label: '考古題管理',
      path: '/admin/exam-manage',
      icon: SchoolIcon,
    },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMobileNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
    navigate('/');
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
        
        {/* 管理員選項 */}
        {isAdmin && (
          <>
            <Box sx={{ my: 1, mx: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                管理員功能
              </Typography>
            </Box>
            {adminNavItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    onClick={() => handleMobileNavigation(item.path)}
                    selected={isActive}
                    sx={{
                      mx: 1,
                      borderRadius: 1,
                      backgroundColor: isActive ? 'secondary.light' : 'transparent',
                      '&.Mui-selected': {
                        backgroundColor: 'secondary.light',
                        '&:hover': {
                          backgroundColor: 'secondary.light',
                        },
                      },
                    }}
                  >
                    <ListItemIcon>
                      <IconComponent 
                        color={isActive ? 'secondary' : 'inherit'} 
                        sx={{ fontSize: 20 }}
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'secondary.main' : 'text.primary',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </>
        )}
      </List>
      
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          fullWidth
          size="medium"
          onClick={() => {
            window.open('https://forms.gle/5ckpNSH74FhXBugM8', '_blank');
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
                onClick={() => window.open('https://forms.gle/5ckpNSH74FhXBugM8', '_blank')}
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
              
              {isAuthenticated ? (
                <>
                  <IconButton
                    onClick={handleUserMenuOpen}
                    sx={{ p: 0.5 }}
                  >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {user?.username?.charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleUserMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    <MenuItem disabled>
                      <Typography variant="body2">
                        {user?.fullName || user?.username}
                      </Typography>
                    </MenuItem>
                    <MenuItem disabled>
                      <Typography variant="caption" color="textSecondary">
                        {user?.hasPaidFee ? '已繳會費' : '未繳會費'}
                      </Typography>
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>
                      <ListItemIcon>
                        <LogoutIcon fontSize="small" />
                      </ListItemIcon>
                      登出
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<LoginIcon />}
                  onClick={() => navigate('/login')}
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
                  登入/註冊
                </Button>
              )}
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