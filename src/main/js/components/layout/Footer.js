import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  Divider,
  Grid,
} from '@mui/material';
import { APP_CONFIG } from '../../../resources/config/constants';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'grey.50',
        borderTop: 1,
        borderColor: 'grey.200',
        mt: 'auto',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {APP_CONFIG.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {APP_CONFIG.fullName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {APP_CONFIG.description}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              聯絡資訊
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link
                href="mailto:contact@ntuim.org"
                color="text.secondary"
                underline="hover"
                variant="body2"
              >
                contact@ntuim.org
              </Link>
              <Link
                href="https://www.facebook.com/NTUIMSA"
                color="text.secondary"
                underline="hover"
                variant="body2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook 粉絲專頁
              </Link>
              <Link
                href="https://www.instagram.com/ntu.imsa?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                color="text.secondary"
                underline="hover"
                variant="body2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </Link>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              相關連結
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link
                href="https://management.ntu.edu.tw/IM"
                color="text.secondary"
                underline="hover"
                variant="body2"
                target="_blank"
                rel="noopener noreferrer"
              >
                資管系官網
              </Link>
              <Link
                href="https://www.ntu.edu.tw"
                color="text.secondary"
                underline="hover"
                variant="body2"
                target="_blank"
                rel="noopener noreferrer"
              >
                台大官網
              </Link>
              <Link
                href="https://github.com/ntu-im-sa"
                color="text.secondary"
                underline="hover"
                variant="body2"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </Link>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {currentYear} {APP_CONFIG.fullName}. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Version {APP_CONFIG.version} | Built with React & MUI
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;