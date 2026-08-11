import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, CircularProgress, Typography } from '@mui/material';

// message 的預設值刻意在元件內取而不是寫在參數預設值上：
// 參數預設值會在模組載入時求值，那時 i18n 可能還沒初始化，而且切換語言後也不會更新。
const LoadingSpinner = ({ 
  message, 
  size = 40, 
  centered = true,
  sx = {} 
}) => {
  const { t } = useTranslation();
  const text = message === undefined ? t('common.loading') : message;
  const content = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: 2,
      ...sx 
    }}>
      <CircularProgress size={size} />
      {text && (
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      )}
    </Box>
  );

  if (centered) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '200px' 
      }}>
        {content}
      </Box>
    );
  }

  return content;
};

export default LoadingSpinner;