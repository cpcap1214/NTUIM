// 忘記密碼重設的核心規則。
//
// 刻意零依賴（只用 node 內建的 crypto），跟 config/line.js、config/reviewQuota.js 一樣，
// 才能在前端的測試套件裡直接 require 進來測。

const crypto = require('crypto');

// Email 寄出的連結 30 分鐘內有效：信箱被別人看到的風險隨時間累積，
// 而真的要重設的人通常收到信當下就會點。
const EMAIL_TTL_MS = 30 * 60 * 1000;

// 管理員產生的連結 24 小時內有效：它要經過人工轉交（LINE、當面、其他信箱），
// 30 分鐘常常還沒送到對方手上就過期了。
const ADMIN_TTL_MS = 24 * 60 * 60 * 1000;

// 同一個帳號在這段時間內重複申請不會再寄一封（回應照樣是成功）
const RESEND_COOLDOWN_MS = 60 * 1000;

// 32 bytes 隨機值，base64url（可直接放進網址，不需要再編碼）
const generateResetToken = () => crypto.randomBytes(32).toString('base64url');

// 資料庫只存這個。token 本身是高熵隨機值，不需要 bcrypt 那種慢雜湊——
// 慢雜湊是為了抵抗對「低熵密碼」的暴力猜測，這裡沒有那個問題，
// 而且用 SHA-256 才能直接以 hash 查詢。
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const isExpired = (expiresAt, now = Date.now()) =>
    !expiresAt || new Date(expiresAt).getTime() <= now;

// 目前這組碼是不是「Email 寄出的、而且冷卻時間內才發的」（由到期時間倒推簽發時間）。
//
// 剩餘效期比 Email 的 TTL 還長，代表那是管理員產生的 24 小時連結，不算冷卻：
// 否則只要管理員發過連結，使用者自己按「忘記密碼」會一直被靜默略過，直到那個連結過期。
const isWithinResendCooldown = (expiresAt, now = Date.now()) => {
    if (!expiresAt) return false;
    const remaining = new Date(expiresAt).getTime() - now;
    return remaining <= EMAIL_TTL_MS && remaining > EMAIL_TTL_MS - RESEND_COOLDOWN_MS;
};

// token 放在 # 後面：瀏覽器不會把 fragment 送到伺服器，
// 所以它不會出現在 nginx 的存取紀錄、也不會透過 Referer 外洩。
const buildResetUrl = (token, baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000') =>
    `${String(baseUrl).replace(/\/+$/, '')}/reset-password#token=${encodeURIComponent(token)}`;

// JWT 的 iat（秒）早於最後一次改密碼的時間 → 這個 token 已失效。
// 比較用「秒」取整：改完密碼後同一秒內簽發的新 token（例如 change-password 回傳的）
// iat 會等於 floor(changedAt)，不能被誤判成失效。
// 代價是「改密碼前、同一秒內」簽發的舊 token 也會被放過——窗口不到一秒，可以接受。
const isTokenRevoked = (iat, passwordChangedAt) => {
    if (!passwordChangedAt || typeof iat !== 'number') return false;
    const changedAtSec = Math.floor(new Date(passwordChangedAt).getTime() / 1000);
    return iat < changedAtSec;
};

module.exports = {
    EMAIL_TTL_MS,
    ADMIN_TTL_MS,
    RESEND_COOLDOWN_MS,
    generateResetToken,
    hashToken,
    isExpired,
    isWithinResendCooldown,
    buildResetUrl,
    isTokenRevoked,
};
