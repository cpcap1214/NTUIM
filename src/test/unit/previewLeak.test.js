// 身分預覽的殘留狀態不可以外洩到別的登入 session。
//
// 這個 bug 的樣態特別難查：previewAs 存在 sessionStorage，只有關閉分頁才會消失。
// 殘留下來後每個請求都帶 X-Preview-As，非管理員登入時 /users/profile 會回
// 403 PREVIEW_FORBIDDEN，而 AuthContext 把 403 當成「登入失效」直接清掉登入資料——
// 結果是「登入就被踢出來，而且重新整理也救不回來」，畫面上沒有任何線索指向預覽。

// 從 previewStorage 直接匯入，避免測試被迫載入 axios（ESM，CRA jest 不轉譯）
import { setPreviewTarget, getPreviewTarget } from '../../main/js/services/previewStorage';
import authService from '../../main/js/services/authService';

// authService 透過 api.js 拉到 axios（ESM），mock 掉 axios 本身即可
jest.mock('axios', () => ({
    __esModule: true,
    default: {
        create: () => ({
            interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
        }),
    },
}));

describe('預覽目標不會跨 session 殘留', () => {
    beforeEach(() => {
        sessionStorage.clear();
        localStorage.clear();
    });

    test('clearAuthData 會一併清掉預覽目標', () => {
        setPreviewTarget('user:2');
        expect(getPreviewTarget()).toBe('user:2');

        authService.clearAuthData();

        expect(getPreviewTarget()).toBeNull();
    });

    test('登出（走 clearAuthData）之後不再殘留', () => {
        setPreviewTarget('role:1');
        localStorage.setItem('token', 'x');

        authService.clearAuthData();

        expect(getPreviewTarget()).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
    });

    test('setPreviewTarget(null) 真的移除而不是寫入字串 "null"', () => {
        setPreviewTarget('user:5');
        setPreviewTarget(null);
        // 寫成 'null' 字串的話，後端會收到 X-Preview-As: null 並回 400
        expect(sessionStorage.getItem('previewAs')).toBeNull();
        expect(getPreviewTarget()).toBeNull();
    });
});
