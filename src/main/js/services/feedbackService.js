import api from './api';

const feedbackService = {
    // 送出匿名回饋。需要登入（後端以帳號限流），但送出的內容不帶任何身分資訊，
    // 後端也不會把是誰寫進資料庫——回應刻意只有一句訊息，沒有 id。
    async submit({ body, category }) {
        try {
            const response = await api.post('/feedback', { body, category });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 以下為管理端點，需 feedback.manage 權限

    async getAll({ status, category } = {}) {
        try {
            const params = {};
            if (status) params.status = status;
            if (category) params.category = category;
            const response = await api.get('/feedback', { params });
            return response.data.data || [];
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    async update(id, payload) {
        try {
            const response = await api.patch(`/feedback/${id}`, payload);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    async remove(id) {
        try {
            const response = await api.delete(`/feedback/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },
};

export default feedbackService;
