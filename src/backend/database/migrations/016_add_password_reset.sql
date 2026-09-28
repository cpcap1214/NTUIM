-- 忘記密碼重設，以及「改密碼後舊的登入全部失效」。
--
-- 純 ADD COLUMN（理由同 013：users 有 CHECK 約束又被多張表以外鍵參照，不重建）。
-- 重設碼放在 users 上而不是獨立資料表，同 013 的綁定碼：一個人同時只會有一組有效的碼，
-- 重新申請就直接覆蓋，舊連結自然失效，不必另外處理「舊碼還算不算數」。

-- 只存 token 的 SHA-256（hex 64 字元），不存原文。
-- 資料庫外洩時，拿到 hash 也組不出可用的重設連結。
ALTER TABLE users ADD COLUMN password_reset_token_hash VARCHAR(64);
ALTER TABLE users ADD COLUMN password_reset_expires_at DATETIME;

-- 最後一次變更密碼的時間。簽發時間早於它的 JWT 一律視為失效——
-- JWT 本身無狀態，少了這一欄，重設密碼之後偷走的 token 仍可用到過期（最長 7 天）。
-- 既有帳號為 NULL，代表「沒有任何 token 因此失效」。
ALTER TABLE users ADD COLUMN password_changed_at DATETIME;

-- 重設時用 token 的 hash 反查使用者
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token_hash
    ON users (password_reset_token_hash) WHERE password_reset_token_hash IS NOT NULL;
