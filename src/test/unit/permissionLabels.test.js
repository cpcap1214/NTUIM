// 驗收：後端定義的每個權限與分組，語系檔裡都要有對應譯文。
//
// 權限目錄在 src/backend/config/permissions.js，介面上的名稱則取語系檔的
// permissions.<命名空間>.<動作> 與 permissionGroups.<group>。漏補不會壞掉——
// utils/permissions.js 會退回後端的中文 label——所以英文使用者會突然看到一句中文，
// 而中文使用者完全察覺不到。這條測試就是「新增權限但忘了補譯文」的防線。

import zhTW from '../../main/js/i18n/locales/zh-TW';
import en from '../../main/js/i18n/locales/en';

const { PERMISSIONS } = require('../../backend/config/permissions');

const lookup = (locale, path) =>
    path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), locale);

describe.each([
    ['zh-TW', zhTW],
    ['en', en],
])('%s 的權限譯文', (_, locale) => {
    test.each(PERMISSIONS.map((p) => p.key))('%s 有名稱與說明', (key) => {
        expect(lookup(locale, `permissions.${key}.label`)).toEqual(expect.any(String));
        expect(lookup(locale, `permissions.${key}.description`)).toEqual(expect.any(String));
    });

    test.each([...new Set(PERMISSIONS.map((p) => p.group))])('分組 %s 有名稱', (group) => {
        expect(lookup(locale, `permissionGroups.${group}`)).toEqual(expect.any(String));
    });

    test('語系檔裡沒有後端已經不存在的權限', () => {
        const keys = PERMISSIONS.map((p) => p.key);
        const localeKeys = Object.entries(locale.permissions).flatMap(([ns, actions]) =>
            Object.keys(actions).map((action) => `${ns}.${action}`),
        );
        expect(localeKeys.filter((k) => !keys.includes(k))).toEqual([]);
    });
});
