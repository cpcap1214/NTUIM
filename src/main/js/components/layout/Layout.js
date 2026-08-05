import React from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import PreviewBanner from './PreviewBanner';

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* 放在 Header 之上：預覽成一般使用者時管理台會消失，橫幅是唯一的退出點 */}
      <PreviewBanner />
      <Header />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default Layout;
