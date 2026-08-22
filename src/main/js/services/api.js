import axios from 'axios';
import { getPreviewTarget, setPreviewTarget } from './previewStorage';

// API 基礎設定 - 使用同源 /api（避免 CORS）
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
// 註：原本這裡還有 UPLOAD_BASE_URL，用來組出 /uploads/... 的直連網址。
// 該靜態服務已移除（它讓任何人不必登入就能下載考古題，繞過付費牆），
// 檔案一律走有認證的 API 端點取得，因此這個常數也一併刪掉，避免有人再組出直連路徑。

// 建立 axios 實例
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // 增加超時時間至15秒，適應手機網路
    headers: {
        'Content-Type': 'application/json'
    }
});

// 預覽目標的存取放在 previewStorage.js（那裡只碰 sessionStorage、不依賴 axios）。
// 這裡再匯出一次，讓既有的 import 位置不用改。
export { getPreviewTarget, setPreviewTarget } from './previewStorage';

// 401 有兩種意思，處理方式剛好相反：
//   (a) session 沒了（AUTH_TOKEN_EXPIRED 之類）→ 清掉本地資料並回登入頁
//   (b) 你剛剛輸入的帳密／舊密碼不對 → 這是那個表單的「答案」，
//       清資料或導頁會把錯誤訊息連同整個頁面一起沖掉，
//       使用者只看到畫面莫名跳一下、然後什麼都沒發生
//
// 刻意用 allowlist 而不是 blocklist：認不得的 401 一律走 (a)。
// 寧可多登出一次，也不要把一個真的失效的 session 留在瀏覽器裡。
const INPUT_REJECTED_CODES = ['CREDENTIALS_INVALID', 'OLD_PASSWORD_INVALID'];

// 請求攔截器 - 自動加入認證 token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // 預覽期間每個請求都帶上目標，後端據此改用對方的權限解析
        const preview = getPreviewTarget();
        if (preview) {
            config.headers['X-Preview-As'] = preview;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 回應攔截器 - 處理錯誤
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // 預覽目標無效就地清掉，否則會卡成無法自行脫困的狀態。
            //
            // previewAs 存在 sessionStorage，只有關閉分頁才會消失。殘留的目標會讓
            // 每個請求都帶上 X-Preview-As；換成非管理員登入後，/users/profile 會回
            // 403 PREVIEW_FORBIDDEN，而 AuthContext 把 403 當成「登入失效」直接登出——
            // 於是變成「登入就被踢出來，重新整理也救不回來」。
            // 這裡自我修復：只要是預覽相關的錯誤，就把目標清掉。
            const errorCode = error.response.data?.errorCode;
            if (typeof errorCode === 'string' && errorCode.startsWith('PREVIEW_')) {
                setPreviewTarget(null);
            }

            // 處理 401 錯誤 - 未授權（但「輸入的帳密不對」不算，見 INPUT_REJECTED_CODES）
            if (error.response.status === 401 && !INPUT_REJECTED_CODES.includes(errorCode)) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
            
            // 處理 403 錯誤 - 需要繳費
            if (error.response.status === 403 && error.response.data.requirePayment) {
                alert('此功能需要繳交系學會費');
            }
        } else if (error.request) {
            // 網路錯誤 - 特別針對手機版的網路問題
            console.error('網路連線錯誤:', error.request);
            error.message = '網路連線失敗，請檢查您的網路連線';
        } else if (error.code === 'ECONNABORTED') {
            // 超時錯誤
            error.message = '請求超時，請檢查網路連線後重試';
        }
        return Promise.reject(error);
    }
);

export default api;