-- 匿名意見回饋。
--
-- ⚠️⚠️ 這張表刻意「沒有」user_id 欄位，而且請不要加上去。⚠️⚠️
--
-- 匿名是對使用者的承諾，不是介面上的裝飾。只要欄位存在，日後一定會有人
-- 為了「處理濫用」「想回覆對方」而去查它——承諾就破了，而使用者無從得知。
-- 唯一可靠的保證是資料庫裡根本沒有那個欄位。
--
-- 送出時要求登入，只用於兩件事：
--   1. 擋掉沒有帳號的洪水攻擊
--   2. 以帳號為單位限流（middleware/rateLimits.js）
-- 限流器的計數活在記憶體裡，不落地。「誰送的」從來沒有寫進資料庫。
--
-- 已知的殘餘風險（有伺服器權限者）：nginx access log 會記錄每個請求的 IP 與時間，
-- 理論上可以拿 created_at 去對時間。要完全消除得模糊時間戳，那會讓後台無法排序，
-- 因此選擇保留完整時間並在管理介面明確標註不得回推來源。
-- src/test/unit/feedbackAnonymity.test.js 會斷言這張表沒有可識別送出者的欄位，
-- 而且那條測試已經做過變異驗證：加回 user_id 它真的會紅。

CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- bug（錯誤回報）/ suggestion（功能建議）/ other（其他）
    category VARCHAR(20) NOT NULL DEFAULT 'other',
    body TEXT NOT NULL,
    -- new（未讀）/ read（已讀）/ resolved（已處理）
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    -- 管理員內部備註，使用者看不到（前台根本沒有讀取回饋的端點）
    admin_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 後台預設只看未處理的，這是唯一的熱查詢
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback (status, created_at);
