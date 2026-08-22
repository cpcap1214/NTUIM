import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stack,
  Link,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { translateApiError } from '../utils/apiError';

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(formData.username, formData.password);
      navigate('/');
    } catch (err) {
      console.error('登入錯誤:', err);
      // 走 errorCode 查譯文（errors.CREDENTIALS_INVALID）。
      // 直接用 err.error 會顯示後端寫死的中文，介面切成英文時就露餡了。
      setError(translateApiError(err, t('auth.loginFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 4, md: 6 } }}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, sm: 4 },
          width: '100%',
          maxWidth: 420,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('nav.login')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('auth.loginSubtitle')}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="medium"
              label={t('auth.usernameOrStudentId')}
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoFocus
            />
            <TextField
              fullWidth
              size="medium"
              label={t('auth.password')}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <Button
              type="submit"
              fullWidth
              size="large"
              variant="contained"
              disabled={loading}
              sx={{ mt: 1 }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : t('nav.login')}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
          {t('auth.noAccount')}
          <Link component={RouterLink} to="/register" sx={{ ml: 0.5, fontWeight: 500 }}>
            {t('auth.registerNow')}
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoginPage;
