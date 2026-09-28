// 忘記密碼重設的核心規則。config/passwordReset.js 零依賴（只用 node 內建 crypto），
// 所以能在前端的測試套件裡直接 require（理由同 reviewQuota.test.js）。
const {
    EMAIL_TTL_MS,
    ADMIN_TTL_MS,
    RESEND_COOLDOWN_MS,
    generateResetToken,
    hashToken,
    isExpired,
    isWithinResendCooldown,
    buildResetUrl,
    isTokenRevoked,
} = require('../../../backend/config/passwordReset');

describe('generateResetToken / hashToken', () => {
    test('token 夠長、可以直接放進網址、每次都不同', () => {
        const tokens = new Set(Array.from({ length: 50 }, generateResetToken));
        expect(tokens.size).toBe(50);
        tokens.forEach((t) => {
            expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes 的 base64url
        });
    });

    test('hash 固定且不等於原文（資料庫只存 hash）', () => {
        const token = generateResetToken();
        expect(hashToken(token)).toBe(hashToken(token));
        expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
        expect(hashToken(token)).not.toContain(token);
    });
});

describe('isExpired', () => {
    const now = Date.parse('2026-09-28T12:00:00Z');

    test('沒有到期時間一律視為過期', () => {
        expect(isExpired(null, now)).toBe(true);
    });

    test('到期那一刻就算過期', () => {
        expect(isExpired(new Date(now), now)).toBe(true);
        expect(isExpired(new Date(now + 1000), now)).toBe(false);
    });
});

describe('isWithinResendCooldown', () => {
    const now = Date.parse('2026-09-28T12:00:00Z');

    test('Email 連結剛寄出（冷卻時間內）→ 不重寄', () => {
        expect(isWithinResendCooldown(new Date(now + EMAIL_TTL_MS - 10 * 1000), now)).toBe(true);
    });

    test('超過冷卻時間 → 可以再寄', () => {
        const issuedLongAgo = new Date(now + EMAIL_TTL_MS - RESEND_COOLDOWN_MS - 1000);
        expect(isWithinResendCooldown(issuedLongAgo, now)).toBe(false);
    });

    // 實際踩到的 bug：原本用 Email 的 TTL 倒推簽發時間，管理員的 24 小時連結會被算成
    // 「未來才簽發」，於是永遠在冷卻中——使用者自己按忘記密碼一直沒有信，直到那個連結過期
    test('管理員產生的 24 小時連結不算冷卻，使用者仍能自己申請寄信', () => {
        expect(isWithinResendCooldown(new Date(now + ADMIN_TTL_MS), now)).toBe(false);
    });

    test('沒有待用的碼 → 不在冷卻', () => {
        expect(isWithinResendCooldown(null, now)).toBe(false);
    });
});

describe('buildResetUrl', () => {
    test('token 放在 # 後面，不會隨請求送到伺服器', () => {
        const url = buildResetUrl('abc_DEF-123', 'https://ntu.im');
        expect(url).toBe('https://ntu.im/reset-password#token=abc_DEF-123');
        expect(new URL(url).search).toBe('');
    });

    test('網址結尾多的斜線會被去掉', () => {
        expect(buildResetUrl('t', 'https://ntu.im/')).toBe('https://ntu.im/reset-password#token=t');
    });
});

describe('isTokenRevoked', () => {
    const changedAt = new Date('2026-09-28T12:00:00.700Z');
    const changedSec = Math.floor(changedAt.getTime() / 1000);

    test('從沒改過密碼 → 不失效', () => {
        expect(isTokenRevoked(changedSec - 1000, null)).toBe(false);
    });

    test('改密碼之前簽發的 token 失效', () => {
        expect(isTokenRevoked(changedSec - 1, changedAt)).toBe(true);
    });

    // change-password 改完密碼後立刻簽新 token 回傳，兩者常落在同一秒
    test('改密碼那一秒內簽發的新 token 仍有效', () => {
        expect(isTokenRevoked(changedSec, changedAt)).toBe(false);
        expect(isTokenRevoked(changedSec + 1, changedAt)).toBe(false);
    });
});
