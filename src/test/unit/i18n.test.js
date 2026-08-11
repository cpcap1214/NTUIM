// 語系檔的結構檢查。
//
// 這個測試是「模板」真正的約束力所在：少了它，locales/ 底下的檔案只會慢慢漂移——
// 有人在 zh-TW 加了一個 key 卻忘了加到 en，畫面上不會壞（i18next 會回退到中文），
// 所以沒有任何人會發現，直到英文使用者看到一句中文。
//
// 檢查三件事：
//   1. 每個語系的 key 集合與參考語系完全一致（缺 key 與多餘 key 都算錯）
//   2. 型別一致（字串對字串、陣列對陣列、巢狀物件對巢狀物件）
//   3. 沒有空字串值（代表翻譯漏填）

import { LOCALES, REFERENCE_LANGUAGE, SUPPORTED_LANGUAGES, resolveLanguage } from '../../main/js/i18n/locales';
import template from '../../main/js/i18n/locales/template';

// 把巢狀物件攤平成 'a.b.c' 形式的 key 清單。
// 陣列視為一個葉節點並記錄長度——metricTexts 那種「1~5 分文字」的陣列，
// 長度不一致會讓某個分數顯示成 undefined。
const flatten = (node, prefix = '') => {
    const out = {};
    Object.entries(node).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(value)) {
            out[path] = `array(${value.length})`;
        } else if (value && typeof value === 'object') {
            Object.assign(out, flatten(value, path));
        } else {
            out[path] = typeof value;
        }
    });
    return out;
};

const reference = flatten(LOCALES[REFERENCE_LANGUAGE]);
const otherLanguages = Object.keys(LOCALES).filter((code) => code !== REFERENCE_LANGUAGE);

describe('i18n 語系檔結構', () => {
    test('參考語系存在且不是空的', () => {
        expect(LOCALES[REFERENCE_LANGUAGE]).toBeDefined();
        expect(Object.keys(reference).length).toBeGreaterThan(0);
    });

    test.each(otherLanguages)('%s 沒有缺少參考語系的 key', (code) => {
        const missing = Object.keys(reference).filter((key) => !(key in flatten(LOCALES[code])));
        expect(missing).toEqual([]);
    });

    test.each(otherLanguages)('%s 沒有參考語系沒有的多餘 key', (code) => {
        const extra = Object.keys(flatten(LOCALES[code])).filter((key) => !(key in reference));
        expect(extra).toEqual([]);
    });

    test.each(otherLanguages)('%s 的每個 key 型別與參考語系一致', (code) => {
        const target = flatten(LOCALES[code]);
        const mismatched = Object.keys(reference)
            .filter((key) => key in target && target[key] !== reference[key])
            .map((key) => `${key}: 參考=${reference[key]} 實際=${target[key]}`);
        expect(mismatched).toEqual([]);
    });

    test.each(Object.keys(LOCALES))('%s 沒有空字串（漏填的翻譯）', (code) => {
        const empties = [];
        const walk = (node, prefix = '') => {
            Object.entries(node).forEach(([key, value]) => {
                const path = prefix ? `${prefix}.${key}` : key;
                if (Array.isArray(value)) {
                    // metricTexts 的 index 0 是刻意保留的空字串（分數從 1 開始）
                    value.slice(1).forEach((item, i) => {
                        if (item === '') empties.push(`${path}[${i + 1}]`);
                    });
                } else if (value && typeof value === 'object') {
                    walk(value, path);
                } else if (value === '') {
                    empties.push(path);
                }
            });
        };
        walk(LOCALES[code]);
        expect(empties).toEqual([]);
    });

    test('模板的結構與參考語系一致，值全為空', () => {
        // template 是從參考語系衍生的，理論上不可能不一致——
        // 這條是防止有人日後把它改成手動維護的檔案
        expect(Object.keys(flatten(template)).sort()).toEqual(
            Object.keys(reference).sort()
        );
        const nonEmpty = [];
        const walk = (node, prefix = '') => {
            Object.entries(node).forEach(([key, value]) => {
                const path = prefix ? `${prefix}.${key}` : key;
                if (Array.isArray(value)) {
                    value.forEach((item, i) => { if (item !== '') nonEmpty.push(`${path}[${i}]`); });
                } else if (value && typeof value === 'object') {
                    walk(value, path);
                } else if (value !== '') {
                    nonEmpty.push(path);
                }
            });
        };
        walk(template);
        expect(nonEmpty).toEqual([]);
    });

    test('SUPPORTED_LANGUAGES 與 LOCALES 一一對應', () => {
        expect(SUPPORTED_LANGUAGES.map((l) => l.code).sort()).toEqual(Object.keys(LOCALES).sort());
        SUPPORTED_LANGUAGES.forEach((lang) => {
            expect(typeof lang.nativeName).toBe('string');
            expect(lang.nativeName.length).toBeGreaterThan(0);
        });
    });
});

describe('resolveLanguage', () => {
    test.each([
        ['zh-TW', 'zh-TW'],
        ['zh-tw', 'zh-TW'],
        ['en', 'en'],
        ['en-US', 'en'],
        // 任何中文變體都給繁體中文，總比掉到英文好
        ['zh-CN', 'zh-TW'],
        ['zh-Hant-HK', 'zh-TW'],
    ])('%s → %s', (input, expected) => {
        expect(resolveLanguage(input)).toBe(expected);
    });

    test.each([[null], [undefined], [''], ['ja'], ['de-DE']])('不支援的 %s 回 null，由呼叫端決定預設值', (input) => {
        expect(resolveLanguage(input)).toBeNull();
    });
});
