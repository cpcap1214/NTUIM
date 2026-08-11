import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, Tab, Chip, Stack } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { NAVIGATION_ITEMS } from '../../../resources/config/constants';

// Tab 的 value 一律用 path，不用陣列索引。
// 原本是用 findIndex 取索引當 value，但導覽項目一旦依模塊開放狀態被過濾，
// 索引就會跟 Header 裡另一份迴圈錯位、選到錯的分頁。
const NavigationTabs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isModuleVisible, isModuleComingSoon } = useAuth();

  const visibleItems = NAVIGATION_ITEMS.filter((item) => isModuleVisible(item.moduleKey));
  const currentPath = visibleItems.some((item) => item.path === location.pathname)
    ? location.pathname
    : false;

  return (
    <Tabs
      value={currentPath}
      onChange={(_, newPath) => navigate(newPath)}
      aria-label={t('nav.siteNavigation')}
      sx={{ minHeight: 48 }}
    >
      {visibleItems.map((item) => (
        <Tab
          key={item.id}
          value={item.path}
          label={
            isModuleComingSoon(item.moduleKey) ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <span>{t(item.labelKey)}</span>
                <Chip
                  label={t('nav.comingSoon')}
                  size="small"
                  color="warning"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              </Stack>
            ) : (
              t(item.labelKey)
            )
          }
          sx={{ minWidth: 'auto', px: 2 }}
        />
      ))}
    </Tabs>
  );
};

export default NavigationTabs;
