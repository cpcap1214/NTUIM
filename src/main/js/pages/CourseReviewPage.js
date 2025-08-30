import React from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
} from '@mui/material';
import {
  Build as BuildIcon,
} from '@mui/icons-material';

const CourseReviewPage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <BuildIcon sx={{ fontSize: 100, color: 'text.disabled', mb: 3 }} />
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'text.secondary' }}>
          維護中
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          課程評價功能正在進行維護，請稍後再試
        </Typography>
        <Paper sx={{ p: 4, backgroundColor: 'grey.50', maxWidth: 600, mx: 'auto' }}>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            我們正在優化課程評價系統，為您帶來更好的使用體驗。
            <br />
            維護期間造成的不便，敬請見諒。
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default CourseReviewPage;