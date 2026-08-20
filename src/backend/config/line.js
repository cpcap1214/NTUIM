// LINE Messaging API 的設定與綁定碼規則。
//
// 刻意零依賴（不 import models、不 import sequelize），理由同 config/reviewQuota.js：
// src/backend 底下沒有測試基礎設施，而 CRA 的 test runner 會把 src/ 下所有 *.test.js
// 掃進去用 jsdom 跑，一旦 require 到 sqlite3 就會炸。可測的純邏輯全部留在這裡。

const crypto = require('crypto');

// 兩個密鑰都有才算啟用。
//
// 未設定時整套通知是 no-op，這是必要的而不是保險：本機開發與測試環境不會有 token，
// 少了這個開關，每次送出評價都會在 console 噴一次錯誤。
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';

const isEnabled = () => Boolean(CHANNEL_ACCESS_TOKEN && CHANNEL_SECRET);

// --- 綁定碼 ---------------------------------------------------------------

// 排除容易看錯或打錯的字元：0/O、1/I/l。使用者要在手機上把這串字打進 LINE，
// 少了這一步，「我明明打對了」的客訴會比綁定成功的次數還多。
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const CODE_TTL_MS = 10 * 60 * 1000;

// 用 crypto.randomInt 而不是 Math.random：這串碼在有效期內等同於帳號的臨時憑證，
// 可預測的亂數等於任何人都能猜到別人的碼並綁走他的帳號。
const generateBindingCode = () => {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
        code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
    }
    return code;
};

const bindingCodeExpiry = (from = Date.now()) => new Date(from + CODE_TTL_MS);

const isBindingCodeExpired = (expiresAt, now = Date.now()) => {
    if (!expiresAt) return true;
    const time = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
    if (Number.isNaN(time)) return true;
    return time <= now;
};

// 使用者可能連同空白或小寫一起貼上來，正規化之後再比對
const normalizeBindingCode = (raw) => String(raw ?? '').trim().toUpperCase();

// --- 簽章 -----------------------------------------------------------------

// 驗證 LINE webhook 的 X-Line-Signature。
//
// ⚠️ rawBody 必須是「原始位元組」。把解析後的物件再 JSON.stringify 回去是行不通的：
// 鍵的順序、空白、Unicode 逸出都可能與原文不同，簽章一定對不上。
// 原始 buffer 由 server.js 的 express.json({ verify }) 保存在 req.rawBody。
//
// 未設定 CHANNEL_SECRET 時一律回 false。「沒設定就放行」會讓一個忘了填環境變數的
// 部署變成任何人都能偽造事件的公開端點。
const verifySignature = (rawBody, signature) => {
    if (!CHANNEL_SECRET || !rawBody || !signature) return false;

    const expected = crypto
        .createHmac('sha256', CHANNEL_SECRET)
        .update(rawBody)
        .digest();

    let received;
    try {
        received = Buffer.from(String(signature), 'base64');
    } catch (error) {
        return false;
    }

    // timingSafeEqual 在長度不等時會拋例外，必須先擋掉——
    // 讓它拋出去的話，一個長度不對的假簽章就會變成 500 而不是 401
    if (received.length !== expected.length) return false;
    return crypto.timingSafeEqual(received, expected);
};

module.exports = {
    CHANNEL_ACCESS_TOKEN,
    CHANNEL_SECRET,
    CODE_ALPHABET,
    CODE_LENGTH,
    CODE_TTL_MS,
    isEnabled,
    generateBindingCode,
    bindingCodeExpiry,
    isBindingCodeExpired,
    normalizeBindingCode,
    verifySignature,
};
