import React from 'react';
import { Box, Typography } from '@mui/material';

const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action = null,
  sx = {} 
}) => {
  return (
    <Box 
      sx={{ 
        textAlign: 'center', 
        py: 8,
        ...sx 
      }}
    >
      {icon && (
        <Box sx={{ mb: 2 }}>
          {React.cloneElement(icon, { 
            sx: { 
              fontSize: 64, 
              color: 'text.disabled', 
              ...icon.props.sx 
            } 
          })}
        </Box>
      )}
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
};

export default EmptyState;