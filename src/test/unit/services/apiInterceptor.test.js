// api.js 回應攔截器對 401 的處理。
//
// 為什麼要直接測攔截器，而不是從登入頁測：
// loginSmoke.test.js 把整個 axios mock 掉了，那裡的 interceptors.response.use
// 只是個 jest.fn()，真正的攔截器根本沒被註冊、也就從來沒被執行過。
// 這個 bug（登入失敗被當成 session 過期、整頁重載）就是這樣躲過既有測試的。
//
// 作法：沿用同一種 axios mock 形狀，import api.js 讓它把攔截器註冊上去，
// 再從 mock 的呼叫紀錄裡把「錯誤處理器」挖出來直接呼叫。

// axios 是 ESM，CRA 的 jest 不轉譯 node_modules
jest.mock('axios', () => {
    const instance = {
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
        post: jest.fn(),
        get: jest.fn(),
    };
    return { __esModule: true, default: { create: () => instance }, __instance: instance };
});

import '../../../main/js/services/api';

const instance = require('axios').__instance;

// interceptors.response.use(onFulfilled, onRejected) 的第二個參數
const onRejected = instance.interceptors.response.use.mock.calls[0][1];

const reject = (status, errorCode) =>
    onRejected({ response: { status, data: errorCode ? { errorCode } : {} } });

describe('api.js 401 攔截器', () => {
    let originalLocation;

    beforeAll(() => {
        // jsdom 不允許真的導覽，直接指定 location.href 會噴 "Not implemented"。
        // 換成普通物件才能斷言「有沒有導頁」。
        originalLocation = window.location;
        Object.defineProperty(window, 'location', {
            value: { href: '' },
            configurable: true,
            writable: true,
        });
    });

    afterAll(() => {
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            configurable: true,
            writable: true,
        });
    });

    beforeEach(() => {
        localStorage.setItem('token', 'tok');
        localStorage.setItem('user', '{"id":1}');
        window.location.href = '';
    });

    afterEach(() => {
        localStorage.clear();
    });

    // ── 輸入錯誤：不該登出、不該導頁 ────────────────────────────────
    //
    // 這兩條是這次修正的迴歸測試。原本的行為是整頁重載到 /login，
    // 使用者連「帳號或密碼錯誤」都看不到。

    test('登入帳密錯誤（CREDENTIALS_INVALID）不清資料也不導頁', async () => {
        await expect(reject(401, 'CREDENTIALS_INVALID')).rejects.toBeDefined();

        expect(localStorage.getItem('token')).toBe('tok');
        expect(localStorage.getItem('user')).toBe('{"id":1}');
        expect(window.location.href).toBe('');
    });

    test('改密碼舊密碼錯誤（OLD_PASSWORD_INVALID）不會把人登出', async () => {
        await expect(reject(401, 'OLD_PASSWORD_INVALID')).rejects.toBeDefined();

        expect(localStorage.getItem('token')).toBe('tok');
        expect(window.location.href).toBe('');
    });

    // ── session 真的沒了：維持原本行為 ──────────────────────────────

    test('token 過期仍然清掉本地資料並導回登入頁', async () => {
        await expect(reject(401, 'AUTH_TOKEN_EXPIRED')).rejects.toBeDefined();

        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
        expect(window.location.href).toBe('/login');
    });

    // allowlist 而非 blocklist 的用意：認不得的 401 一律當成 session 失效。
    // 寧可多登出一次，也不要把一個已經無效的 session 留在瀏覽器裡。
    test('沒有 errorCode 的 401 走登出（fail-safe）', async () => {
        await expect(reject(401)).rejects.toBeDefined();

        expect(localStorage.getItem('token')).toBeNull();
        expect(window.location.href).toBe('/login');
    });

    test('非 401 不動本地資料', async () => {
        await expect(reject(500, 'DATABASE_ERROR')).rejects.toBeDefined();

        expect(localStorage.getItem('token')).toBe('tok');
        expect(window.location.href).toBe('');
    });
});
