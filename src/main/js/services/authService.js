import api, { setPreviewTarget } from './api';

const authService = {
    // 儲存目前使用者資料
    setCurrentUser(userData) {
        try {
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (storageError) {
            console.warn('儲存使用者資料失敗，可能是私人瀏覽模式:', storageError);
        }
    },

    // 清除本地認證資料
    clearAuthData() {
        // 預覽目標屬於「發起它的那個管理員 session」，換身分時必須一起清掉。
        // 少了這行，殘留在 sessionStorage 的目標會讓下一個人的每個請求都帶
        // X-Preview-As，非管理員登入後 /users/profile 會 403，看起來就是登入失敗。
        setPreviewTarget(null);
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch (error) {
            // iOS Safari 私人瀏覽模式下可能會出錯
            console.warn('localStorage 清除失敗:', error);
        }
    },

    // 註冊
    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData);
            if (response.data.token) {
                try {
                    localStorage.setItem('token', response.data.token);
                    this.setCurrentUser(response.data.user);
                } catch (storageError) {
                    console.warn('儲存使用者資料失敗，可能是私人瀏覽模式:', storageError);
                    // 即使無法儲存到 localStorage，仍然可以繼續使用（只是重新整理後會需要重新登入）
                }
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
            // 換身分登入時同樣要清；使用者不一定會先登出
            setPreviewTarget(null);
            if (response.data.token) {
                try {
                    localStorage.setItem('token', response.data.token);
                    this.setCurrentUser(response.data.user);
                } catch (storageError) {
                    console.warn('儲存使用者資料失敗，可能是私人瀏覽模式:', storageError);
                    // 即使無法儲存到 localStorage，仍然可以繼續使用
                }
            }
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 登出
    logout() {
        this.clearAuthData();
        window.location.href = '/login';
    },

    // 修改密碼（需登入，身分由 token 決定，不再傳 username）
    async changePassword(oldPassword, newPassword) {
        try {
            const response = await api.post('/auth/change-password', {
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
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.warn('讀取使用者資料失敗:', error);
            return null;
        }
    },

    // 取得 Token
    getToken() {
        try {
            return localStorage.getItem('token');
        } catch (error) {
            console.warn('讀取 token 失敗:', error);
            return null;
        }
    },

    // 檢查是否已登入
    isAuthenticated() {
        return !!this.getToken();
    },

    // 檢查是否為管理員。
    // 與 AuthContext 同一套判斷：以後端解析的 isAdmin 為準，舊的 role 欄位只當退路，
    // 因為它不會隨身分組更新（理由見 AuthContext 的說明）。
    isAdmin() {
        const user = this.getCurrentUser();
        return user?.isAdmin ?? (user?.role === 'admin');
    },

    // 檢查是否已繳費
    hasPaidFee() {
        const user = this.getCurrentUser();
        return user?.hasPaidFee || false;
    },

    // 更新本地使用者資料
    updateLocalUser(userData) {
        const currentUser = this.getCurrentUser() || {};
        const updatedUser = { ...currentUser, ...userData };
        this.setCurrentUser(updatedUser);
    }
};

export default authService;
