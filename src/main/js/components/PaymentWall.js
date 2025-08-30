import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Divider,
} from '@mui/material';
import {
  Lock as LockIcon,
  CheckCircle as CheckIcon,
  School as SchoolIcon,
  Description as DescriptionIcon,
  CloudDownload as DownloadIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PaymentWall = ({ feature = '此功能' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const benefits = [
    { icon: <DescriptionIcon />, text: '無限制瀏覽及下載考古題' },
    { icon: <SchoolIcon />, text: '存取所有課程評價與心得' },
    { icon: <DownloadIcon />, text: '下載大抄及學習資源' },
    { icon: <StarIcon />, text: '優先參與系學會活動' },
    { icon: <CheckIcon />, text: '支持系學會持續運作' },
  ];

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 6 }}>
        <Paper 
          elevation={3}
          sx={{ 
            p: 5,
            textAlign: 'center',
            borderRadius: 2,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          }}
        >
          {/* Lock Icon */}
          <Box sx={{ mb: 3 }}>
            <LockIcon sx={{ fontSize: 80, color: 'primary.main', opacity: 0.8 }} />
          </Box>

          {/* Title */}
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.dark' }}>
            {feature}需要繳交系學會費
          </Typography>

          {/* Status Alert */}
          {user ? (
            <Alert severity="info" sx={{ mt: 2, mb: 3, maxWidth: 500, mx: 'auto' }}>
              <Typography variant="body2">
                您目前的帳號 <strong>{user.username}</strong> 尚未繳交系學會費
              </Typography>
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mt: 2, mb: 3, maxWidth: 500, mx: 'auto' }}>
              <Typography variant="body2">
                請先登入或註冊帳號，並繳交系學會費以使用完整功能
              </Typography>
            </Alert>
          )}

          <Divider sx={{ my: 4 }} />

          {/* Benefits Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              繳交系學會費即可享有：
            </Typography>
            <List sx={{ maxWidth: 400, mx: 'auto', textAlign: 'left' }}>
              {benefits.map((benefit, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 40, color: 'success.main' }}>
                    {benefit.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={benefit.text}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Payment Info */}
          <Box sx={{ mb: 4, p: 3, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              繳費資訊
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              系學會費：<strong>NT$ 2000</strong> / 四年
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              繳費方式：請至系辦或系學會辦公室繳交
            </Typography>
            <Typography variant="caption" color="text.secondary">
              繳費後請聯繫系學會幹部更新您的帳號狀態
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {!user ? (
              <>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleLogin}
                  sx={{ minWidth: 150 }}
                >
                  登入
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleRegister}
                  sx={{ minWidth: 150 }}
                >
                  註冊新帳號
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="large"
                  color="success"
                  sx={{ minWidth: 200 }}
                >
                  聯繫系學會
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/')}
                  sx={{ minWidth: 150 }}
                >
                  返回首頁
                </Button>
              </>
            )}
          </Box>

          {/* Contact Info */}
          <Box sx={{ mt: 4, p: 2, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              如有任何問題，請聯繫系學會：im_student@ntu.edu.tw
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default PaymentWall;