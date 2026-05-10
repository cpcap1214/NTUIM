import React from 'react';
import { Box, Typography } from '@mui/material';
import { Build as BuildIcon } from '@mui/icons-material';

const CourseReviewPage = () => {
  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        textAlign: 'center',
      }}
    >
      <BuildIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
        維護中
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
        課程評價系統正在優化，敬請期待
      </Typography>
    </Box>
  );
};

export default CourseReviewPage;
