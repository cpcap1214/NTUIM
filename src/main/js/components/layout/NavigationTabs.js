import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, Tab } from '@mui/material';
import { NAVIGATION_ITEMS } from '../../../resources/config/constants';

const NavigationTabs = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTabIndex = NAVIGATION_ITEMS.findIndex((item) => item.path === location.pathname);

  const handleTabChange = (_, newValue) => {
    const selectedItem = NAVIGATION_ITEMS[newValue];
    if (selectedItem) {
      navigate(selectedItem.path);
    }
  };

  return (
    <Tabs
      value={currentTabIndex >= 0 ? currentTabIndex : false}
      onChange={handleTabChange}
      aria-label="網站導覽"
      sx={{ minHeight: 48 }}
    >
      {NAVIGATION_ITEMS.map((item, index) => (
        <Tab
          key={item.id}
          label={item.label}
          id={`nav-tab-${index}`}
          aria-controls={`nav-tabpanel-${index}`}
          sx={{ minWidth: 'auto', px: 2 }}
        />
      ))}
    </Tabs>
  );
};

export default NavigationTabs;
