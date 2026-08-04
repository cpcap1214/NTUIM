import api from './api';

const moduleService = {
    // 取得目前身分可用的模塊清單。這是公開端點，未登入也能呼叫——
    // 登出的訪客同樣需要知道導覽列該顯示哪些項目。
    async getModules() {
        try {
            const response = await api.get('/modules');
            return response.data.data || {};
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 模塊完整設定（含白名單），供模塊管理介面用；需 modules.manage 權限
    async getModuleSettings() {
        try {
            const response = await api.get('/modules/admin');
            return response.data.data || [];
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    async updateModule(key, payload) {
        try {
            const response = await api.put(`/modules/${key}`, payload);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },
};

export default moduleService;
