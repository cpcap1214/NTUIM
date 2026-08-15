// 課程評價的回饋金名額（quota）。
//
// 規則：每門課（同課號、同教授、同學年期）每學期只有前 N 篇評價具備回饋金資格。
// 系上必修 3 名、系上選修 2 名、其他 1 名。**投稿永遠不擋**，額滿只代表沒有回饋金。
// 這是為了把誘因導向還沒人寫的課，而不是為了減少評價數量——熱門必修的第 10 篇評價
// 對讀者仍然有價值，只是不該再花系學會的錢。
//
// 這個檔案刻意「零依賴」：不 import sequelize、不 import models。
// 原因是 src/backend 底下沒有任何測試基礎設施（package.json 有 "test": "jest" 但
// 零個測試檔、沒有 config），而 CRA 的 test runner 會把 src/ 底下所有 *.test.js
// 掃進去用 jsdom 跑，一旦 require 到 sqlite3 就會炸。把可測的邏輯全部留在這裡，
// 就能從既有的 CRA 測試套件直接 require 進來測（見 src/test/unit/backend/reviewQuota.test.js）。
//
// 有副作用的查詢在 src/backend/services/reviewQuotaService.js。

const QUOTA_LIMITS = {
    imRequired: 3,  // 系上必修
    imElective: 2,  // 系上選修
    other: 1        // 外系、通識、校訂必修
};

// 半形空白、全形空白、tab 一律去掉再比對。NOL 的欄位常有零星空白。
const stripSpaces = (value) => String(value ?? '').replace(/[\s　]/g, '');

// NOL「必/選修」欄的正規化。
//
// ⚠️ 實測過：這一欄不是二值，而是「必修 / 必帶 / 選修」三種（另有空白）。
// 而且資管系的核心必修全部標成「必帶」——IM1010 資料結構與進階程式設計、
// IM2003 作業系統、IM2008 資訊管理導論、IM3007 系統分析與設計都是。
// 用 === '必修' 完全比對會把整套系必修判成選修，剛好相反。
// 所以一律只看第一個字，不做完全比對。
//
// 認不出來的字串一律回 null，由 resolveTier 落到「其他」。寧可少給名額，
// 也絕不能把不確定的課猜成系上必修。
const normalizeRequirement = (raw) => {
    const text = stripSpaces(raw);
    if (!text) return null;
    if (text.startsWith('必')) return 'required';
    if (text.startsWith('選')) return 'elective';
    return null;
};

// 授課對象是否為資管系／資管所。
//
// ⚠️ 實測過：大學部是「資管系」，研究所是「資訊管理所」——後者不含「資管」二字。
// 只比對「資管」會把整個研究所漏掉，所以兩種寫法都要收。
const IM_AUDIENCE_RE = /資管|資訊管理/;
const isImTargetAudience = (targetAudience) => IM_AUDIENCE_RE.test(stripSpaces(targetAudience));

// 校訂必修（國文、外文、體育、服務學習…）的課號前綴。
//
// 這些課在 NOL 上確實把資管系列為授課對象、也確實標成必修，但全校每個系都在修，
// 不該吃掉系學會的回饋金名額。系訂/院訂必修（微積分、會計學原理、統計學這類
// 外系開給資管的課）則保留 3 名——學生是真的非修不可，評價有價值。
const COMMON_CORE_RE = /^common/i;
const isCommonCore = (courseCode) => COMMON_CORE_RE.test(stripSpaces(courseCode));

// 課程 → 名額級距。
//
// 判斷順序有意義：校訂必修先剔除，再看是不是資管的課，最後才看必選修。
// requirement 為 null（爬蟲還沒抓過、或 NOL 欄位認不出來）一律落到 other。
// 「未知絕不能被當成系上必修」是這個模組最重要的不變式：course_catalog 剛跑完
// migration 但還沒重跑爬蟲時，全部的課都是 null，此時給最小名額才是安全的方向。
const resolveTier = ({ courseCode, requirement, isImTarget } = {}) => {
    if (isCommonCore(courseCode)) return 'other';
    if (!isImTarget) return 'other';
    if (requirement === 'required') return 'imRequired';
    if (requirement === 'elective') return 'imElective';
    return 'other';
};

const limitForTier = (tier) => QUOTA_LIMITS[tier] ?? QUOTA_LIMITS.other;

// 同一門課被多個系所列為授課對象時，course_catalog 只留得下一列（唯一約束是
// 課號+教授+學年期），而必選修在 NOL 上是 per-(課, 授課對象) 的屬性。
// 這個名次讓爬蟲的合併能選出「資訊量最高」的那一列，而不是碰運氣留到最後一列。
//
// 必須是全序（每一列都能比大小），合併結果才與抓取／分頁順序無關，重跑才會一致。
const catalogRowRank = ({ requirement, isImTarget } = {}) => {
    if (!isImTarget) return 1;
    if (requirement === 'required') return 4;
    if (requirement === 'elective') return 3;
    return 2;
};

// 已用名額。
//
// sticky = 已發放（is_paid）或規則生效前就存在（quota_exempt）的評價數，這些
// 一定佔著名額。used 取 min(total, max(sticky, limit)) 是為了兩件事：
//   - 舊資料超額時誠實回報（例如某門必修上線前就有 8 篇 → 8/3），不夾到 3。
//     使用者看到 8/3 才知道這門課該讓給別人，夾成 3/3 反而看不出嚴重程度。
//   - 但也不能超過實際存在的評價數。
const computeUsage = ({ total = 0, sticky = 0, limit = QUOTA_LIMITS.other } = {}) => {
    const used = Math.min(total, Math.max(sticky, limit));
    return { used, remaining: Math.max(0, limit - used) };
};

// 時間 → 毫秒。
//
// 只接受 Date 物件與數字。字串走 Date.parse 是不得已的退路：sqlite3 存的是
// 'YYYY-MM-DD HH:MM:SS.SSS +00:00'（offset 前有空白），各 runtime 解不一致，
// 所以 reviewQuotaService 一律傳 hydrated model instance 進來（真的 Date）。
// 真的解不出來時回 Infinity —— 排到隊伍最後面，只會少拿名額，不會擠掉別人。
const toMillis = (value) => {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

// 判斷同一個 quota key 底下，哪幾則評價具備回饋金資格。回傳 id 的 Set。
//
// 刻意「即時計算」而不在 course_reviews 上存一個 payout_eligible 旗標：
// 那種衍生狀態要在 POST / PUT / DELETE / PATCH status / PATCH payout 五條寫入路徑上
// 同步維護，而這個 codebase 已經證明會漏掉其中一條（拒絕已發放的評價時不會清
// is_paid，見 routes/courseReviews.js 的 PATCH /:id/status）。再加一個、而且是
// 關於錢的衍生狀態，遲早會出事。即時計算不可能漂移，而且「刪除／拒絕就自動釋出名額」
// 是免費得到的。
//
// 排序（每一條都對應一個具體的出包情境）：
//   1. is_paid       已經發出去的錢永遠不會被追溯作廢
//   2. quota_exempt  規則生效前投稿的人不該被溯及既往（他們當時畫面上沒有名額資訊）
//   3. requeued_at ?? created_at
//                    被拒後修改重送要重新排隊。PUT /:id 會把 status 打回 pending 但
//                    不動 created_at，沒有這一條的話：A 一月投稿、一月被拒（名額釋出）、
//                    B 二月投稿並核准、A 三月改好重送 → A 用一月的時間插到最前面，
//                    把已經核准還沒領錢的 B 擠掉。這是最糟的失效模式。
//   4. id            created_at 相同時（連點、雙分頁）仍然要有確定的結果
//
// 已拒絕的評價不佔名額，在進來之前就該被過濾掉；這裡再擋一次，順帶讓「已拒絕卻仍
// is_paid=1」的既有殘留列（那個舊 bug 的產物）不會佔著名額不放。
//
// 刻意不讓 approved 置頂：若置頂，/payouts（本來就只列 approved）每一列都會是
// eligible，名額就變成純裝飾了。代價是已核准未發放的評價可能被更早的 pending 蓋過，
// 但那是正確的 FIFO，而且那則 pending 一被審核（核准或拒絕都算）就自動解決。
const rankEligible = (reviews, limit) => {
    const candidates = (reviews || []).filter((r) => r && r.status !== 'rejected');

    const sorted = [...candidates].sort((a, b) => {
        const paid = Number(Boolean(b.isPaid)) - Number(Boolean(a.isPaid));
        if (paid !== 0) return paid;

        const exempt = Number(Boolean(b.quotaExempt)) - Number(Boolean(a.quotaExempt));
        if (exempt !== 0) return exempt;

        const queued = toMillis(a.requeuedAt ?? a.createdAt) - toMillis(b.requeuedAt ?? b.createdAt);
        if (queued !== 0) return queued;

        return Number(a.id) - Number(b.id);
    });

    const eligible = new Set();
    sorted.forEach((review, index) => {
        if (index < limit || review.isPaid || review.quotaExempt) eligible.add(review.id);
    });
    return eligible;
};

module.exports = {
    QUOTA_LIMITS,
    normalizeRequirement,
    isImTargetAudience,
    isCommonCore,
    resolveTier,
    limitForTier,
    catalogRowRank,
    computeUsage,
    rankEligible
};
