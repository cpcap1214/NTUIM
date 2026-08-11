// 語系登錄表。新增語言只要動這個檔案：
//   1. 複製 template.js 成 locales/<語系代碼>.js，把值填上
//   2. 在下面的 LOCALES 與 SUPPORTED_LANGUAGES 各加一筆
// 不需要動任何元件程式碼。
//
// REFERENCE_LANGUAGE 是「key 的真實來源」：
//   - i18next 用它當 fallbackLng，任何語言缺 key 都會回退到它，不會出現空白畫面
//   - src/test/unit/i18n.test.js 用它比對每個語系的 key 集合，缺或多都會讓測試失敗
// 少了那個測試，模板只會慢慢過期；有它才是真的有約束力。

import zhTW from './zh-TW';
import en from './en';

export const REFERENCE_LANGUAGE = 'zh-TW';

export const LOCALES = {
    'zh-TW': zhTW,
    en,
};

// 給語言切換選單用。nativeName 一律用該語言自己的寫法——
// 切到看不懂的語言時，使用者仍要找得到路回來。
export const SUPPORTED_LANGUAGES = [
    { code: 'zh-TW', nativeName: '繁體中文' },
    { code: 'en', nativeName: 'English' },
];

// 把瀏覽器回報的語系（例如 zh-TW / zh-Hant-HK / en-US）對到我們支援的語系。
// 先試完整比對，再退到主要語言標籤，都對不上就回 null 由呼叫端決定預設值。
export const resolveLanguage = (raw) => {
    if (!raw) return null;
    const lower = String(raw).toLowerCase();

    const exact = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === lower);
    if (exact) return exact.code;

    // 任何中文變體（zh-CN / zh-Hant / zh-HK…）都給繁體中文，
    // 總比讓中文使用者掉到英文好
    if (lower.startsWith('zh')) return 'zh-TW';

    const primary = lower.split('-')[0];
    const byPrimary = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase().split('-')[0] === primary);
    return byPrimary ? byPrimary.code : null;
};
