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

const LoginPage = () => {
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
      setError(err.error || err.message || '登入失敗，請檢查帳號密碼或網路連線');
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
            登入
          </Typography>
          <Typography variant="body2" color="text.secondary">
            使用學號或使用者名稱登入
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
              label="學號或使用者名稱"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoFocus
            />
            <TextField
              fullWidth
              size="medium"
              label="密碼"
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
              {loading ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : '登入'}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
          還沒有帳號？
          <Link component={RouterLink} to="/register" sx={{ ml: 0.5, fontWeight: 500 }}>
            立即註冊
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoginPage;
