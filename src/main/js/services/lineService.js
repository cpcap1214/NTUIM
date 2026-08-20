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

    // 以下兩支需 users.manage 權限。

    // 已綁定的成員名單。回傳不含 lineUserId——畫面只需要知道「這個人綁定了」。
    async getBindings() {
        try {
            const response = await api.get('/line/bindings');
            return response.data.data || [];
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 替他人解除綁定（交接用：離任幹部沒自己解綁的話會繼續收到通知）
    async unbindUser(userId) {
        try {
            const response = await api.delete(`/line/bindings/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },
};

export default lineService;
