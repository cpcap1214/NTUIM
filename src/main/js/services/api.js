import axios from 'axios';

// API 基礎設定 - 使用同源 /api（避免 CORS）
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
export const UPLOAD_BASE_URL = API_BASE_URL.replace('/api', '');

// 建立 axios 實例
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // 增加超時時間至15秒，適應手機網路
    headers: {
        'Content-Type': 'application/json'
    }
});

// 請求攔截器 - 自動加入認證 token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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