import i18n from '../i18n';

// 日期格式化工具
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';

  // new Date('亂七八糟') 不會 throw，它回一個 Invalid Date 物件，
  // 對它做任何格式化都會得到字串 "Invalid Date"（或 NaN）。
  // 原本這裡是 try/catch，所以那個 catch 從來沒被觸發過，
  // 使用者看到的是畫面上直接印出 "Invalid Date"。要擋只能明確檢查。
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  });
};

// 相對時間格式化
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';

  // 同 formatDate：無效日期不會 throw。這裡少了檢查更難看——
  // now - date 是 NaN，底下每個區間比較都是 false，於是一路落到最後一行，
  // 輸出「NaN 年前」。
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  const diffInSeconds = Math.floor((new Date() - date) / 1000);

  if (diffInSeconds < 60) return i18n.t('time.justNow');
  if (diffInSeconds < 3600) return i18n.t('time.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400) return i18n.t('time.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
  if (diffInSeconds < 2592000) return i18n.t('time.daysAgo', { count: Math.floor(diffInSeconds / 86400) });
  if (diffInSeconds < 31536000) return i18n.t('time.monthsAgo', { count: Math.floor(diffInSeconds / 2592000) });

  return i18n.t('time.yearsAgo', { count: Math.floor(diffInSeconds / 31536000) });
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

// 目前的民國學年度。
//
// 「8 月起算新學年」這條規則已經寫在 getCurrentSemester 裡（後端另有一份在
// utils/semesterEligibility.js:17-23），所以這裡只做西元→民國的換算，
// 不要再複製一次月份判斷——同一條規則有三份的話遲早會有一份漏改。
export const getCurrentAcademicYear = () => getCurrentSemester().year - 1911;