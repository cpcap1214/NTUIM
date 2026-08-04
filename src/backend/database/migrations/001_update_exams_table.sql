-- 安全更新 exams 資料表結構以支援雙檔案系統
-- 此腳本會保留現有資料並更新資料表結構

-- 建立新的資料表結構
CREATE TABLE exams_new (
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

-- 遷移現有資料（假設舊資料表有 file_path, file_name, file_size 欄位）
INSERT INTO exams_new (
    id, course_code, course_name, professor, year, semester, exam_type, exam_attempt,
    question_file_path, question_file_name, question_file_size,
    uploaded_by, download_count, created_at
)
SELECT 
    id, course_code, course_name, professor, year, semester, exam_type, 
    COALESCE(exam_attempt, 1),
    file_path, file_name, file_size,
    uploaded_by, download_count, created_at
FROM exams
WHERE EXISTS (SELECT name FROM sqlite_master WHERE type='table' AND name='exams');

-- 刪除舊資料表
DROP TABLE IF EXISTS exams;

-- 重新命名新資料表
ALTER TABLE exams_new RENAME TO exams;

-- 建立索引以提升查詢效能
CREATE INDEX idx_exams_course ON exams(course_code, year, semester);
CREATE INDEX idx_exams_uploaded_by ON exams(uploaded_by);

-- 顯示更新完成的資料表結構
.schema exams