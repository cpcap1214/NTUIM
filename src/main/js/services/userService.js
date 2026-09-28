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

    // 產生重設密碼連結（管理員）。回傳 { url, expiresAt }，由管理員轉交給本人
    async createPasswordResetLink(id) {
        try {
            const response = await api.post(`/admin/users/${id}/password-reset-link`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 原本這裡有 updateRole（PATCH /users/:id/role，寫舊的 role 欄位），後端已移除。
    // 身分組請用 roleService.setUserRoles。

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
