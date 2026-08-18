// 寫入端點的速率限制。
//
// 為什麼以「使用者」而不是 IP 計數：校園網路有大量使用者共用同一個對外 IP
// （server.js 裡 authLimiter 的註解已經提過這個顧慮）。用 IP 計數會讓同一棟宿舍的人
// 互相把配額吃掉，而攻擊者換一個網路就繞過去了。已經要求登入的端點，
// 用帳號計數既精準又公平。
//
// 計數只活在記憶體裡（express-rate-limit 的預設 store），不會寫進資料庫。
// 這一點對匿名回饋很重要：限流器「當下」知道是誰送的，但資料表永遠不記錄。
// 兩者分開，才能同時做到真匿名與可限流。
//
// 附帶效果：重啟後端會清空計數。對這個規模的站來說可以接受——
// 要抵抗重啟仍然有效的限流得外接 Redis，不值得為此多養一個服務。

const rateLimit = require('express-rate-limit');

// 以登入帳號為 key；沒有 req.user 時退回 IP。
// ⚠️ 使用時必須掛在 authenticateToken「之後」，否則 req.user 還不存在，
// 整個限流會退化成 IP 模式而沒有任何錯誤提示。
const perUser = ({ max, windowMs, errorCode = 'RATE_LIMITED', message = '操作過於頻繁，請稍後再試' }) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => (req.user ? `u:${req.user.id}` : `ip:${req.ip}`),

        // 只計算「真的寫進去」的請求。
        //
        // 預設會連驗證失敗的 400 一起算，那會讓使用者在一則都沒送成功的情況下被鎖住：
        // 字數打太少試個幾次，配額就沒了，而畫面只說「過於頻繁」——他明明一次都沒送出去。
        // 這不是假設，是實際踩到的（端對端測試送了幾筆刻意無效的資料，之後真人就送不出去了）。
        //
        // 對防護沒有損失：要防的是資料表被灌爆，而失敗的請求本來就不會產生任何資料列。
        skipFailedRequests: true,

        // 回應格式與全站其他錯誤一致（error + errorCode + params），
        // 前端的 translateApiError 會把 params 餵進 i18n 插值。
        handler: (req, res) => {
            // 告訴使用者還要等多久。「請稍後再試」在額度是一小時的情況下等於沒說——
            // 使用者無從判斷該等一分鐘還是放棄。
            const resetTime = req.rateLimit?.resetTime;
            const minutes = resetTime
                ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 60000))
                : Math.ceil(windowMs / 60000);
            res.status(429).json({ error: message, errorCode, params: { minutes } });
        },
    });

const HOUR = 60 * 60 * 1000;

// 送出/修改課程評價。真人一小時內填 10 篇 50 字以上的心得已經是極限，
// 而洗版腳本沒有這個限制時可以每秒送數十筆。
const reviewWriteLimiter = perUser({
    max: 10,
    windowMs: HOUR,
    errorCode: 'REVIEW_RATE_LIMITED',
    message: '評價送出過於頻繁，請於 {{minutes}} 分鐘後再試',
});

// 意見回饋。
//
// 額度從 5 提高到 10：回報一個問題時，很可能連著送兩三則相關的補充，
// 5 筆在那種情境下太緊。防護面沒有實質差別——搭配 skipFailedRequests，
// 10 筆 × 2000 字上限，一個帳號一小時最多也只寫得進 20KB。
const feedbackLimiter = perUser({
    max: 10,
    windowMs: HOUR,
    errorCode: 'FEEDBACK_RATE_LIMITED',
    message: '回饋送出過於頻繁，請於 {{minutes}} 分鐘後再試',
});

module.exports = { perUser, reviewWriteLimiter, feedbackLimiter };
