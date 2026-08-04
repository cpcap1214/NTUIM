-- 重建 course_reviews 資料表
-- 四項評分欄位（課程品質 quality / 難易度 difficulty / 給分高低 sweetness / 實用性 usefulness）
-- 分數區間為 0.5~5，精度 0.5（DECIMAL(2,1)）
-- 心得（comment）改為必填
-- 新增 status（pending/approved/rejected）、reject_reason、reviewed_by 欄位：
-- 因為撰寫課程評價有金錢回饋，評價發布前須經管理員審核，並記錄是哪位管理員審核的
-- 新增課程內容說明欄位：course_content（必填）、teaching_method / assignment_exam_format /
-- grading_breakdown（選填），讓評價除了主觀心得之外也能記錄課程本身的客觀資訊
-- course_code / professor 改用 COLLATE NOCASE，並新增 UNIQUE(course_code, professor, year,
-- semester, user_id)：避免同一人對同一堂課因為大小寫或連點送出兩次而留下重複評價
--
-- 注意：此腳本會「直接刪除」現有的 course_reviews 資料表與其中所有資料。
-- 課程評價功能截至目前為止尚未有正式使用者資料，因此不需要保留舊資料的搬遷步驟。
-- 若未來 course_reviews 已有正式資料，請先參考 update_exams_table.sql 的
-- 「建立 _new 表 → INSERT SELECT → DROP → RENAME」模式改寫本腳本，避免直接 DROP。
--
-- 執行方式：已改由遷移執行器管理，在 src/backend 目錄下執行 `npm run migrate`。
-- （此檔在既有資料庫上早已人工套用過，會被 --baseline 標記為已套用而不重跑）
-- 執行前務必先備份 ntuim.db（見 DEPLOYMENT.md）。

DROP TABLE IF EXISTS course_reviews;

CREATE TABLE course_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    reject_reason TEXT,
    reviewed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_code, professor, year, semester, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX idx_course_reviews_course ON course_reviews(course_code, year, semester);
CREATE INDEX idx_course_reviews_user ON course_reviews(user_id);
CREATE INDEX idx_course_reviews_status ON course_reviews(status);

CREATE TRIGGER update_course_reviews_timestamp
AFTER UPDATE ON course_reviews
BEGIN
    UPDATE course_reviews SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
