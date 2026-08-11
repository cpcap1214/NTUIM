import React from 'react';
import { useTranslation } from 'react-i18next';
import { TextField, InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

const SearchBar = ({ 
  value, 
  onChange, 
  placeholder, 
  fullWidth = true, 
  size = "medium",
  sx = {} 
}) => {
  const { t } = useTranslation();
  return (
    <TextField
      fullWidth={fullWidth}
      size={size}
      placeholder={placeholder === undefined ? t('common.searchPlaceholder') : placeholder}
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