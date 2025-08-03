// 表單驗證工具

// 驗證電子郵件
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 驗證必填欄位
export const validateRequired = (value) => {
  return value !== null && value !== undefined && String(value).trim() !== '';
};

// 驗證最小長度
export const validateMinLength = (value, minLength) => {
  return String(value).length >= minLength;
};

// 驗證最大長度
export const validateMaxLength = (value, maxLength) => {
  return String(value).length <= maxLength;
};

// 驗證台大學號 (假設格式為 b12345678)
export const validateStudentId = (studentId) => {
  const studentIdRegex = /^[a-zA-Z]\d{8}$/;
  return studentIdRegex.test(studentId);
};

// 驗證評分 (1-5)
export const validateRating = (rating) => {
  const num = Number(rating);
  return !isNaN(num) && num >= 1 && num <= 5;
};

// 綜合表單驗證器
export const createValidator = (rules) => {
  return (data) => {
    const errors = {};
    
    Object.entries(rules).forEach(([field, fieldRules]) => {
      const value = data[field];
      const fieldErrors = [];
      
      fieldRules.forEach(rule => {
        if (rule.type === 'required' && !validateRequired(value)) {
          fieldErrors.push(rule.message || `${field} 為必填欄位`);
        }
        
        if (rule.type === 'email' && value && !validateEmail(value)) {
          fieldErrors.push(rule.message || '請輸入有效的電子郵件地址');
        }
        
        if (rule.type === 'minLength' && value && !validateMinLength(value, rule.value)) {
          fieldErrors.push(rule.message || `${field} 至少需要 ${rule.value} 個字元`);
        }
        
        if (rule.type === 'maxLength' && value && !validateMaxLength(value, rule.value)) {
          fieldErrors.push(rule.message || `${field} 最多 ${rule.value} 個字元`);
        }
        
        if (rule.type === 'studentId' && value && !validateStudentId(value)) {
          fieldErrors.push(rule.message || '請輸入有效的學號格式');
        }
        
        if (rule.type === 'rating' && value && !validateRating(value)) {
          fieldErrors.push(rule.message || '評分必須介於 1-5 之間');
        }
        
        if (rule.type === 'custom' && rule.validator && !rule.validator(value)) {
          fieldErrors.push(rule.message || `${field} 格式不正確`);
        }
      });
      
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors[0]; // 只顯示第一個錯誤
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
};

// 常用驗證規則
export const commonRules = {
  required: (message) => ({ type: 'required', message }),
  email: (message) => ({ type: 'email', message }),
  minLength: (length, message) => ({ type: 'minLength', value: length, message }),
  maxLength: (length, message) => ({ type: 'maxLength', value: length, message }),
  studentId: (message) => ({ type: 'studentId', message }),
  rating: (message) => ({ type: 'rating', message }),
  custom: (validator, message) => ({ type: 'custom', validator, message })
};