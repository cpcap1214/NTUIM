import i18n from '../i18n';

// 日期格式化工具
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    };
    
    return date.toLocaleDateString('zh-TW', defaultOptions);
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return dateString;
  }
};

// 相對時間格式化
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return i18n.t('time.justNow');
    if (diffInSeconds < 3600) return i18n.t('time.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return i18n.t('time.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 2592000) return i18n.t('time.daysAgo', { count: Math.floor(diffInSeconds / 86400) });
    if (diffInSeconds < 31536000) return i18n.t('time.monthsAgo', { count: Math.floor(diffInSeconds / 2592000) });
    
    return i18n.t('time.yearsAgo', { count: Math.floor(diffInSeconds / 31536000) });
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return dateString;
  }
};

// 學年學期格式化
export const formatSemester = (year, semester) => {
  // '3' 是這支工具函式沿用的舊暑期代碼；後端與課程評價功能用的是 'summer'
  const key = { '1': '1', '2': '2', '3': 'summer' }[semester];
  const semesterName = key
    ? i18n.t(`courseReview.semester.${key}`)
    : i18n.t('time.nthSemester', { n: semester });

  return i18n.t('time.academicTerm', { year, semester: semesterName });
};

// 取得當前學年學期
export const getCurrentSemester = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript 月份從 0 開始
  
  let academicYear;
  let semester;
  
  if (month >= 8) {
    // 8月以後是新學年的上學期
    academicYear = year;
    semester = '1';
  } else if (month >= 2) {
    // 2-7月是下學期
    academicYear = year - 1;
    semester = '2';
  } else {
    // 1月是上學期
    academicYear = year - 1;
    semester = '1';
  }
  
  return {
    year: academicYear,
    semester,
    display: formatSemester(academicYear, semester)
  };
};