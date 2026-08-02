-- 新建 course_catalog 資料表：台大課程目錄（課程名稱/代碼/教授/學期）
-- 從台大 NOL 系所課程查詢頁（nol.ntu.edu.tw，非官方但公開、無需登入的舊版課程系統）抓取，
-- 用 src/backend/scripts/fetchNtuCourses.js 手動執行、每學期重新抓一次。
-- 供「寫課程評價」表單的課程名稱自動完成下拉選單查詢用（GET /api/course-catalog/search）。
--
-- course_code / course_name / professor 用 COLLATE NOCASE，跟 course_reviews 一樣的慣例，
-- 比對時忽略大小寫；UNIQUE(course_code, professor, year, semester) 讓爬蟲重複執行時可以用
-- upsert 更新既有列，不會產生重複資料。
--
-- 這是新表，不影響任何既有資料，不需要 DROP 現有資料表。
--
-- 執行方式（在 src/backend/database 目錄下）：
--   sqlite3 ntuim.db < create_course_catalog_table.sql

CREATE TABLE IF NOT EXISTS course_catalog (
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

CREATE INDEX IF NOT EXISTS idx_course_catalog_name ON course_catalog(course_name);
CREATE INDEX IF NOT EXISTS idx_course_catalog_term ON course_catalog(year, semester);
