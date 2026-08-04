-- 身分組（Discord 式）與模塊存取控制的資料表。
--
-- 設計重點：全部是「新增資料表」，完全不動 users 的任何欄位。
-- users.role 有 CHECK 約束，SQLite 無法直接修改，而 users 又被 exams / cheat_sheets /
-- course_reviews 以外鍵參照，重建整張表風險過高（can_manage_payouts 當初被迫做成
-- 布林欄位就是這個原因）。因此權限改走獨立的關聯表，舊欄位保留但停用。
--
-- 權限「種類」不落成資料表，定義在 src/backend/config/permissions.js。
-- role_permissions.permission 只存字串，刻意不對程式碼常數建外鍵——
-- 程式碼刪掉某個權限時，資料庫殘留的舊 key 在解析時會被忽略，不該讓整個查詢失敗。

-- 身分組
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(50) NOT NULL UNIQUE COLLATE NOCASE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    priority INTEGER NOT NULL DEFAULT 0,
    -- is_system：內建身分組，不允許刪除或改 key
    is_system BOOLEAN NOT NULL DEFAULT 0,
    -- is_auto：成員資格由系統自動推導，不可手動指派（目前只有「會員」＝已繳費）
    is_auto BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 身分組持有的權限
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission VARCHAR(50) NOT NULL,
    PRIMARY KEY (role_id, permission),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 使用者↔身分組（多對多，一個人可以有多個身分組）
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- 功能模塊
CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(50) NOT NULL UNIQUE COLLATE NOCASE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    -- public：所有人可用（此時 module_access 白名單一律忽略）
    -- restricted：僅白名單內的身分組/使用者可用；持有 '*' 的管理員永遠可用（才能在未公開前測試）
    visibility VARCHAR(20) NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'restricted')),
    -- 受限時，無權限者是否仍在選單看得到入口（標示「即將推出」）
    show_when_restricted BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 模塊存取白名單：可指定身分組，也可指定個別使用者
CREATE TABLE IF NOT EXISTS module_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    role_id INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_module_access_module ON module_access(module_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_module_access_role ON module_access(module_id, role_id) WHERE role_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_module_access_user ON module_access(module_id, user_id) WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 內建身分組
-- 刻意「不」建立「一般用戶」身分組：沒有任何身分組就是預設狀態，
-- 一個什麼權限都不給的身分組只會在每個清單與介面裡製造雜訊。
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO roles (key, name, description, color, priority, is_system, is_auto) VALUES
    ('admin', '管理員', '擁有全站所有權限', '#d32f2f', 100, 1, 0),
    ('treasurer', '總務', '管理課程評價回饋金的發放狀態', '#7b1fa2', 50, 1, 0),
    ('member', '會員', '已繳交系學會費的會員（依繳費狀態自動判定，不可手動指派）', '#1976d2', 10, 1, 1);

INSERT OR IGNORE INTO role_permissions (role_id, permission)
    SELECT id, '*' FROM roles WHERE key = 'admin';

INSERT OR IGNORE INTO role_permissions (role_id, permission)
    SELECT id, 'courseReviews.payout' FROM roles WHERE key = 'treasurer';

-- 會員只給考古題下載。刻意不給 cheatSheets 相關權限：
-- 目前大抄的預覽/下載只需登入、不需繳費（requirePaidMember 只掛在考古題的 4 條路由），
-- 若把大抄也綁進會員身分組，等於悄悄收緊了現有權限。維持現狀，是否對齊由產品決定。
INSERT OR IGNORE INTO role_permissions (role_id, permission)
    SELECT id, 'exams.download' FROM roles WHERE key = 'member';

-- ---------------------------------------------------------------------------
-- 模塊：一律先設為 public，維持現狀，不改變任何人現有的存取權
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO modules (key, name, description, visibility, show_when_restricted) VALUES
    ('exams', '考古題', '考古題庫瀏覽與下載', 'public', 1),
    ('cheatSheets', '大抄', '課程重點整理瀏覽與下載', 'public', 1),
    ('courseReviews', '課程評價', '課程評價瀏覽與撰寫', 'public', 1);
