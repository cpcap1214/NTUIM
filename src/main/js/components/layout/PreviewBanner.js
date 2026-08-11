import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../../contexts/AuthContext';

// 身分預覽進行中的固定橫幅。
//
// 這是預覽模式唯一的退出點，所以刻意放在 Layout 的最上層而不是管理台裡面——
// 預覽成一般使用者時管理台會整個消失（那正是預期行為），
// 橫幅若跟著不見，就只剩清 sessionStorage 才能脫困。
const PreviewBanner = () => {
  const { t } = useTranslation();
  const { preview, stopPreview } = useAuth();
  const [stopping, setStopping] = useState(false);

  if (!preview) return null;

  const handleStop = async () => {
    setStopping(true);
    try {
      await stopPreview();
    } finally {
      setStopping(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar + 1,
      }}
    >
      <Alert
        severity="warning"
        icon={<VisibilityIcon fontSize="inherit" />}
        sx={{ borderRadius: 0, alignItems: 'center' }}
        action={
          <Button
            color="inherit"
            size="small"
            variant="outlined"
            onClick={handleStop}
            disabled={stopping}
          >
            {stopping ? t('preview.stopping') : t('preview.stop')}
          </Button>
        }
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" component="span">
            {t('preview.viewingAs')}
          </Typography>
          <Chip
            size="small"
            color="warning"
            label={preview.label || t(preview.kind === 'role' ? 'preview.someRole' : 'preview.someUser')}
          />
          <Typography variant="body2" component="span">
            {t('preview.viewingAsSuffix')}
          </Typography>
        </Stack>
      </Alert>
    </Box>
  );
};

export default PreviewBanner;
