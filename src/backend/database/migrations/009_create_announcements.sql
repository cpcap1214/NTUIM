-- 站上公告與「不要再提醒」記錄。
--
-- 沿用 006 的作法：純新增資料表，完全不動 users。
--
-- 為什麼「已讀」要獨立成一張表而不是在 announcements 上放欄位：
-- 這是多對多（每個人各自關掉哪幾則），而且新增公告時不需要為每個使用者預先建列——
-- 沒有記錄就代表沒關過，這是正確的預設值。

CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    -- 只有 info / important 兩級。important 會在視窗上多一個標籤。
    -- 刻意不做更多層級，避免變成沒人用的分類系統。
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    enabled BOOLEAN NOT NULL DEFAULT 1,
    -- 上/下架時間一律存 UTC ISO 8601 字串，NULL = 不限制該側。
    -- 前端的 datetime-local 給的是本地牆上時間，寫入前必須換算，
    -- 否則台灣會整整差 8 小時，而症狀只會是「公告沒跳出來」。
    publish_at DATETIME,
    expire_at DATETIME,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 前台每次載入都會用 enabled + 時間區間過濾，這是唯一的熱查詢
CREATE INDEX IF NOT EXISTS idx_announcements_active
    ON announcements (enabled, publish_at, expire_at);

-- 登入使用者的「不要再提醒」。訪客沒有帳號可綁，那半邊存在 localStorage，
-- 前端讀取時取兩者的聯集（見 services/announcementStorage.js 的說明）。
CREATE TABLE IF NOT EXISTS announcement_dismissals (
    announcement_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    dismissed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- 複合主鍵：同一個人對同一則公告只會有一筆，重複送出不會長出重複列
    PRIMARY KEY (announcement_id, user_id),
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_user
    ON announcement_dismissals (user_id);
