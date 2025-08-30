-- 更新 exams 資料表結構以支援雙檔案系統
-- 執行前請確認已備份重要資料

-- 刪除舊的 exams 資料表
DROP TABLE IF EXISTS exams;

-- 建立新的 exams 資料表，支援題目檔案（必要）和答案檔案（可選）
CREATE TABLE exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    professor VARCHAR(50),
    year INTEGER NOT NULL,
    semester VARCHAR(10) NOT NULL CHECK(semester IN ('1', '2', 'summer')),
    exam_type VARCHAR(20) NOT NULL CHECK(exam_type IN ('midterm', 'final', 'quiz')),
    exam_attempt INTEGER DEFAULT 1 CHECK(exam_attempt BETWEEN 1 AND 3),
    -- 題目檔案（必要）
    question_file_path VARCHAR(500) NOT NULL,
    question_file_name VARCHAR(255) NOT NULL,
    question_file_size INTEGER,
    -- 答案檔案（可選）
    answer_file_path VARCHAR(500),
    answer_file_name VARCHAR(255),
    answer_file_size INTEGER,
    -- 其他欄位
    uploaded_by INTEGER NOT NULL,
    download_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_exams_course ON exams(course_code, year, semester);
CREATE INDEX idx_exams_uploaded_by ON exams(uploaded_by);

-- 顯示更新完成的資料表結構
.schema exams