import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
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

// feature 是呼叫端傳進來的功能名稱（例如「考古題」），沒傳就用泛稱。
// 預設值要在元件內取，不能寫在參數預設值裡——那會在模組載入時求值，i18n 可能還沒好。
const PaymentWall = ({ feature }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const featureName = feature || t('payment.thisFeature');
  const benefits = t('payment.benefits', { returnObjects: true });

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
            {t('payment.title', { feature: featureName })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('payment.subtitle')}
          </Typography>
        </Box>

        {user ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Trans i18nKey="payment.unpaidNotice" values={{ username: user.username }} components={{ strong: <strong /> }} />
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {t('payment.loginFirst')}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {t('payment.benefitsTitle')}
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
              {t('payment.feeLabel')}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              NT$ 2,000
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                {t('payment.perFourYears')}
              </Typography>
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {t('payment.reviewNotice')}
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
          {!user ? (
            <>
              <Button variant="contained" fullWidth size="large" onClick={() => navigate('/login')}>
                {t('nav.login')}
              </Button>
              <Button variant="outlined" fullWidth size="large" onClick={() => navigate('/register')}>
                {t('auth.register')}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                onClick={() => (window.location.href = 'mailto:imsa@ntu.im')}
              >
                {t('payment.contactAssociation')}
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
                {t('payment.contactAssociation')}
              </Button>
              <Button variant="outlined" fullWidth size="large" onClick={() => navigate('/')}>
                {t('guard.backHome')}
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default PaymentWall;
