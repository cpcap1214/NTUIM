// 判斷某個學年期是否已經可以填寫課程評價。
//
// 規則：該學期的「期末考結束」之後才能填（還沒考完的學期，課程內容/給分等都還沒定案，
// 評價沒有意義）。期末考日期以台大行事曆為準：scripts/fetch-ntu-calendar.js 會把行事曆
// 抓到 src/main/resources/data/ntuCalendar.json，裡面有「期末考試開始(至X月X日止)」事件。
//
// 行事曆只包含抓取當下的「未來事件」，較舊的學期不會出現在裡面；查不到對應事件時
// 改用推估日期（見 estimateFinalExamEnd），確保久遠的過去學期一律視為可填寫。

const fs = require('fs');
const path = require('path');

const CALENDAR_PATH = path.join(__dirname, '../../main/resources/data/ntuCalendar.json');

// 台大學年度從 8 月開始：8~1 月屬第一學期，2~7 月屬第二學期。
// 把行事曆上的日期換算成它所屬的民國學年期。
const dateToTerm = (date) => {
    const adYear = date.getFullYear();
    const month = date.getMonth() + 1;
    if (month >= 8) return { rocYear: adYear - 1911, semester: '1' };
    if (month <= 1) return { rocYear: adYear - 1911 - 1, semester: '1' };
    return { rocYear: adYear - 1911 - 1, semester: '2' };
};

// 從「期末考試開始(至6月12日止)」這類標題解析出考試結束日；解析不出來就退回事件當天
const parseFinalExamEnd = (event) => {
    const start = new Date(`${event.date}T00:00:00`);
    const matched = /至\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*止/.exec(event.title || '');
    if (!matched) return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59);

    const endMonth = parseInt(matched[1], 10);
    const endDay = parseInt(matched[2], 10);
    // 考試期間跨年（例如 12/28 開始、1/3 結束）時，結束月份會小於開始月份
    const endYear = endMonth < start.getMonth() + 1 ? start.getFullYear() + 1 : start.getFullYear();
    return new Date(endYear, endMonth - 1, endDay, 23, 59, 59);
};

let cachedExamEndByTerm = null;

const getFinalExamEndByTerm = () => {
    if (cachedExamEndByTerm) return cachedExamEndByTerm;

    const map = new Map();
    try {
        const raw = JSON.parse(fs.readFileSync(CALENDAR_PATH, 'utf8'));
        (raw.events || []).forEach((event) => {
            if (!event || !event.date || !event.title) return;
            if (!/期末考試開始/.test(event.title)) return;
            const term = dateToTerm(new Date(`${event.date}T00:00:00`));
            map.set(`${term.rocYear}-${term.semester}`, parseFinalExamEnd(event));
        });
    } catch (error) {
        // 讀不到行事曆（檔案不存在或格式壞掉）時全部走推估邏輯，不讓功能整個掛掉
        console.warn('讀取台大行事曆失敗，改用推估的期末考日期：', error.message);
    }

    cachedExamEndByTerm = map;
    return map;
};

// 行事曆查不到時的推估：第一學期期末考約在 12 月底、第二學期約在隔年 6 月底、暑期約在隔年 8 月底
const estimateFinalExamEnd = (rocYear, semester) => {
    const adYear = rocYear + 1911;
    if (semester === '1') return new Date(adYear, 11, 31, 23, 59, 59);
    if (semester === '2') return new Date(adYear + 1, 5, 30, 23, 59, 59);
    return new Date(adYear + 1, 7, 31, 23, 59, 59);
};

// year 是西元年（跟資料庫存的格式一致）
const isTermReviewable = (year, semester, now = new Date()) => {
    const rocYear = parseInt(year, 10) - 1911;
    if (Number.isNaN(rocYear)) return false;
    const fromCalendar = getFinalExamEndByTerm().get(`${rocYear}-${semester}`);
    const examEnd = fromCalendar || estimateFinalExamEnd(rocYear, semester);
    return now.getTime() > examEnd.getTime();
};

const SEMESTER_RANK = { '1': 1, '2': 2, summer: 3 };

// 列出目前可填寫評價的學年期（新到舊），給前端的「學年期」下拉選單用
const listReviewableTerms = (now = new Date(), yearsBack = 4) => {
    const currentRocYear = now.getFullYear() - 1911;
    const terms = [];
    for (let rocYear = currentRocYear; rocYear >= currentRocYear - yearsBack; rocYear -= 1) {
        ['1', '2', 'summer'].forEach((semester) => {
            const adYear = rocYear + 1911;
            if (isTermReviewable(adYear, semester, now)) {
                terms.push({ year: adYear, semester });
            }
        });
    }
    return terms.sort((a, b) => b.year - a.year || SEMESTER_RANK[b.semester] - SEMESTER_RANK[a.semester]);
};

module.exports = { isTermReviewable, listReviewableTerms };
