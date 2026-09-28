// 權限字串的比對規則（萬用字元展開）。
//
// config/permissions.js 零依賴，所以能在前端的測試套件裡直接 require（理由同 reviewQuota.test.js）。
// 這兩個函式是整個授權系統的地基：requirePermission、身分預覽的交集、
// 前端拿到的權限清單全都經過它們。
const {
    PERMISSIONS,
    PERMISSION_KEYS,
    WILDCARD,
    permissionSatisfies,
    expandPermissions,
} = require('../../../backend/config/permissions');

describe('permissionSatisfies', () => {
    test('沒有任何權限時一律不滿足', () => {
        expect(permissionSatisfies(new Set(), 'users.manage')).toBe(false);
        expect(permissionSatisfies(undefined, 'users.manage')).toBe(false);
    });

    test("'*' 滿足任何權限", () => {
        const held = new Set([WILDCARD]);
        PERMISSION_KEYS.forEach((key) => expect(permissionSatisfies(held, key)).toBe(true));
    });

    test('完全相同的 key 才滿足，不會前綴誤判', () => {
        const held = new Set(['exams.upload']);
        expect(permissionSatisfies(held, 'exams.upload')).toBe(true);
        expect(permissionSatisfies(held, 'exams.manage')).toBe(false);
    });

    test("'namespace.*' 只涵蓋同一個命名空間", () => {
        const held = new Set(['exams.*']);
        expect(permissionSatisfies(held, 'exams.download')).toBe(true);
        expect(permissionSatisfies(held, 'cheatSheets.manage')).toBe(false);
    });
});

describe('expandPermissions', () => {
    test("'*' 展開成全部的 key，但不含 '*' 本身", () => {
        // 前端因此無法從展開後的清單判斷是不是管理員，必須看後端另外給的 isAdmin
        const expanded = expandPermissions(new Set([WILDCARD]));
        expect(expanded.sort()).toEqual([...PERMISSION_KEYS].sort());
        expect(expanded).not.toContain(WILDCARD);
    });

    test("'namespace.*' 展開成該命名空間的全部 key", () => {
        expect(expandPermissions(new Set(['courseReviews.*'])).sort()).toEqual([
            'courseReviews.moderate',
            'courseReviews.payout',
        ]);
    });

    test('資料庫殘留的已刪除權限會被忽略，不會讓解析失敗', () => {
        expect(expandPermissions(new Set(['exams.upload', 'legacy.removed']))).toEqual([
            'exams.upload',
        ]);
    });
});

describe('權限目錄', () => {
    test('每個權限的 group 都是固定的分組 key（介面文字在語系檔）', () => {
        const groups = new Set(PERMISSIONS.map((p) => p.group));
        expect([...groups].sort()).toEqual(['cheatSheets', 'courseReviews', 'exams', 'system']);
    });

    test('key 不重複，且都是 <命名空間>.<動作> 格式', () => {
        expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
        PERMISSION_KEYS.forEach((key) => expect(key).toMatch(/^[a-zA-Z]+\.[a-zA-Z]+$/));
    });
});
