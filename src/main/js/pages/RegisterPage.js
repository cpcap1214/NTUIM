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

const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    studentId: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (formData.password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      navigate('/');
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        setError(err.errors[0].msg);
      } else {
        setError(err.error || t('auth.registerFailed'));
      }
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
          maxWidth: 480,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('auth.register')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('auth.registerSubtitle')}
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
              label={t('auth.studentId')}
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              required
              placeholder={t('auth.studentIdExample')}
            />
            <TextField
              fullWidth
              size="medium"
              label={t('auth.username')}
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              size="medium"
              label={t('auth.fullName')}
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              size="medium"
              label={t('auth.email')}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder={t('auth.emailExample')}
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
              helperText={t('auth.passwordHelper')}
            />
            <TextField
              fullWidth
              size="medium"
              label={t('auth.confirmPassword')}
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
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
              {loading ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : t('auth.register')}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
          {t('auth.haveAccount')}
          <Link component={RouterLink} to="/login" sx={{ ml: 0.5, fontWeight: 500 }}>
            {t('auth.loginNow')}
          </Link>
        </Typography>

        <Box
          sx={{
            mt: 3,
            p: 1.5,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {t('auth.registerFeeNotice')}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default RegisterPage;
