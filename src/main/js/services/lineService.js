import api from './api';

const lineService = {
    // 綁定狀態。enabled 為 false 代表伺服器還沒設定 LINE 密鑰——
    // 此時整個區塊要顯示「尚未設定」而不是給一個按了會失敗的按鈕。
    async getBinding() {
        try {
            const response = await api.get('/line/binding');
            return response.data.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 產生一次性綁定碼（10 分鐘、單次）。重複呼叫會覆蓋掉舊的碼。
    async createBindingCode() {
        try {
            const response = await api.post('/line/binding-code');
            return response.data.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    async unbind() {
        try {
            const response = await api.delete('/line/binding');
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },
};

export default lineService;
