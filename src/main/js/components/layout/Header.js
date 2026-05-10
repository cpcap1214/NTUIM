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
  Stack,
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

// Google 四色「G」logo（inline SVG，避免額外圖檔依賴）
const GoogleIcon = ({ size = 16 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width={size}
    height={size}
    aria-hidden="true"
  >
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
    />
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
  </svg>
);

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
          <Stack spacing={1}>
            {/* User card 內含登出 icon，省一個按鈕 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                p: 1.25,
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
              <IconButton
                size="small"
                aria-label="登出"
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                sx={{ color: 'text.secondary' }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Primary action：上傳考古題 */}
            <Button
              variant="contained"
              fullWidth
              size="small"
              startIcon={<UploadIcon />}
              onClick={() => handleMobileNavigation('/upload-exam')}
            >
              上傳考古題
            </Button>
          </Stack>
        ) : (
          <Button
            variant="contained"
            fullWidth
            startIcon={<LoginIcon />}
            onClick={() => {
              navigate('/login');
              setMobileOpen(false);
            }}
          >
            登入 / 註冊
          </Button>
        )}

        {/* Secondary action：Google Workspace（縮短字數避免換行） */}
        <Button
          fullWidth
          size="small"
          startIcon={<GoogleIcon size={16} />}
          endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
          onClick={() => {
            window.open(GOOGLE_SPACE_URL, '_blank');
            setMobileOpen(false);
          }}
          sx={{
            mt: 1.25,
            py: 0.85,
            borderRadius: 1.5,
            fontWeight: 500,
            color: 'text.primary',
            bgcolor: '#ffffff',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            justifyContent: 'space-between',
            textAlign: 'left',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            transition: 'background-color 180ms ease, border-color 180ms ease',
            '&:hover': {
              bgcolor: '#ffffff',
              borderColor: 'rgba(15, 23, 42, 0.24)',
            },
            '& .MuiButton-startIcon': { mr: 0.75 },
          }}
        >
          加入 Google Workspace
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
                  startIcon={<GoogleIcon size={16} />}
                  onClick={() => window.open(GOOGLE_SPACE_URL, '_blank')}
                  sx={{
                    display: { xs: 'none', lg: 'inline-flex' },
                    borderRadius: 999,
                    px: 1.75,
                    py: 0.5,
                    fontWeight: 500,
                    color: 'text.primary',
                    borderColor: 'rgba(15, 23, 42, 0.12)',
                    bgcolor: '#ffffff',
                    transition:
                      'background-color 180ms ease, border-color 180ms ease, transform 180ms cubic-bezier(0.2,0.7,0.2,1), box-shadow 180ms ease',
                    '&:hover': {
                      bgcolor: '#ffffff',
                      borderColor: 'rgba(15, 23, 42, 0.24)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 10px rgba(15, 23, 42, 0.08)',
                    },
                  }}
                >
                  加入資管系 Google Workspace
                </Button>

                {isAuthenticated ? (
                  <IconButton onClick={handleUserMenuOpen} sx={{ p: 0.5 }}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                      {user?.username?.charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
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

      {/* User dropdown menu — 桌面/手機共用 */}
      {isAuthenticated && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleUserMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          MenuListProps={{ sx: { py: 0.5 } }}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1,
              minWidth: 240,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
              overflow: 'hidden',
            },
          }}
        >
          <Box sx={{ px: 2, pt: 1.5, pb: 1.25 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, minWidth: 0 }}
                noWrap
              >
                {user?.fullName || user?.username}
              </Typography>
              <Chip
                size="small"
                label={user?.hasPaidFee ? '已繳會費' : '未繳會費'}
                color={user?.hasPaidFee ? 'success' : 'default'}
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem', flexShrink: 0 }}
              />
            </Stack>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              navigate('/upload-exam');
              handleUserMenuClose();
            }}
            sx={{ py: 1, mt: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <UploadIcon fontSize="small" sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              上傳考古題
            </Typography>
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ py: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">登出</Typography>
          </MenuItem>
        </Menu>
      )}

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
