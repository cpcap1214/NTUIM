import axios from 'axios';

// API 基礎設定 - 自動偵測可用的 API
const getApiUrl = () => {
    // 優先使用環境變數
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    
    // 根據當前網址自動判斷
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5001/api';
    } else if (hostname === 'ntu.im') {
        // 直接使用 IP:5001
        return 'http://140.112.106.45:5001/api';
    } else {
        // 其他情況使用相同 host 的 5001 端口
        return `http://${hostname}:5001/api`;
    }
};

export const API_BASE_URL = getApiUrl();
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