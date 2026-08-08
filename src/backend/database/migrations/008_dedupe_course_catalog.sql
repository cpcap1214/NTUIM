-- 清掉 course_catalog 的重複列，並讓既有的唯一約束真正發揮作用。
--
-- 問題：表上有 UNIQUE(course_code, professor, year, semester)，但 SQLite 把 NULL 視為
-- 互不相等，所以 professor 為 NULL 的列永遠比不中約束——爬蟲的 upsert 每次都變成 INSERT。
-- 舊爬蟲是逐系所查詢（共 360 個系所），而查詢條件比對的是「授課對象」欄，
-- 一門沒有列出授課教師的課被 120 個系所列為授課對象，就會被插入 120 次：
--     Common1011 國文領域   114-1 → 120 列
--     IET5003    學士專題研究一 114-1 → 158 列
-- 全表共 1,555 組這樣的重複，約 4,500 列冗餘資料。
-- 連帶讓 GET /api/course-catalog/search（limit 15、無去重）在搜「國文」時
-- 回傳十幾筆一模一樣的下拉選項。
--
-- 修法：把 NULL 正規化成空字串，唯一約束就會正常比對，不需要重建資料表。
-- 爬蟲同步改為寫入 ''（見 scripts/fetchNtuCourses.js）。
--
-- 兩個敘述的順序不可調換，而且必須是「先刪後改」：
-- 反過來寫（先 UPDATE）會在 NULL 變成 '' 的那一刻就撞上唯一約束而整檔回滾，
-- 因為那些重複列此時還沒被刪掉。
--
-- DELETE 的分組鍵用 IFNULL(professor,'') 而不是 professor：
--   * GROUP BY 把多個 NULL 視為同一組（與 UNIQUE 約束相反），這點本來就對我們有利
--   * 但 NULL 與 '' 在 GROUP BY 下仍是不同組，若同一門課兩種都有，
--     兩列都會留下，接著的 UPDATE 又會撞約束。IFNULL 把它們收斂成同一組。
-- professor 有實際值的多筆（同課號不同教師）不受影響，會各自保留。
--
-- 注意：本遷移只有 DELETE 與 UPDATE，沒有 DROP TABLE。course_catalog 雖然是
-- 100% 從 NOL 衍生、隨時可重新抓取的資料，仍照專案慣例避免破壞性敘述。

DELETE FROM course_catalog
 WHERE id NOT IN (
     SELECT MIN(id) FROM course_catalog
      GROUP BY course_code, IFNULL(professor, ''), year, semester
 );

UPDATE course_catalog SET professor = '' WHERE professor IS NULL;
