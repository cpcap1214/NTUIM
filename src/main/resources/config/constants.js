// 名稱走 i18n（app.name / app.fullName），這裡不再放寫死的字串。
// version 之類的非文案資訊留著。
export const APP_CONFIG = {
  version: '1.6.7',
};

// moduleKey 對應後端 modules 表的 key。有 moduleKey 的項目會受模組開放狀態影響
// （未開放時標示「即將推出」或整個隱藏），沒有 moduleKey 的項目一律顯示。
//
// 這裡放的是 labelKey 而不是 label：這個模組在載入時就求值了，
// 若直接寫 t('nav.home')，i18n 可能還沒初始化，而且切換語言後這個陣列不會重算，
// 導覽列會卡在舊語言。翻譯一律由元件在 render 時做。
export const NAVIGATION_ITEMS = [
  {
    id: 'home',
    labelKey: 'nav.home',
    path: '/',
    icon: 'home',
  },
  {
    id: 'course-reviews',
    labelKey: 'nav.courseReviews',
    path: '/course-reviews',
    icon: 'rate_review',
    moduleKey: 'courseReviews',
  },
  {
    id: 'exam-archive',
    labelKey: 'nav.examArchive',
    path: '/exam-archive',
    icon: 'quiz',
    moduleKey: 'exams',
  },
  {
    id: 'cheat-sheets',
    labelKey: 'nav.cheatSheets',
    path: '/cheat-sheets',
    icon: 'description',
    moduleKey: 'cheatSheets',
  },
  {
    id: 'about',
    labelKey: 'nav.about',
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