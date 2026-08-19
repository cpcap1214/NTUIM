// 前後端的評價政策常數必須一致。
//
// 這組數字前端後端各有一份（前端不能 import src/backend——那會把後端程式碼打包進
// bundle）。改一邊忘另一邊不會有任何錯誤：表單放行、伺服器退件，使用者只看到
// 一句對不上自己輸入的錯誤訊息，而開發時本機兩邊都在，很難自然踩到。
//
// 這條測試就是那個「不會有人自然發現」的缺口的唯一防線。

import fs from 'fs';
import path from 'path';

const { CONTENT_LIMITS } = require('../../../backend/config/reviewContent');
const { PAYOUT_AMOUNT } = require('../../../backend/config/reviewQuota');
const { REVIEW_CONTENT_LIMITS, REVIEW_PAYOUT_AMOUNT } = require('../../../main/resources/config/constants');

const read = (rel) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

describe('評價政策常數的前後端一致性', () => {
    test('內容門檻完全一致', () => {
        expect(REVIEW_CONTENT_LIMITS).toEqual(CONTENT_LIMITS);
    });

    test('回饋金金額一致', () => {
        expect(REVIEW_PAYOUT_AMOUNT).toBe(PAYOUT_AMOUNT);
    });

    test('每個欄位都有 min 與 max，且 min < max', () => {
        Object.entries(CONTENT_LIMITS).forEach(([field, { min, max }]) => {
            expect(typeof min).toBe('number');
            expect(typeof max).toBe('number');
            expect(min).toBeLessThan(max);
        });
    });
});

describe('門檻數字不可寫死在譯文裡', () => {
    // 譯文若寫死「至少 50 字」，改門檻時就得同步改四份文案（中英 × 提示與錯誤），
    // 漏一份的症狀是「訊息說 50、伺服器要 100」。一律改用 {{min}} / {{max}} 插值。
    const LOCALES = [
        'src/main/js/i18n/locales/zh-TW.js',
        'src/main/js/i18n/locales/en.js',
    ];

    const CONTENT_KEYS = [
        'courseContentHelper',
        'requiredFieldHelper',
        'commentHelper',
        'COURSE_CONTENT_LENGTH',
        'TEACHING_METHOD_LENGTH',
        'ASSIGNMENT_EXAM_FORMAT_LENGTH',
        'GRADING_BREAKDOWN_LENGTH',
        'COMMENT_LENGTH',
    ];

    test.each(LOCALES)('%s 的字數相關譯文都用插值', (file) => {
        const src = read(file);
        const offenders = [];

        CONTENT_KEYS.forEach((key) => {
            const matched = new RegExp(`\\b${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(src);
            if (!matched) {
                offenders.push(`${key}: 找不到這個 key`);
                return;
            }
            const value = matched[1];
            if (!value.includes('{{min}}') || !value.includes('{{max}}')) {
                offenders.push(`${key}: 缺少 {{min}} 或 {{max}} 插值 → ${value}`);
            }
        });

        expect(offenders).toEqual([]);
    });

    test.each(LOCALES)('%s 的回饋金說明用插值帶入金額', (file) => {
        const src = read(file);
        const matched = /\bhelper:\s*'((?:[^'\\]|\\.)*)'/.exec(src);
        expect(matched).not.toBeNull();
        expect(matched[1]).toContain('{{amount}}');
    });
});

describe('後端驗證器不再寫死數字', () => {
    test('courseReviews.js 的 isLength 一律引用 CONTENT_LIMITS', () => {
        const src = read('src/backend/routes/courseReviews.js');
        // isLength({ min: 5, max: 1000 }) 這種寫法應該完全消失
        const hardcoded = src.match(/isLength\(\s*\{\s*min:\s*\d+/g) || [];
        expect(hardcoded).toEqual([]);
    });
});
