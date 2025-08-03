import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, Tab } from '@mui/material';
import { NAVIGATION_ITEMS } from '../../../resources/config/constants';

const NavigationTabs = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTabIndex = NAVIGATION_ITEMS.findIndex(
    item => item.path === location.pathname
  );

  const handleTabChange = (_, newValue) => {
    const selectedItem = NAVIGATION_ITEMS[newValue];
    if (selectedItem) {
      navigate(selectedItem.path);
    }
  };

  return (
    <Tabs
      value={currentTabIndex >= 0 ? currentTabIndex : 0}
      onChange={handleTabChange}
      aria-label="網站導覽"
      sx={{
        '& .MuiTabs-indicator': {
          backgroundColor: 'primary.main',
        },
        '& .MuiTabs-flexContainer': {
          alignItems: 'center',
        },
      }}
    >
      {NAVIGATION_ITEMS.map((item, index) => (
        <Tab
          key={item.id}
          label={item.label}
          id={`nav-tab-${index}`}
          aria-controls={`nav-tabpanel-${index}`}
          sx={{
            minWidth: 80,
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
              fontWeight: 600,
            },
            '&:hover': {
              color: 'primary.main',
            },
          }}
        />
      ))}
    </Tabs>
  );
};

export default NavigationTabs;