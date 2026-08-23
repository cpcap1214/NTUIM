import api from './api';
import authService from './authService';

const userService = {
    // 取得個人資料
    async getProfile() {
        try {
            const response = await api.get('/users/profile');
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 更新個人資料
    async updateProfile(data) {
        try {
            const response = await api.put('/users/profile', data);
            // 更新本地使用者資料
            authService.updateLocalUser(response.data.data);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 取得使用者列表（管理員）
    async getUsers(params = {}) {
        try {
            const response = await api.get('/users', { params });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 取得指定使用者資料
    async getUser(id) {
        try {
            const response = await api.get(`/users/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 更新會費狀態（管理員）
    async updateFeeStatus(id, hasPaidFee) {
        try {
            const response = await api.patch(`/users/${id}/fee-status`, { hasPaidFee });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 更新使用者角色（管理員）
    async updateRole(id, role) {
        try {
            const response = await api.patch(`/users/${id}/role`, { role });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 刪除使用者（管理員）
    async deleteUser(id) {
        try {
            const response = await api.delete(`/users/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 取得使用者貢獻
    async getUserContributions(id) {
        try {
            const response = await api.get(`/users/${id}/contributions`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },
};

export default userService;
