// 回饋系統的匿名性守門測試。
//
// 這條測試守的不是某個行為，而是一個承諾:「送出回饋的人不會被記錄」。
//
// 這種承諾特別脆弱——它不會因為被破壞而壞掉。哪天有人為了「處理濫用」或
// 「想回覆對方」在 feedback 加上 user_id，功能一切正常、測試全綠、畫面也沒變，
// 只有使用者對匿名的信任被默默拿走了，而且沒有人會發現。
//
// 所以這裡直接檢查 schema 與模型的原始碼，而不是檢查行為。
// 要讓這條測試變綠的唯一方法，就是真的把欄位拿掉。

import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

// 編號是 012 而不是 010：main 上已經有 010_add_review_quota / 011_add_payout_declined
const MIGRATION = 'src/backend/database/migrations/012_create_feedback.sql';
const MODEL = 'src/backend/models/index.js';
const ROUTE = 'src/backend/routes/feedback.js';

// 只取 CREATE TABLE feedback (...) 那一段，避免掃到註解裡刻意寫的 "user_id"
const feedbackTableDDL = () => {
    const sql = read(MIGRATION);
    const match = /CREATE TABLE IF NOT EXISTS feedback\s*\(([\s\S]*?)\n\);/.exec(sql);
    if (!match) throw new Error(`在 ${MIGRATION} 裡找不到 feedback 的 CREATE TABLE`);
    // 逐行去掉 SQL 註解
    return match[1]
        .split('\n')
        .map((line) => line.replace(/--.*$/, '').trim())
        .filter(Boolean)
        .join('\n');
};

// 同理，只取 sequelize.define('Feedback', {...}) 的欄位定義
const feedbackModelFields = () => {
    const src = read(MODEL);
    const match = /sequelize\.define\('Feedback',\s*\{([\s\S]*?)\n\}/.exec(src);
    if (!match) throw new Error(`在 ${MODEL} 裡找不到 Feedback 模型`);
    return match[1]
        .split('\n')
        .map((line) => line.replace(/\/\/.*$/, '').trim())
        .filter(Boolean)
        .join('\n');
};

const IDENTITY_PATTERNS = [
    /user_id/i,
    /userId/,
    /student_id/i,
    /studentId/,
    /\bemail\b/i,
    /submitted_by/i,
    /submittedBy/,
    /\bip_address\b/i,
    /author/i,
];

describe('回饋的匿名性', () => {
    test('feedback 資料表沒有任何可識別送出者的欄位', () => {
        const ddl = feedbackTableDDL();
        const found = IDENTITY_PATTERNS.filter((re) => re.test(ddl)).map(String);
        expect(found).toEqual([]);
    });

    test('Feedback 模型沒有任何可識別送出者的欄位', () => {
        const fields = feedbackModelFields();
        const found = IDENTITY_PATTERNS.filter((re) => re.test(fields)).map(String);
        expect(found).toEqual([]);
    });

    test('Feedback 模型沒有指向 User 的關聯', () => {
        const src = read(MODEL);
        // Feedback.belongsTo(User...) / User.hasMany(Feedback...) 都不該存在
        expect(src).not.toMatch(/Feedback\.(belongsTo|hasOne|hasMany|belongsToMany)\s*\(\s*User/);
        expect(src).not.toMatch(/User\.(hasMany|hasOne)\s*\(\s*Feedback/);
    });

    test('建立回饋時沒有把 req.user 寫進資料列', () => {
        const src = read(ROUTE);
        const create = /Feedback\.create\(\{([\s\S]*?)\}\)/.exec(src);
        expect(create).not.toBeNull();
        // 註解裡會提到 req.user，所以先去掉註解再檢查
        const body = create[1].replace(/\/\/.*$/gm, '');
        expect(body).not.toMatch(/req\.user/);
    });

    test('送出回饋的回應不回傳建立出來的資料列', () => {
        // 回傳 id 等於給出一條把後台某一筆對回「剛才是誰送的」的線索
        const src = read(ROUTE);
        const postHandler = /router\.post\('\/'[\s\S]*?^\);/m.exec(src);
        expect(postHandler).not.toBeNull();
        expect(postHandler[0]).toMatch(/res\.status\(201\)\.json\(\{\s*message:/);
        expect(postHandler[0]).not.toMatch(/res\.status\(201\)\.json\(\{[^}]*data:/);
    });

    test('要求登入仍然存在（限流的前提）', () => {
        // 匿名不等於開放匿名寫入：仍然需要帳號，只是不記錄。
        // 把 authenticateToken 拿掉會讓這個端點變成全站唯一的免認證寫入點。
        const src = read(ROUTE);
        expect(src).toMatch(/router\.post\('\/',\s*\n?\s*authenticateToken/);
        expect(src).toMatch(/feedbackLimiter/);
    });
});
