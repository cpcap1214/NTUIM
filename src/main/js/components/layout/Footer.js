import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Link, Divider, Grid, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { APP_CONFIG } from '../../../resources/config/constants';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const linkSx = {
    fontSize: '0.875rem',
    color: 'text.secondary',
    transition: 'color 120ms ease',
    '&:hover': { color: 'primary.main' },
  };

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        mt: 'auto',
        py: { xs: 4, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
              {t('app.name')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('app.fullName')}
            </Typography>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              {t('footer.contact')}
            </Typography>
            <Stack spacing={1}>
              <Link href="mailto:imsa@ntu.im" underline="hover" sx={linkSx}>
                imsa@ntu.im
              </Link>
              <Link
                href="https://www.facebook.com/NTUIMSA"
                underline="hover"
                target="_blank"
                rel="noopener noreferrer"
                sx={linkSx}
              >
                Facebook
              </Link>
              <Link
                href="https://www.instagram.com/ntu.imsa"
                underline="hover"
                target="_blank"
                rel="noopener noreferrer"
                sx={linkSx}
              >
                Instagram
              </Link>
            </Stack>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              {t('footer.links')}
            </Typography>
            <Stack spacing={1}>
              <Link
                href="https://management.ntu.edu.tw/IM"
                underline="hover"
                target="_blank"
                rel="noopener noreferrer"
                sx={linkSx}
              >
                {t('footer.deptSite')}
              </Link>
              <Link
                href="https://www.ntu.edu.tw"
                underline="hover"
                target="_blank"
                rel="noopener noreferrer"
                sx={linkSx}
              >
                {t('footer.ntuSite')}
              </Link>
              <Link
                href="https://github.com/ntu-im-sa"
                underline="hover"
                target="_blank"
                rel="noopener noreferrer"
                sx={linkSx}
              >
                GitHub
              </Link>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            © {currentYear} {t('app.fullName')}
          </Typography>
          <Link
            component={RouterLink}
            to="/changelog"
            underline="none"
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              transition: 'color 120ms ease',
              '&:hover': { color: 'primary.main' },
            }}
          >
            v{APP_CONFIG.version} · {t('nav.changelog')}
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
