import i18n from '../i18n';

// 檔案處理工具

// 格式化檔案大小
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 取得檔案副檔名
export const getFileExtension = (filename) => {
  if (!filename) return '';
  return filename.split('.').pop().toLowerCase();
};

// 檢查是否為 PDF 檔案
export const isPdfFile = (filename) => {
  return getFileExtension(filename) === 'pdf';
};

// 檢查是否為圖片檔案
export const isImageFile = (filename) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
  return imageExtensions.includes(getFileExtension(filename));
};

// 產生下載檔名
export const generateDownloadFilename = (title, type, year, semester) => {
  // 移除特殊字元並替換空格
  const cleanTitle = title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  if (year && semester) {
    return `${cleanTitle}_${type}_${year}-${semester}_${timestamp}.pdf`;
  }
  
  return `${cleanTitle}_${type}_${timestamp}.pdf`;
};

// 模擬檔案下載
export const downloadFile = (url, filename) => {
  // 在真實環境中，這裡會處理實際的檔案下載
  console.log(`Downloading file: ${filename} from ${url}`);
  
  // 模擬下載延遲
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, filename });
    }, 1000);
  });
};

// 模擬檔案上傳
export const uploadFile = (file, type = 'document') => {
  return new Promise((resolve, reject) => {
    // 檢查檔案類型
    if (!isPdfFile(file.name)) {
      reject(new Error(i18n.t('validation.pdfOnly')));
      return;
    }
    
    // 檢查檔案大小 (假設限制 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      reject(new Error(i18n.t('validation.fileTooLarge')));
      return;
    }
    
    // 模擬上傳過程
    setTimeout(() => {
      const mockUrl = `/files/${type}/${Date.now()}_${file.name}`;
      resolve({
        success: true,
        url: mockUrl,
        filename: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
    }, 2000);
  });
};

// 檔案預覽 URL 生成
export const getPreviewUrl = (fileUrl) => {
  // 在真實環境中，這裡會處理 PDF 預覽 URL
  if (isPdfFile(fileUrl)) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  }
  
  return fileUrl;
};

// 檔案類型圖示
export const getFileIcon = (filename) => {
  const extension = getFileExtension(filename);
  
  const iconMap = {
    pdf: '📄',
    doc: '📃',
    docx: '📃',
    xls: '📊',
    xlsx: '📊',
    ppt: '📽️',
    pptx: '📽️',
    txt: '📝',
    md: '📝',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️'
  };
  
  return iconMap[extension] || '📎';
};