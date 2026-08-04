-- 課程評價回饋金發放追蹤
--
-- 撰寫課程評價有金錢回饋，需要由總務部的人管理「這篇的錢發了沒」。
-- 發放狀態直接掛在評價紀錄上（單一真相來源），並記錄是誰、什麼時候按下發放（稽核用）。
--
-- 權限刻意「不」擴充 users.role 這個 ENUM：role 欄位有 CHECK 約束，SQLite 無法直接修改
-- CHECK，要加新角色就得整張 users 表重建，而 users 正被 exams / cheat_sheets /
-- course_reviews 以外鍵參照，風險過高。改用獨立的布林旗標 can_manage_payouts，
-- 用 ADD COLUMN 就能安全加上，而且一個人可以同時是管理員與總務，兩者不互斥。
--
-- 注意：ALTER TABLE ADD COLUMN 不具冪等性，重複執行會出現 "duplicate column name" 錯誤。
-- 現已改由遷移執行器管理（schema_migrations 帳本會確保每個檔案只套用一次）。
--
-- 執行方式：在 src/backend 目錄下執行 `npm run migrate`。

-- 總務權限：可管理回饋金發放狀態
ALTER TABLE users ADD COLUMN can_manage_payouts BOOLEAN NOT NULL DEFAULT 0;

-- 發放狀態（只有已核准的評價才有發放的意義）
ALTER TABLE course_reviews ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE course_reviews ADD COLUMN paid_at DATETIME;
-- 外鍵欄位用 ADD COLUMN 時預設值必須是 NULL（SQLite 限制），這裡不給預設值即為 NULL
ALTER TABLE course_reviews ADD COLUMN paid_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_course_reviews_payout ON course_reviews(is_paid);
