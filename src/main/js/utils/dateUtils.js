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
    
    if (diffInSeconds < 60) return '剛剛';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分鐘前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小時前`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} 天前`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} 個月前`;
    
    return `${Math.floor(diffInSeconds / 31536000)} 年前`;
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return dateString;
  }
};

// 學年學期格式化
export const formatSemester = (year, semester) => {
  const semesterMap = {
    '1': '上學期',
    '2': '下學期',
    '3': '暑期'
  };
  
  return `${year} 學年 ${semesterMap[semester] || `第${semester}學期`}`;
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