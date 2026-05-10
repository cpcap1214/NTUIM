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
  Divider,
  Chip,
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
  School as SchoolIcon,
  OpenInNew as OpenInNewIcon,
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

const GOOGLE_SPACE_URL = 'https://forms.gle/5ckpNSH74FhXBugM8';

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isAdmin } = useAuth();

  const adminNavItems = [
    { id: 'admin-panel', label: '用戶管理', path: '/admin', icon: AdminIcon },
    { id: 'admin-upload', label: '上傳資源', path: '/admin/upload', icon: UploadIcon },
    { id: 'admin-exam-manage', label: '考古題管理', path: '/admin/exam-manage', icon: SchoolIcon },
    { id: 'admin-cheatsheet-manage', label: '大抄管理', path: '/admin/cheatsheet-manage', icon: DescriptionIcon },
  ];

  const handleDrawerToggle = () => setMobileOpen((v) => !v);
  const handleMobileNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };
  const handleUserMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleUserMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    logout();
    handleUserMenuClose();
    navigate('/');
  };

  const drawer = (
    <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {APP_CONFIG.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {APP_CONFIG.englishName}
        </Typography>
      </Box>
      <Divider />

      <List sx={{ px: 1, py: 1.5, flexGrow: 1 }}>
        {NAVIGATION_ITEMS.map((item) => {
          const IconComponent = iconMap[item.icon];
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleMobileNavigation(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: 1.5,
                  py: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { backgroundColor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                  <IconComponent sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: isActive ? 600 : 500, fontSize: '0.9rem' }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}

        {isAdmin && (
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 1.5, mt: 2, mb: 0.5, display: 'block', fontWeight: 600, letterSpacing: '0.04em' }}
            >
              管理員功能
            </Typography>
            {adminNavItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleMobileNavigation(item.path)}
                    selected={isActive}
                    sx={{
                      borderRadius: 1.5,
                      py: 1,
                      '&.Mui-selected': {
                        backgroundColor: 'grey.100',
                        '&:hover': { backgroundColor: 'grey.200' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <IconComponent sx={{ fontSize: 20, color: isActive ? 'secondary.main' : 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.875rem',
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

      <Divider />
      <Box sx={{ p: 2 }}>
        {isAuthenticated ? (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                p: 1.25,
                mb: 1.5,
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
              }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {user?.fullName || user?.username}
                </Typography>
                <Chip
                  size="small"
                  label={user?.hasPaidFee ? '已繳會費' : '未繳會費'}
                  color={user?.hasPaidFee ? 'success' : 'default'}
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.7rem' }}
                />
              </Box>
            </Box>
            <Button
              variant="outlined"
              fullWidth
              size="small"
              startIcon={<LogoutIcon />}
              onClick={() => {
                handleLogout();
                setMobileOpen(false);
              }}
            >
              登出
            </Button>
          </Box>
        ) : (
          <Button
            variant="contained"
            fullWidth
            startIcon={<LoginIcon />}
            onClick={() => {
              navigate('/login');
              setMobileOpen(false);
            }}
            sx={{ mb: 1 }}
          >
            登入 / 註冊
          </Button>
        )}

        <Button
          variant="outlined"
          fullWidth
          size="small"
          endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
          onClick={() => {
            window.open(GOOGLE_SPACE_URL, '_blank');
            setMobileOpen(false);
          }}
          sx={{ mt: 1 }}
        >
          資管系 Google Space
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky">
        <Toolbar
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            width: '100%',
            px: { xs: 2, sm: 3, md: 4 },
            minHeight: { xs: 60, md: 64 },
            gap: 2,
          }}
        >
          {isMobile && (
            <IconButton
              edge="start"
              aria-label="開啟選單"
              onClick={handleDrawerToggle}
              sx={{ color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              minWidth: 0,
              mr: { md: 2 },
            }}
            onClick={() => navigate('/')}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1.2 }}
              noWrap
            >
              {APP_CONFIG.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.2 }}
              noWrap
            >
              {APP_CONFIG.englishName}
            </Typography>
          </Box>

          {!isMobile && (
            <>
              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                <NavigationTabs />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  onClick={() => window.open(GOOGLE_SPACE_URL, '_blank')}
                  sx={{ display: { xs: 'none', lg: 'inline-flex' } }}
                >
                  Google Space
                </Button>

                {isAuthenticated ? (
                  <>
                    <IconButton onClick={handleUserMenuOpen} sx={{ p: 0.5 }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                        {user?.username?.charAt(0).toUpperCase()}
                      </Avatar>
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl)}
                      onClose={handleUserMenuClose}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                      PaperProps={{
                        elevation: 0,
                        sx: {
                          mt: 1,
                          minWidth: 220,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1.5,
                          boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
                        },
                      }}
                    >
                      <Box sx={{ px: 2, py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {user?.fullName || user?.username}
                        </Typography>
                        <Chip
                          size="small"
                          label={user?.hasPaidFee ? '已繳會費' : '未繳會費'}
                          color={user?.hasPaidFee ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                      <Divider />
                      <MenuItem onClick={handleLogout} sx={{ mt: 0.5 }}>
                        <ListItemIcon>
                          <LogoutIcon fontSize="small" />
                        </ListItemIcon>
                        <Typography variant="body2">登出</Typography>
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<LoginIcon />}
                    onClick={() => navigate('/login')}
                  >
                    登入
                  </Button>
                )}
              </Box>
            </>
          )}

          {isMobile && !isAuthenticated && (
            <Box sx={{ ml: 'auto' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<LoginIcon />}
                onClick={() => navigate('/login')}
              >
                登入
              </Button>
            </Box>
          )}
          {isMobile && isAuthenticated && (
            <IconButton onClick={handleUserMenuOpen} sx={{ ml: 'auto', p: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280,
              border: 'none',
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
