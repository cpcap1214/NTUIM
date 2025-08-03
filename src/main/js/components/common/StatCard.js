import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const StatCard = ({ 
  value, 
  label, 
  color = 'primary.main', 
  icon = null,
  sx = {} 
}) => {
  return (
    <Paper 
      sx={{ 
        p: 3, 
        textAlign: 'center',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
        ...sx 
      }}
    >
      {icon && (
        <Box sx={{ mb: 1 }}>
          {icon}
        </Box>
      )}
      <Typography 
        variant="h4" 
        sx={{ 
          fontWeight: 700, 
          color: color,
          mb: 1
        }}
      >
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
};

export default StatCard;