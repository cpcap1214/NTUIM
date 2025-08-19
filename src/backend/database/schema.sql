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
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    professor VARCHAR(50),
    year INTEGER NOT NULL,
    semester VARCHAR(10) NOT NULL CHECK(semester IN ('1', '2', 'summer')),
    overall_rating DECIMAL(2,1) NOT NULL CHECK(overall_rating >= 1 AND overall_rating <= 5),
    difficulty INTEGER NOT NULL CHECK(difficulty >= 1 AND difficulty <= 5),
    workload INTEGER NOT NULL CHECK(workload >= 1 AND workload <= 5),
    usefulness INTEGER NOT NULL CHECK(usefulness >= 1 AND usefulness <= 5),
    comment TEXT,
    user_id INTEGER NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
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