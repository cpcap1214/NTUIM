import React from 'react';
import { Box, Typography } from '@mui/material';

const PageHeader = ({ 
  title, 
  subtitle, 
  action = null,
  centered = false,
  sx = {} 
}) => {
  return (
    <Box 
      sx={{ 
        mb: 4,
        textAlign: centered ? 'center' : 'left',
        ...sx 
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: centered ? 'center' : 'flex-start',
        flexDirection: { xs: 'column', sm: centered ? 'column' : 'row' },
        gap: 2
      }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '3rem' }
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="h6" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '1rem', md: '1.25rem' },
                maxWidth: centered ? '800px' : 'none',
                mx: centered ? 'auto' : 0
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && (
          <Box sx={{ 
            flexShrink: 0,
            alignSelf: { xs: 'stretch', sm: centered ? 'center' : 'flex-start' }
          }}>
            {action}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PageHeader;