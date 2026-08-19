// 課程評價的內容門檻（字數與必填）。
//
// 為什麼獨立成一個檔案而不是散在驗證器裡：這組數字原本出現在 8 個地方——
// POST 驗證、PUT 驗證、前端送出前的檢查、以及兩份語言檔的提示文字與錯誤訊息。
// 改門檻卻漏掉其中一處，結果是「表單說 50 字、伺服器說 100 字」，而且中英文
// 還可能各說各話。集中之後改一次就到底。
//
// 這些數字的意義是「100 元的回饋金要換多少內容」。舊值（課程內容 5 字、心得 50 字、
// 其餘三欄全選填）是在還沒有金錢誘因時訂的——55 個字換 100 元，搭配每小時 10 筆的
// 限流等於每小時 1,000 元。金額誘因一旦存在，門檻就得跟著重新定義。
//
// 這個檔案刻意「零依賴」，理由同 config/reviewQuota.js：src/backend 底下沒有測試
// 基礎設施，而 CRA 的 test runner 會把 src/ 底下所有 *.test.js 掃進去用 jsdom 跑，
// 一旦 require 到 sqlite3 就會炸。可測的邏輯全部留在這裡。
//
// ⚠️ src/main/resources/config/constants.js 有一份對應的值供前端使用
//    （前端不能 import src/backend，那會把後端程式碼打包進 bundle）。
//    src/test/unit/backend/reviewContent.test.js 會比對兩邊是否一致。

const CONTENT_LIMITS = {
    courseContent: { min: 50, max: 1000 },
    comment: { min: 100, max: 1000 },
    teachingMethod: { min: 20, max: 1000 },
    assignmentExamFormat: { min: 20, max: 1000 },
    gradingBreakdown: { min: 20, max: 1000 },
};

// 新增評價時必填的欄位。
//
// 修改（PUT）時刻意「不」套用這份清單——正式環境既有的評價是在這三欄還是選填時
// 寫的，其中確實有欄位為空的（實測：唯一那筆的 assignmentExamFormat 是 null）。
// 若 PUT 也要求必填，那些評價會立刻變成無法編輯，包括被退件後想修改的情況。
//
// 殘留漏洞：可以先照新規則投稿、通過審核後再用 PUT 清空這三欄。
// 要堵它得加一個「這篇是否適用新規則」的旗標並再開一次 migration，
// 而目前全站評價數個位數、審核又是人工的——不值得。日後量大了再處理。
const REQUIRED_ON_CREATE = [
    'courseContent',
    'comment',
    'teachingMethod',
    'assignmentExamFormat',
    'gradingBreakdown',
];

module.exports = { CONTENT_LIMITS, REQUIRED_ON_CREATE };
