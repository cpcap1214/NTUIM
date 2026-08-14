// 驗收：後端會回傳的每個 errorCode，語言檔裡都要有對應譯文。
//
// 這條測試是「後端加了新錯誤但忘了補譯文」的唯一防線。漏掉不會壞掉——
// translateApiError 會退回後端送來的中文 error 欄位，所以英文使用者會突然看到一句中文，
// 而中文使用者完全察覺不到。掃原始碼比靠人記得可靠。

import fs from 'fs';
import path from 'path';
import zhTW from '../../main/js/i18n/locales/zh-TW';
import en from '../../main/js/i18n/locales/en';

const BACKEND_DIRS = ['src/backend/routes', 'src/backend/middleware'];

const collectCodes = () => {
    const codes = new Set();
    BACKEND_DIRS.forEach((dir) => {
        const abs = path.resolve(process.cwd(), dir);
        if (!fs.existsSync(abs)) return;
        fs.readdirSync(abs)
            .filter((f) => f.endsWith('.js'))
            .forEach((f) => {
                const src = fs.readFileSync(path.join(abs, f), 'utf8');
                // errorCode: 'X'  以及 validator 的 withMessage({ code: 'X', ... })
                [/errorCode:\s*'([A-Z0-9_]+)'/g, /code:\s*'([A-Z0-9_]+)'/g].forEach((re) => {
                    let m;
                    while ((m = re.exec(src)) !== null) codes.add(m[1]);
                });
            });
    });
    return [...codes].sort();
};

const backendCodes = collectCodes();

describe('後端 errorCode 的譯文覆蓋率', () => {
    test('掃到的 errorCode 數量合理（避免正則失效而空過）', () => {
        // 階段 3 補齊後約有 100 個；設低標即可，重點是不能變成 0
        expect(backendCodes.length).toBeGreaterThan(80);
    });

    test('zh-TW 有每個 errorCode 的譯文', () => {
        const missing = backendCodes.filter((c) => !zhTW.errors[c]);
        expect(missing).toEqual([]);
    });

    test('en 有每個 errorCode 的譯文', () => {
        const missing = backendCodes.filter((c) => !en.errors[c]);
        expect(missing).toEqual([]);
    });

    test('帶插值的譯文兩邊都保留同樣的佔位符', () => {
        // 後端會另外送 params；佔位符名字對不上就會在畫面上留下 {{field}} 這種東西
        const placeholders = (v) => (v.match(/\{\{(\w+)\}\}/g) || []).sort().join(',');
        const mismatched = Object.keys(zhTW.errors)
            .filter((k) => en.errors[k])
            .filter((k) => placeholders(zhTW.errors[k]) !== placeholders(en.errors[k]))
            .map((k) => `${k}: zh=${placeholders(zhTW.errors[k])} en=${placeholders(en.errors[k])}`);
        expect(mismatched).toEqual([]);
    });
});
