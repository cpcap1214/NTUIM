import api from './api';

const announcementService = {
    // 生效中的公告 + 這個帳號已經關掉哪些。公開端點，未登入也能呼叫——
    // 訪客同樣看得到公告，只是 dismissedIds 會是空的，由 announcementStorage 補上。
    async getActive() {
        try {
            const response = await api.get('/announcements/active');
            return {
                announcements: response.data.data || [],
                dismissedIds: response.data.dismissedIds || [],
            };
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 標記「不要再提醒」。只有登入者需要呼叫，訪客只寫 localStorage。
    async dismiss(id) {
        try {
            const response = await api.post(`/announcements/${id}/dismiss`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 以下為管理端點，需 announcements.manage 權限

    // 全部公告（含停用與已過期）
    async getAll() {
        try {
            const response = await api.get('/announcements');
            return response.data.data || [];
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    async create(payload) {
        try {
            const response = await api.post('/announcements', payload);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    async update(id, payload) {
        try {
            const response = await api.put(`/announcements/${id}`, payload);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    async remove(id) {
        try {
            const response = await api.delete(`/announcements/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },
};

export default announcementService;
