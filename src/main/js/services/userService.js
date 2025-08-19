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

    // 角色選項
    getRoleOptions() {
        return [
            { value: 'user', label: '一般使用者' },
            { value: 'member', label: '系學會成員' },
            { value: 'admin', label: '管理員' }
        ];
    },

    // 取得角色顯示名稱
    getRoleDisplayName(role) {
        const roleMap = {
            'user': '一般使用者',
            'member': '系學會成員',
            'admin': '管理員'
        };
        return roleMap[role] || '未知';
    },

    // 取得角色顏色
    getRoleColor(role) {
        const colorMap = {
            'admin': '#f44336',    // 紅色
            'member': '#2196f3',   // 藍色
            'user': '#9e9e9e'      // 灰色
        };
        return colorMap[role] || '#9e9e9e';
    },

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '未知';
        return new Date(dateString).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // 驗證學號格式
    validateStudentId(studentId) {
        // 台大學號格式: B09705001 (1個英文字母 + 8個數字)
        const pattern = /^[A-Z]\d{8}$/;
        return pattern.test(studentId);
    },

    // 驗證電子郵件格式
    validateEmail(email) {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    }
};

export default userService;