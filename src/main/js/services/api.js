import axios from 'axios';

// API 基礎設定 - 使用同源 /api（避免 CORS）
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
// 註：原本這裡還有 UPLOAD_BASE_URL，用來組出 /uploads/... 的直連網址。
// 該靜態服務已移除（它讓任何人不必登入就能下載考古題，繞過付費牆），
// 檔案一律走有認證的 API 端點取得，因此這個常數也一併刪掉，避免有人再組出直連路徑。

// 建立 axios 實例
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // 增加超時時間至15秒，適應手機網路
    headers: {
        'Content-Type': 'application/json'
    }
});

// 身分預覽目標（管理台的「以身分組檢視」/「以成員檢視」）。
// 用 sessionStorage 而非 localStorage：預覽是臨時的除錯狀態，關掉分頁就該結束，
// 不該跨瀏覽器工作階段留存，也不該影響同時開著的其他分頁。
const PREVIEW_KEY = 'previewAs';

export const getPreviewTarget = () => sessionStorage.getItem(PREVIEW_KEY);

export const setPreviewTarget = (target) => {
    if (target) sessionStorage.setItem(PREVIEW_KEY, target);
    else sessionStorage.removeItem(PREVIEW_KEY);
};

// 請求攔截器 - 自動加入認證 token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // 預覽期間每個請求都帶上目標，後端據此改用對方的權限解析
        const preview = getPreviewTarget();
        if (preview) {
            config.headers['X-Preview-As'] = preview;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 回應攔截器 - 處理錯誤
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // 處理 401 錯誤 - 未授權
            if (error.response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
            
            // 處理 403 錯誤 - 需要繳費
            if (error.response.status === 403 && error.response.data.requirePayment) {
                alert('此功能需要繳交系學會費');
            }
        } else if (error.request) {
            // 網路錯誤 - 特別針對手機版的網路問題
            console.error('網路連線錯誤:', error.request);
            error.message = '網路連線失敗，請檢查您的網路連線';
        } else if (error.code === 'ECONNABORTED') {
            // 超時錯誤
            error.message = '請求超時，請檢查網路連線後重試';
        }
        return Promise.reject(error);
    }
);

export default api;