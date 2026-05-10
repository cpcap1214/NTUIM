import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Lock as LockIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PaymentWall = ({ feature = '此功能' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const benefits = [
    '參加系上活動有打折（比如真的超級好玩的系烤）',
    '學術部考古題網站的權限（卷哥卷姐必備）',
    '系學會網站完整功能',
  ];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 3, md: 5 } }}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, sm: 5 },
          width: '100%',
          maxWidth: 640,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              mx: 'auto',
              mb: 2,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LockIcon sx={{ fontSize: 26 }} />
          </Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {feature}需要繳交系學會費
          </Typography>
          <Typography variant="body2" color="text.secondary">
            繳費後即可使用完整功能
          </Typography>
        </Box>

        {user ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            您的帳號 <strong>{user.username}</strong> 尚未繳交系學會費
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 3 }}>
            請先登入或註冊帳號，並繳交系學會費以使用完整功能
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            繳費後可享有
          </Typography>
          <List dense disablePadding>
            {benefits.map((benefit, index) => (
              <ListItem key={index} disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={benefit}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              系學會費
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              NT$ 2,000
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                / 四年
              </Typography>
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            繳費資格採人工審核，每日晚間統一處理；通過後即可使用完整功能。
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
          {!user ? (
            <>
              <Button variant="contained" fullWidth size="large" onClick={() => navigate('/login')}>
                登入
              </Button>
              <Button variant="outlined" fullWidth size="large" onClick={() => navigate('/register')}>
                註冊
              </Button>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                onClick={() => (window.location.href = 'mailto:imsa@ntu.im')}
              >
                聯繫系學會
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => (window.location.href = 'mailto:imsa@ntu.im')}
              >
                聯繫系學會
              </Button>
              <Button variant="outlined" fullWidth size="large" onClick={() => navigate('/')}>
                返回首頁
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default PaymentWall;
