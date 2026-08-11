import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, Menu, MenuItem, ListItemText, Tooltip } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import CheckIcon from '@mui/icons-material/Check';
import { SUPPORTED_LANGUAGES } from '../../i18n/locales';
import { changeLanguage } from '../../i18n';

// 語言切換。
//
// 刻意做成獨立元件而不是寫在 Header 裡：桌機工具列與手機抽屜都要用，
// 而且未登入時也必須能切換——所以不能放進使用者下拉選單（那個只在登入後出現）。
//
// 選項一律顯示該語言自己的寫法（繁體中文 / English）。不小心切到看不懂的語言時，
// 使用者還是找得到路切回來。
const LanguageSwitcher = ({ size = 'medium' }) => {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleSelect = (code) => {
    changeLanguage(code);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title={t('common.language')}>
        <IconButton
          size={size}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label={t('common.language')}
          sx={{ color: 'text.primary' }}
        >
          <TranslateIcon fontSize={size === 'small' ? 'small' : 'medium'} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <MenuItem
            key={lang.code}
            selected={i18n.language === lang.code}
            onClick={() => handleSelect(lang.code)}
            sx={{ minWidth: 180 }}
          >
            <ListItemText primary={lang.nativeName} />
            {i18n.language === lang.code && <CheckIcon fontSize="small" color="primary" />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
