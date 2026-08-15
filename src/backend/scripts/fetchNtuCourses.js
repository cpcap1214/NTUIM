// 抓取台大課程目錄（課號/課程名稱/教授/學期），寫進 course_catalog 資料表，
// 供「寫課程評價」表單的課程名稱自動完成下拉選單使用。
//
// 資料來源：台大 NOL 課程查詢頁（nol.ntu.edu.tw，非官方但公開、無需登入、不需要 JS
// 的舊版課程系統；台大目前沒有官方公開課程 API，這是唯一可行的管道，詳見規劃紀錄）。
//
// 執行方式（在 src/backend 目錄下）：
//   npm run fetch-courses
//   npm run fetch-courses -- --semesters=115-1,114-2
//   npm run fetch-courses -- --allow-partial   （逃生門，見下方完整性檢查）
//
// 手動執行、每學期重跑一次即可（不掛在 build/start 流程）。
//
// ---------------------------------------------------------------------------
// 為什麼是「查全部 + 分頁」，而不是「逐系所查詢」
//
// 這支腳本原本是對下拉選單裡的 360 個系所代碼各查一次。實測後發現三個缺漏：
//
//   1. 查詢參數 dptname 比對的是結果表的「授課對象」欄。授課對象空白的課程
//      不屬於任何系所，逐系迴圈結構上永遠掃不到。
//   2. page_cnt 上限是 150（實測 page_cnt=200/500 都只回 150 列），而原本沒有
//      使用分頁參數，任何系所+學期超過 150 門課的部分會靜靜消失。
//   3. 同一門課會被每個把它列為授課對象的系所各抓一次；配合 professor 為 NULL
//      時唯一約束比不中（SQLite 的 NULL 互不相等），造成大量重複列。
//
// 結果是 114-1 只抓到 8,280 門，而 NOL 實際有 16,589 筆——只有一半。
//
// 改用 dptname=0（全部）配合 startrec 偏移量分頁，一次涵蓋所有課程，
// 每學期約 111 個請求（比原本的 360 個更少），且不會漏掉沒有授課對象的課。
// ---------------------------------------------------------------------------

const https = require('https');
const cheerio = require('cheerio');
const { CourseCatalog, sequelize } = require('../models');
const { normalizeRequirement, isImTargetAudience, catalogRowRank } = require('../config/reviewQuota');

const BASE_URL = 'https://nol.ntu.edu.tw/nol/coursesearch/search_for_02_dpt.php';
const REQUEST_TIMEOUT_MS = 15000;
const REQUEST_DELAY_MS = 350;
// NOL 的每頁筆數上限就是 150，給更大的值也只會回 150 列。
// 這個值同時是 startrec 的遞增步長，兩者必須一致。
const ROWS_PER_PAGE = 150;
const MAX_PAGES_PER_SEMESTER = 400; // 安全上限，避免頁面行為改變時無限迴圈
// 失敗分頁的重試輪數與退避間隔。一趟一百多個請求，零星的暫時性錯誤是常態而非例外
const RETRY_ROUNDS = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchHtml = (url) =>
    new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                res.resume();
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        });
        req.on('timeout', () => req.destroy(new Error('請求逾時')));
        req.on('error', reject);
    });

const pageUrl = (semester, startrec) =>
    `${BASE_URL}?current_sem=${encodeURIComponent(semester)}&dptname=0`
    + `&page_cnt=${ROWS_PER_PAGE}&startrec=${startrec}`;

// 上一個學期：115-2 的上一個是 115-1，115-1 的上一個是 114-2
// （NOL 的 current_sem 只在 1/2 兩個學期代碼之間循環，沒有暑期代碼）
const decrementSemester = (sem) => {
    const [yearStr, half] = sem.split('-');
    const year = parseInt(yearStr, 10);
    return half === '2' ? `${year}-1` : `${year - 1}-2`;
};

// 從查詢頁（不帶查詢參數）取得目前預設學期
const fetchCurrentSemester = async () => {
    const html = await fetchHtml(BASE_URL);
    const $ = cheerio.load(html);
    const currentSem = $('input[name="current_sem"]').attr('value');
    if (!currentSem) {
        throw new Error('抓不到目前學期（current_sem），頁面結構可能已變更');
    }
    return currentSem;
};

// 解析頁面上的「共查詢到 N 筆」。這是完整性檢查的基準：
// 分頁抓完之後，各頁列數加總必須等於這個數字，否則就是漏頁了。
const parseTotalCount = (html) => {
    const text = cheerio.load(html)('body').text().replace(/\s+/g, '');
    const m = text.match(/共查詢到(\d+)筆/);
    return m ? parseInt(m[1], 10) : null;
};

// 解析查詢結果頁的課程列。
// 結果表固定 18 欄，實測過的欄位對照：
//   0 流水號   1 授課對象   2 課號   3 班次   4 課程名稱   5 領域專長   6 學分
//   7 課程識別碼   8 全/半年   9 必/選修   10 授課教師   11 加選方式   12 時間教室
//   13 總人數   14 選課限制條件   15 備註   16 課程網頁   17 預計要選
const parseCourseRows = (html) => {
    const $ = cheerio.load(html);
    const headerRow = $('tr[bgcolor="#DDEDFF"]').first();
    if (headerRow.length === 0) return [];

    const table = headerRow.closest('table');
    const rows = table.find('tr').slice(1); // 跳過表頭那一列

    const courses = [];
    rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 11) return;

        const targetAudience = $(cells[1]).text().trim();
        const courseCode = $(cells[2]).text().trim();
        const courseNameCell = $(cells[4]);
        const courseName = (courseNameCell.find('a').text() || courseNameCell.text()).trim();
        // 第 9 欄「必/選修」。實測值是「必修 / 必帶 / 選修」，不是二值，
        // 而且資管系的核心必修全部標「必帶」——正規化的細節見 config/reviewQuota.js
        const requirementRaw = $(cells[9]).text().trim();
        const professorRaw = $(cells[10]).text().trim();

        if (!courseCode || !courseName) return;

        courses.push({
            courseCode,
            courseName,
            // 空字串而非 null：唯一約束是 (course_code, professor, year, semester)，
            // 而 SQLite 的 NULL 互不相等，用 null 會讓 upsert 永遠比不中而不斷新增重複列
            professor: professorRaw || '',
            targetAudience,
            // 必選修在 NOL 上是相對於「授課對象」的（同一門課對資管是必修、對外系可能是選修），
            // 所以這兩個值必須成對保留，交給下面的合併邏輯挑出資管的那一列
            requirement: normalizeRequirement(requirementRaw),
            isImTarget: isImTargetAudience(targetAudience)
        });
    });

    return courses;
};

const romanSemesterToRecord = (sem) => {
    const [rocYearStr, half] = sem.split('-');
    const rocYear = parseInt(rocYearStr, 10);
    if (half !== '1' && half !== '2') return null; // 遇到非 1/2 的學期代碼先跳過，不猜測規則
    return { year: rocYear + 1911, semester: half };
};

const parseCliSemesters = () => {
    const arg = process.argv.find((a) => a.startsWith('--semesters='));
    if (!arg) return null;
    return arg.replace('--semesters=', '').split(',').map((s) => s.trim()).filter(Boolean);
};

// 逃生門：明知資料不完整仍要寫入。正常情況不該用到，修正後重跑才是對的做法
const allowPartial = process.argv.includes('--allow-partial');

// 抓完一個學期的所有分頁，回傳 { total, parsed, courses, failedPages }
//
// 刻意先把整個學期收集到記憶體，最後才開交易寫入：邊抓邊寫會讓寫入鎖橫跨
// 約兩分鐘的 HTTP 往返，正是先前造成前台「取得評價失敗」與 ntuim.db-journal
// 反覆生滅的原因。
const fetchSemester = async (semester) => {
    const first = await fetchHtml(pageUrl(semester, 0));
    const total = parseTotalCount(first);
    if (total === null) {
        throw new Error('抓不到「共查詢到 N 筆」，頁面結構可能已變更');
    }

    // key → course，同一門課在不同分頁重複出現時只留一筆（同時避免寫入時撞約束）。
    // key 用 JSON.stringify([課號, 教師]) 而不是字串拼接：教師欄可能含空白
    // （例如「丁　亮」），用空白當分隔會讓「A B」+「C」與「A」+「B C」算成同一把 key。
    const byKey = new Map();
    const addAll = (rows) => {
        rows.forEach((c) => {
            const key = JSON.stringify([c.courseCode, c.professor]);
            const prev = byKey.get(key);
            // 原本是無條件覆蓋（後來者贏）。那在只存課名/教授時無所謂，但加上必選修之後
            // 就會出事：同一門課被多個系所列為授課對象時，留到哪一列變成看分頁順序的運氣，
            // 而必選修是相對於授課對象的——留到電機系那一列，資管系必修就變成「其他」。
            //
            // 改成留下資訊量最高的一列（資管必修 > 資管選修 > 資管未知 > 非資管）。
            // 用「嚴格大於」而不是「大於等於」：同名次時保留先看到的，
            // 讓合併結果與抓取順序無關，重跑才會得到一模一樣的資料。
            if (!prev || catalogRowRank(c) > catalogRowRank(prev)) byKey.set(key, c);
        });
    };

    let parsed = 0;
    const failedPages = [];

    const firstRows = parseCourseRows(first);
    parsed += firstRows.length;
    addAll(firstRows);

    for (let startrec = ROWS_PER_PAGE, page = 1;
        startrec < total && page < MAX_PAGES_PER_SEMESTER;
        startrec += ROWS_PER_PAGE, page += 1) {
        await sleep(REQUEST_DELAY_MS);
        try {
            const rows = parseCourseRows(await fetchHtml(pageUrl(semester, startrec)));
            parsed += rows.length;
            addAll(rows);
            if (page % 20 === 0) {
                process.stdout.write(`    已抓 ${parsed}/${total} 筆\n`);
            }
        } catch (error) {
            failedPages.push({ startrec, message: error.message });
            console.warn(`    [${semester} startrec=${startrec}] 失敗：${error.message}`);
        }
    }

    // 重試失敗的分頁。
    //
    // 一趟要打一百多個請求，實測必定會零星遇到 ECONNRESET / ENOTFOUND 這類暫時性錯誤。
    // 由於「資料不完整就整個學期不寫」（漏掉資管系那一列會讓必修靜默降級成 1 名），
    // 沒有重試的話一頁失敗就整趟白跑，實務上幾乎跑不完。
    // 退避等待久一點：這種錯誤通常是對方短暫拒絕或本地 DNS 抖動，馬上重打只會再失敗一次。
    for (let attempt = 1; attempt <= RETRY_ROUNDS && failedPages.length > 0; attempt += 1) {
        const retrying = failedPages.splice(0, failedPages.length);
        console.log(`    重試第 ${attempt} 輪：${retrying.length} 個分頁`);
        for (const { startrec } of retrying) {
            await sleep(RETRY_DELAY_MS);
            try {
                const rows = parseCourseRows(await fetchHtml(pageUrl(semester, startrec)));
                parsed += rows.length;
                addAll(rows);
                console.log(`      startrec=${startrec} 補抓成功`);
            } catch (error) {
                failedPages.push({ startrec, message: error.message });
                console.warn(`      startrec=${startrec} 仍然失敗：${error.message}`);
            }
        }
    }

    return { total, parsed, courses: [...byKey.values()], failedPages };
};

async function main() {
    console.log('開始抓取台大課程目錄...');

    let currentSem;
    try {
        currentSem = await fetchCurrentSemester();
    } catch (error) {
        console.error('無法取得目前學期，中止：', error.message);
        process.exit(1);
    }

    const semesters = parseCliSemesters() || [
        currentSem,
        decrementSemester(currentSem),
        decrementSemester(decrementSemester(currentSem))
    ];

    console.log(`學期：${semesters.join(', ')}`);
    console.log('');

    const report = [];
    let hadFailure = false;

    for (const semester of semesters) {
        const semRecord = romanSemesterToRecord(semester);
        if (!semRecord) {
            console.warn(`  略過無法辨識的學期代碼：${semester}`);
            hadFailure = true;
            continue;
        }

        console.log(`  ${semester} 抓取中...`);
        let result;
        try {
            result = await fetchSemester(semester);
        } catch (error) {
            console.error(`  ${semester} 抓取失敗：${error.message}`);
            hadFailure = true;
            continue;
        }

        // 資料不完整就不寫。
        //
        // 在加上修別之前，漏掉幾頁只是課少幾門，無害。加上之後就不一樣了：
        // 漏掉的那一頁若剛好含 IM2008 的「資管系」那一列，這門課會靜默地從
        // 3 個名額掉到 1 個，而且畫面上完全看不出異常——沒有錯誤、沒有缺漏，
        // 只是分類錯了。這種失敗比缺資料危險得多，寧可整個學期不寫。
        if (!allowPartial && (result.failedPages.length > 0 || result.parsed !== result.total)) {
            console.error(
                `  ${semester} 資料不完整（解析 ${result.parsed}/${result.total}，`
                + `失敗分頁 ${result.failedPages.length} 頁），跳過寫入。`
            );
            console.error('    修正後重跑即可；確定要寫入不完整的資料請加 --allow-partial');
            hadFailure = true;
            continue;
        }

        // 一個學期一個交易，且只在資料都到手之後才開始
        let written = 0;
        try {
            await sequelize.transaction(async (t) => {
                for (const course of result.courses) {
                    await CourseCatalog.upsert({
                        courseCode: course.courseCode,
                        courseName: course.courseName,
                        professor: course.professor,
                        year: semRecord.year,
                        semester: semRecord.semester,
                        departmentCode: null,
                        departmentName: course.targetAudience || null,
                        // 一律明確傳入，包含 null。省略欄位會讓 upsert 保留舊值，
                        // 那樣重跑就沒辦法把過期的分類「降級」回未知
                        requirement: course.requirement,
                        isImTarget: course.isImTarget
                    }, { transaction: t });
                    written += 1;
                }
            });
        } catch (error) {
            console.error(`  ${semester} 寫入失敗，該學期已回滾：${error.message}`);
            hadFailure = true;
            continue;
        }

        if (result.failedPages.length > 0) hadFailure = true;
        report.push({ semester, ...result, written });
        console.log(`  ${semester} 完成`);
    }

    // ---------------------------------------------------------------------
    // 完整性檢查。
    // 原本的離開代碼是 `failCount > 0 && successCount === 0`——只有「全部失敗」
    // 才回非 0，一個系所成功、其餘全掛也算成功，等於沒有把關。
    //
    // 這裡比對的是「各分頁解析出的列數加總」與「NOL 自己回報的筆數」，
    // 兩者相等才證明分頁真的走完。寫入數會少於解析數是正常的：
    // 同一課號同教師的多個班次會收斂成一筆。
    // ---------------------------------------------------------------------
    console.log('');
    console.log('學期      NOL 回報   實際解析   寫入（去重後）');
    for (const r of report) {
        const ok = r.parsed === r.total;
        console.log(
            `  ${r.semester.padEnd(8)}${String(r.total).padEnd(11)}${String(r.parsed).padEnd(11)}${r.written}`
            + (ok ? '' : '   ⚠️ 解析數與 NOL 回報不符')
        );
        if (!ok) hadFailure = true;
    }

    const totalRows = await CourseCatalog.count();
    console.log('');
    console.log(`course_catalog 目前共 ${totalRows} 筆`);

    if (hadFailure) {
        console.log('');
        console.error('⚠️ 有學期或分頁未成功，資料可能不完整。修正後重新執行即可（upsert 可重複執行）。');
    }

    await sequelize.close();
    process.exit(hadFailure ? 1 : 0);
}

main().catch(async (error) => {
    console.error('未預期的錯誤：', error);
    process.exit(1);
});
