import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = "搜尋...", 
  fullWidth = true, 
  size = "medium",
  sx = {} 
}) => {
  return (
    <TextField
      fullWidth={fullWidth}
      size={size}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'background.paper',
          '&:hover': {
            backgroundColor: 'background.paper',
          },
        },
        ...sx
      }}
    />
  );
};

export default SearchBar;