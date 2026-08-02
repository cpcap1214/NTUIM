// 抓取台大課程目錄（課程名稱/代碼/教授/學期），寫進 course_catalog 資料表，
// 供「寫課程評價」表單的課程名稱自動完成下拉選單使用。
//
// 資料來源：台大 NOL 系所課程查詢頁（nol.ntu.edu.tw，非官方但公開、無需登入、不需要 JS
// 的舊版課程系統；台大目前沒有官方公開課程 API，這是唯一可行的管道，詳見規劃紀錄）。
// 系所代碼清單每次執行時即時從查詢頁的下拉選單解析，不寫死在程式碼裡，避免代碼過時。
//
// 執行方式（在 src/backend 目錄下）：
//   npm run fetch-courses
//   npm run fetch-courses -- --semesters=115-1,114-2
//
// 手動執行、每學期重跑一次即可（不掛在 build/start 流程），單一系所或學期查詢失敗只會
// 記錄警告、跳過，不會讓整支腳本中斷（fail-soft，跟 scripts/fetch-ntu-calendar.js 同精神）。

const https = require('https');
const cheerio = require('cheerio');
const { CourseCatalog, sequelize } = require('../models');

const BASE_URL = 'https://nol.ntu.edu.tw/nol/coursesearch/search_for_02_dpt.php';
const REQUEST_TIMEOUT_MS = 15000;
const REQUEST_DELAY_MS = 350;
const ROWS_PER_PAGE = 500;

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

// 上一個學期：115-2 的上一個是 115-1，115-1 的上一個是 114-2
// （NOL 的 current_sem 只在 1/2 兩個學期代碼之間循環，沒有暑期代碼）
const decrementSemester = (sem) => {
    const [yearStr, half] = sem.split('-');
    const year = parseInt(yearStr, 10);
    return half === '2' ? `${year}-1` : `${year - 1}-2`;
};

// 從系所查詢頁（不帶查詢參數）解析目前預設學期 + 所有系所代碼/名稱
const fetchDepartmentsAndCurrentSemester = async () => {
    const html = await fetchHtml(BASE_URL);
    const $ = cheerio.load(html);

    const currentSem = $('input[name="current_sem"]').attr('value');
    if (!currentSem) {
        throw new Error('抓不到目前學期（current_sem），頁面結構可能已變更');
    }

    const departments = [];
    $('#dptname option[value]').each((_, el) => {
        const code = $(el).attr('value');
        const label = $(el).text().trim();
        if (!code || code === '0') return; // 排除「全部」
        // option 文字格式是「代碼 名稱」，把代碼前綴去掉留下名稱
        const name = label.replace(code, '').trim();
        departments.push({ code, name });
    });

    if (departments.length === 0) {
        throw new Error('抓不到任何系所代碼，頁面結構可能已變更');
    }

    return { currentSem, departments };
};

// 解析單一系所+學期查詢結果頁，回傳課程列（欄位順序見規劃紀錄的表頭對照）
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

        const courseCode = $(cells[2]).text().trim();
        const courseNameCell = $(cells[4]);
        const courseName = (courseNameCell.find('a').text() || courseNameCell.text()).trim();
        const professorRaw = $(cells[10]).text().trim();

        if (!courseCode || !courseName) return;

        courses.push({
            courseCode,
            courseName,
            professor: professorRaw || null
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

async function main() {
    console.log('開始抓取台大課程目錄...');

    let currentSem;
    let departments;
    try {
        ({ currentSem, departments } = await fetchDepartmentsAndCurrentSemester());
    } catch (error) {
        console.error('無法取得系所清單/目前學期，中止：', error.message);
        process.exit(1);
    }

    const semesters = parseCliSemesters() || [
        currentSem,
        decrementSemester(currentSem),
        decrementSemester(decrementSemester(currentSem))
    ];

    console.log(`學期：${semesters.join(', ')}`);
    console.log(`系所數：${departments.length}`);

    let successCount = 0;
    let failCount = 0;
    let savedCount = 0;

    for (const semester of semesters) {
        const semRecord = romanSemesterToRecord(semester);
        if (!semRecord) {
            console.warn(`  略過無法辨識的學期代碼：${semester}`);
            continue;
        }

        for (const dept of departments) {
            const url = `${BASE_URL}?current_sem=${semester}&dptname=${dept.code}&page_cnt=${ROWS_PER_PAGE}`;
            try {
                const html = await fetchHtml(url);
                const courses = parseCourseRows(html);

                // 一個系所+學期的所有課程包在同一個交易裡寫入，避免每筆課程各開一個交易、
                // 鎖資料庫鎖到讓一般 API 請求（例如使用者瀏覽課程評價）撞鎖失敗
                await sequelize.transaction(async (t) => {
                    for (const course of courses) {
                        await CourseCatalog.upsert({
                            courseCode: course.courseCode,
                            courseName: course.courseName,
                            professor: course.professor,
                            year: semRecord.year,
                            semester: semRecord.semester,
                            departmentCode: dept.code,
                            departmentName: dept.name
                        }, { transaction: t });
                        savedCount += 1;
                    }
                });

                successCount += 1;
            } catch (error) {
                failCount += 1;
                console.warn(`  [${semester} / ${dept.code} ${dept.name}] 失敗：${error.message}`);
            }

            await sleep(REQUEST_DELAY_MS);
        }
    }

    console.log('---');
    console.log(`完成。成功 ${successCount} 個系所查詢、失敗 ${failCount} 個，共寫入/更新 ${savedCount} 筆課程資料。`);

    await sequelize.close();
    process.exit(failCount > 0 && successCount === 0 ? 1 : 0);
}

main().catch((error) => {
    console.error('未預期的錯誤：', error);
    process.exit(1);
});
