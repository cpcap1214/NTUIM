-- LINE 帳號綁定。
--
-- 為什麼需要綁定：LINE Notify 已於 2025-03-31 終止服務，只能走 Messaging API，
-- 而 Messaging API 的推播必須指名對方的 userId。那個 id 只能從 webhook 事件取得，
-- 所以「綁定」不是額外的便利功能，是能發出任何通知的前提。
--
-- 純 ADD COLUMN，不動 users 的既有欄位（理由同 004：users.role 有 CHECK 約束，
-- SQLite 改不動，而 users 又被 exams / cheat_sheets / course_reviews 以外鍵參照）。

-- LINE 的使用者 ID（U 開頭的 33 字元字串）。NULL = 尚未綁定。
ALTER TABLE users ADD COLUMN line_user_id VARCHAR(64);

-- 一次性綁定碼與其到期時間。綁定成功後兩者都清成 NULL。
-- 存在 users 上而不是獨立資料表：一個人同時只會有一組有效的碼，
-- 獨立資料表反而要自己處理「舊碼要不要失效」。
ALTER TABLE users ADD COLUMN line_binding_code VARCHAR(16);
ALTER TABLE users ADD COLUMN line_binding_expires_at DATETIME;

-- 一個 LINE 帳號只能綁一個系統帳號。
--
-- 用 partial index 而不是在 ADD COLUMN 上寫 UNIQUE：
--   1. SQLite 的 ALTER TABLE ADD COLUMN 加不了 UNIQUE 約束
--   2. WHERE line_user_id IS NOT NULL 明確排除未綁定的列。SQLite 的 UNIQUE 本來就
--      把每個 NULL 視為相異值，這裡寫出來是為了讓意圖明確而不是靠隱含行為
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_line_user_id
    ON users (line_user_id) WHERE line_user_id IS NOT NULL;

-- webhook 收到綁定碼時要反查使用者，這是唯一的熱查詢
CREATE INDEX IF NOT EXISTS idx_users_line_binding_code
    ON users (line_binding_code) WHERE line_binding_code IS NOT NULL;
