import api from './api';

const unwrap = (error) => error.response?.data || error;

const roleService = {
    async getRoles() {
        try {
            const response = await api.get('/roles');
            return response.data.data || [];
        } catch (error) {
            throw unwrap(error);
        }
    },

    // 權限目錄（key / 分組 / 中文標籤），供身分組編輯器渲染勾選清單
    async getPermissionCatalog() {
        try {
            const response = await api.get('/roles/permissions');
            return response.data.data || [];
        } catch (error) {
            throw unwrap(error);
        }
    },

    async createRole(payload) {
        try {
            const response = await api.post('/roles', payload);
            return response.data;
        } catch (error) {
            throw unwrap(error);
        }
    },

    async updateRole(id, payload) {
        try {
            const response = await api.put(`/roles/${id}`, payload);
            return response.data;
        } catch (error) {
            throw unwrap(error);
        }
    },

    async deleteRole(id) {
        try {
            const response = await api.delete(`/roles/${id}`);
            return response.data;
        } catch (error) {
            throw unwrap(error);
        }
    },

    async getMembers(id) {
        try {
            const response = await api.get(`/roles/${id}/members`);
            return response.data;
        } catch (error) {
            throw unwrap(error);
        }
    },

    // 設定某使用者的完整身分組清單
    async setUserRoles(userId, roleIds) {
        try {
            const response = await api.put(`/users/${userId}/roles`, { roleIds });
            return response.data;
        } catch (error) {
            throw unwrap(error);
        }
    },
};

export default roleService;
