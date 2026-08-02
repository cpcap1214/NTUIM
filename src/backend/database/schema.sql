-- 台大資管系學會網站資料庫架構
-- Database: SQLite

-- 使用者資料表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('admin', 'member', 'user')),
    has_paid_fee BOOLEAN DEFAULT FALSE,  -- 是否繳交系學會費
    -- 總務權限：可管理課程評價回饋金的發放狀態（與 role 獨立，可同時是管理員與總務）
    can_manage_payouts BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 考古題資料表
CREATE TABLE exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    professor VARCHAR(50),
    year INTEGER NOT NULL,
    semester VARCHAR(10) NOT NULL CHECK(semester IN ('1', '2', 'summer')),
    exam_type VARCHAR(20) NOT NULL CHECK(exam_type IN ('midterm', 'final', 'quiz')),
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER NOT NULL,
    download_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 大抄資料表
CREATE TABLE cheat_sheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER NOT NULL,
    download_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 課程評價資料表
CREATE TABLE course_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- COLLATE NOCASE：讓比對/分組/唯一性約束忽略大小寫（例如 "Prof. Wang" 跟 "prof. wang"
    -- 視為同一堂課、同一位教授），但實際存進去的原始大小寫仍會保留、顯示時不受影響
    course_code VARCHAR(20) COLLATE NOCASE NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    professor VARCHAR(50) COLLATE NOCASE,
    year INTEGER NOT NULL,
    semester VARCHAR(10) NOT NULL CHECK(semester IN ('1', '2', 'summer')),
    quality DECIMAL(2,1) NOT NULL CHECK(quality >= 0.5 AND quality <= 5),
    difficulty DECIMAL(2,1) NOT NULL CHECK(difficulty >= 0.5 AND difficulty <= 5),
    sweetness DECIMAL(2,1) NOT NULL CHECK(sweetness >= 0.5 AND sweetness <= 5),
    usefulness DECIMAL(2,1) NOT NULL CHECK(usefulness >= 0.5 AND usefulness <= 5),
    course_content TEXT NOT NULL,
    teaching_method TEXT,
    assignment_exam_format TEXT,
    grading_breakdown TEXT,
    comment TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    -- 課程評價有金錢回饋，發布前須經管理員審核
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    reject_reason TEXT,
    reviewed_by INTEGER,
    -- 回饋金發放狀態（只有已核准的評價才有發放意義），由總務部管理
    is_paid BOOLEAN NOT NULL DEFAULT 0,
    paid_at DATETIME,
    paid_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- 同一個人對同一堂課（同課號、同教授、同學年期）只能留一則評價；
    -- 應用層已經有預先檢查，這裡是資料庫層的最後防線，避免連點送出或雙分頁同時送出造成重複
    UNIQUE(course_code, professor, year, semester, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    FOREIGN KEY (paid_by) REFERENCES users(id)
);

-- 課程資訊表 (選擇性，用於資料正規化)
CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    credits INTEGER,
    type VARCHAR(20) CHECK(type IN ('required', 'elective')),
    department VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 台大課程目錄（從 NOL 系所課程查詢頁抓來的課程名稱/代碼/教授/學期，
-- 供「寫課程評價」表單的課程名稱自動完成下拉選單查詢用；用 src/backend/scripts/fetchNtuCourses.js 手動抓取）
CREATE TABLE course_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code VARCHAR(20) COLLATE NOCASE NOT NULL,
    course_name VARCHAR(100) COLLATE NOCASE NOT NULL,
    professor VARCHAR(50) COLLATE NOCASE,
    year INTEGER NOT NULL,
    semester VARCHAR(10) NOT NULL CHECK(semester IN ('1', '2', 'summer')),
    department_code VARCHAR(10),
    department_name VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_code, professor, year, semester)
);
CREATE INDEX idx_course_catalog_name ON course_catalog(course_name);
CREATE INDEX idx_course_catalog_term ON course_catalog(year, semester);

-- 建立索引以提升查詢效能
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_has_paid_fee ON users(has_paid_fee);

CREATE INDEX idx_exams_course ON exams(course_code, year, semester);
CREATE INDEX idx_exams_uploaded_by ON exams(uploaded_by);

CREATE INDEX idx_cheat_sheets_course ON cheat_sheets(course_code);
CREATE INDEX idx_cheat_sheets_uploaded_by ON cheat_sheets(uploaded_by);

CREATE INDEX idx_course_reviews_course ON course_reviews(course_code, year, semester);
CREATE INDEX idx_course_reviews_user ON course_reviews(user_id);
CREATE INDEX idx_course_reviews_status ON course_reviews(status);

-- 建立觸發器來自動更新 updated_at
CREATE TRIGGER update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_course_reviews_timestamp 
AFTER UPDATE ON course_reviews
BEGIN
    UPDATE course_reviews SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;