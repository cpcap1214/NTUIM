import api from './api';

const authService = {
    // 註冊
    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData);
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
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
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 登出
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // 取得 Token
    getToken() {
        return localStorage.getItem('token');
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