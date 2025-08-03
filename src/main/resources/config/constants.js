export const APP_CONFIG = {
  name: '台大資管系學會',
  fullName: '國立台灣大學資訊管理學系學會',
  englishName: 'NTU IM Student Association',
  description: '',
  version: '1.0.0',
};

export const NAVIGATION_ITEMS = [
  {
    id: 'home',
    label: '首頁',
    path: '/',
    icon: 'home',
  },
  {
    id: 'course-reviews',
    label: '課程評價',
    path: '/course-reviews',
    icon: 'rate_review',
  },
  {
    id: 'exam-archive',
    label: '考古題',
    path: '/exam-archive',
    icon: 'quiz',
  },
  {
    id: 'cheat-sheets',
    label: '大抄',
    path: '/cheat-sheets',
    icon: 'description',
  },
  {
    id: 'about',
    label: '關於我們',
    path: '/about',
    icon: 'info',
  },
];

export const COLORS = {
  primary: '#1976d2',
  secondary: '#757575',
  background: '#fafafa',
  paper: '#ffffff',
  text: {
    primary: '#212121',
    secondary: '#757575',
  },
  grey: {
    light: '#f5f5f5',
    medium: '#e0e0e0',
    dark: '#9e9e9e',
  },
};

export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
};