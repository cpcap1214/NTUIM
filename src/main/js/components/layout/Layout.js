import React from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          py: 3,
          px: { xs: 2, sm: 3, md: 4 },
          maxWidth: '1200px',
          mx: 'auto',
          width: '100%'
        }}
      >
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default Layout;