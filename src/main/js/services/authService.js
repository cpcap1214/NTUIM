import api from './api';

const authService = {
    // 註冊
    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData);
            if (response.data.token) {
                try {
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                } catch (storageError) {
                    console.warn('儲存使用者資料失敗，可能是私人瀏覽模式:', storageError);
                    // 即使無法儲存到 localStorage，仍然可以繼續使用（只是重新整理後會需要重新登入）
                }
            }
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 登入
    async login(username, password) {
        try {
            const response = await api.post('/auth/login', { username, password });
            if (response.data.token) {
                try {
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                } catch (storageError) {
                    console.warn('儲存使用者資料失敗，可能是私人瀏覽模式:', storageError);
                    // 即使無法儲存到 localStorage，仍然可以繼續使用
                }
            }
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 登出
    logout() {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch (error) {
            // iOS Safari 私人瀏覽模式下可能會出錯
            console.warn('localStorage 清除失敗:', error);
        }
        window.location.href = '/login';
    },

    // 修改密碼
    async changePassword(username, oldPassword, newPassword) {
        try {
            const response = await api.post('/auth/change-password', {
                username,
                oldPassword,
                newPassword
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 取得當前使用者
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.warn('讀取使用者資料失敗:', error);
            return null;
        }
    },

    // 取得 Token
    getToken() {
        try {
            return localStorage.getItem('token');
        } catch (error) {
            console.warn('讀取 token 失敗:', error);
            return null;
        }
    },

    // 檢查是否已登入
    isAuthenticated() {
        return !!this.getToken();
    },

    // 檢查是否為管理員
    isAdmin() {
        const user = this.getCurrentUser();
        return user?.role === 'admin';
    },

    // 檢查是否已繳費
    hasPaidFee() {
        const user = this.getCurrentUser();
        return user?.hasPaidFee || false;
    },

    // 更新本地使用者資料
    updateLocalUser(userData) {
        const currentUser = this.getCurrentUser();
        const updatedUser = { ...currentUser, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
    }
};

export default authService;