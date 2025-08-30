import axios from 'axios';

// API 基礎設定
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
export const UPLOAD_BASE_URL = API_BASE_URL.replace('/api', '');

// 建立 axios 實例
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
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
        }
        return Promise.reject(error);
    }
);

export default api;