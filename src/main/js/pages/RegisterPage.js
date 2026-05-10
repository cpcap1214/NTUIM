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
      setError('密碼與確認密碼不相符');
      return;
    }
    if (formData.password.length < 6) {
      setError('密碼長度至少需要 6 個字元');
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
        setError(err.error || '註冊失敗，請稍後再試');
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
            註冊
          </Typography>
          <Typography variant="body2" color="text.secondary">
            加入台大資管系學會
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
              label="學號"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              required
              placeholder="例：B09705001"
            />
            <TextField
              fullWidth
              size="medium"
              label="使用者名稱"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              size="medium"
              label="真實姓名"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              size="medium"
              label="電子郵件"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="例：student@ntu.edu.tw"
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
              helperText="至少 6 個字元"
            />
            <TextField
              fullWidth
              size="medium"
              label="確認密碼"
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
              {loading ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : '註冊'}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
          已經有帳號？
          <Link component={RouterLink} to="/login" sx={{ ml: 0.5, fontWeight: 500 }}>
            立即登入
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
            註冊後若需要使用完整功能（下載考古題、上傳大抄等），請聯繫系學會繳交會費。
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default RegisterPage;
