-- 回饋金發放狀態從「布林」改為「三態」：未處理 / 已發放 / 不發放。
--
-- 原本只有 is_paid 一個布林，表達不了「已經看過、決定不發」這個狀態——
-- 超出名額的評價會永遠停在「未處理」，總務每次打開清單都要重新判斷一次同一批資料。
--
-- 為什麼是一個欄位而不是再加一個 payout_declined 布林：
-- 兩個布林可以同時為真，那是一個表達得出來但不該存在的狀態。用單一欄位，
-- 非法狀態根本寫不出來。這裡不加 CHECK 約束——SQLite 無法 ALTER 既有的 CHECK，
-- 日後要增加狀態會卡住（migration 004 的表頭就是因為這個才避開 ENUM）。
-- 值域的把關放在路由的 express-validator 與 models 的定義。
ALTER TABLE course_reviews ADD COLUMN payout_status VARCHAR(10) NOT NULL DEFAULT 'pending';

-- 既有資料回填：已發放的標成 paid，其餘留在預設的 pending。
-- 沒有任何既有資料會變成 declined——「不發放」是這次才出現的概念，
-- 過去的「未發放」一律是「還沒處理」，不能替總務決定他們其實是不想發。
UPDATE course_reviews SET payout_status = 'paid' WHERE is_paid = 1;

-- 清單頁三個分頁都是對這個欄位做等值過濾，是唯一的熱查詢
CREATE INDEX IF NOT EXISTS idx_course_reviews_payout_status ON course_reviews(payout_status);

-- ---------------------------------------------------------------------------
-- is_paid 刻意保留，不移除，也繼續寫入。
--
-- payout_status 是唯一的真相來源；is_paid 只是它的鏡像，存在的理由是
-- DEPLOYMENT.md 的回滾承諾（舊版程式碼在新資料庫上仍要能正常運作）。
--
-- 這不會重蹈「衍生狀態必然漂移」的覆轍，因為兩者只在一個地方一起寫入：
-- routes/courseReviews.js 的 applyPayoutStatus()。同一個函式、同一次 save，
-- 結構上不可能只更新其中一個。這跟目前 is_paid 的真實 bug（PATCH /:id/status
-- 拒絕評價時忘了清 is_paid）不同——那是散落在多處的寫入路徑各自為政。
--
-- 名額計算（services/reviewQuotaService.js）仍然只看 is_paid：
-- 「不發放」不會釋出名額，也不會佔用名額，它對名額完全中性。
-- ---------------------------------------------------------------------------
