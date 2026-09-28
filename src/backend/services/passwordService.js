// 密碼變更與重設碼的共用邏輯。
//
// 會改密碼的地方有四個：使用者自己改（change-password）、忘記密碼重設、
// 管理員直接設定、管理員產生重設連結後由使用者重設。它們必須做完全一樣的事——
// 尤其是「讓舊的登入全部失效」與「用掉的重設碼要清掉」，漏在任何一條路徑上，
// 那條路徑就成了繞過的方法。所以全部走這裡。

const bcrypt = require('bcryptjs');
const { User } = require('../models');
const {
    generateResetToken,
    hashToken,
    isExpired,
    buildResetUrl,
} = require('../config/passwordReset');

// 寫入新密碼。同時：
//   - password_changed_at = 現在 → 在這之前簽發的 JWT 全部失效（見 middleware/auth.js）
//   - 清掉尚未使用的重設碼 → 密碼都換了，舊的重設連結不該還能用
// 呼叫端若要讓「本人」繼續保持登入，要在這之後重新 generateToken 給他。
const setPassword = async (user, newPassword) => {
    await user.update({
        passwordHash: await bcrypt.hash(newPassword, 10),
        passwordChangedAt: new Date(),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
    });
};

// 產生一組重設碼並寫入（覆蓋舊的，舊連結因此失效）。
// 回傳的 token 原文只會出現在這一次：資料庫裡只有它的 hash。
const issueResetToken = async (user, ttlMs) => {
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + ttlMs);
    await user.update({
        passwordResetTokenHash: hashToken(token),
        passwordResetExpiresAt: expiresAt,
    });
    return { token, url: buildResetUrl(token), expiresAt };
};

// 用重設碼找出使用者。
// status：'ok' | 'invalid'（查無此碼，含已使用過的）| 'expired'
const findByResetToken = async (token) => {
    if (typeof token !== 'string' || token.length === 0) return { status: 'invalid' };
    const user = await User.findOne({ where: { passwordResetTokenHash: hashToken(token) } });
    if (!user) return { status: 'invalid' };
    if (isExpired(user.passwordResetExpiresAt)) return { status: 'expired', user };
    return { status: 'ok', user };
};

const clearResetToken = async (user) => {
    if (!user.passwordResetTokenHash) return;
    await user.update({ passwordResetTokenHash: null, passwordResetExpiresAt: null });
};

module.exports = { setPassword, issueResetToken, findByResetToken, clearResetToken };
