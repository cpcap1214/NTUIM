const https = require('https');

const DEFAULT_SPREADSHEET_ID = '1xHGJUZsynRpxp6gGAKCZhwXGMkubDSDx5zxvpNJdYP8';
const DEFAULT_SHEET_GID = '0';
const CACHE_TTL_MS = 5 * 60 * 1000;

let feeStatusCache = {
    expiresAt: 0,
    paidStudentIds: new Set(),
};

function getFeeSheetCsvUrl() {
    const spreadsheetId = process.env.FEE_SHEET_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
    const gid = process.env.FEE_SHEET_GID || DEFAULT_SHEET_GID;
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

function fetchText(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const request = https
            .get(url, (response) => {
                if (
                    response.statusCode >= 300 &&
                    response.statusCode < 400 &&
                    response.headers.location
                ) {
                    if (redirectCount >= 5) {
                        reject(new Error('繳費表轉址次數過多'));
                        response.resume();
                        return;
                    }

                    const redirectUrl = new URL(response.headers.location, url).toString();
                    response.resume();
                    resolve(fetchText(redirectUrl, redirectCount + 1));
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`無法讀取繳費表，HTTP ${response.statusCode}`));
                    response.resume();
                    return;
                }

                let data = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => resolve(data));
            })
            .on('error', reject);
        request.setTimeout(10000, () => request.destroy(new Error('讀取繳費表逾時')));
    });
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                field += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(field);
            field = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i += 1;
            }

            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            continue;
        }

        field += char;
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}

function normalizeStudentId(studentId) {
    return String(studentId || '')
        .trim()
        .toUpperCase();
}

function isPaidMarker(value) {
    return /^o$/i.test(String(value || '').trim());
}

function buildPaidStudentSet(rows) {
    if (rows.length < 3) {
        throw new Error('繳費表內容不完整');
    }

    const labelRow = rows[1] || [];
    const studentColumns = [];

    labelRow.forEach((label, index) => {
        if (String(label || '').trim() === '學號') {
            studentColumns.push(index);
        }
    });

    if (
        studentColumns.length === 0 ||
        studentColumns.some((index) => String(labelRow[index + 2] || '').trim() !== '系學會費')
    ) {
        throw new Error('繳費表欄位格式不符');
    }

    const paidStudentIds = new Set();

    rows.slice(2).forEach((row) => {
        studentColumns.forEach((studentColumnIndex) => {
            const studentId = normalizeStudentId(row[studentColumnIndex]);
            const feeStatus = row[studentColumnIndex + 2];

            if (studentId && isPaidMarker(feeStatus)) {
                paidStudentIds.add(studentId);
            }
        });
    });

    return paidStudentIds;
}

async function getPaidStudentIds() {
    const now = Date.now();
    if (feeStatusCache.expiresAt > now) {
        return feeStatusCache.paidStudentIds;
    }

    const csvText = await fetchText(getFeeSheetCsvUrl());
    const rows = parseCsv(csvText);
    const paidStudentIds = buildPaidStudentSet(rows);

    feeStatusCache = {
        expiresAt: now + CACHE_TTL_MS,
        paidStudentIds,
    };

    return paidStudentIds;
}

async function checkStudentPaidFee(studentId) {
    const normalizedStudentId = normalizeStudentId(studentId);
    if (!normalizedStudentId) {
        return false;
    }

    try {
        const paidStudentIds = await getPaidStudentIds();
        return paidStudentIds.has(normalizedStudentId);
    } catch (error) {
        console.error('檢查繳費狀態失敗:', error.message);
        return false;
    }
}

// 新表是繳費依據；既有帳號也在登入及認證請求時同步。
// 讀表失敗時不覆寫資料庫，該次請求則不授予會員資格。
async function syncStudentFeeStatus(user) {
    let hasPaidFee;
    try {
        const paidStudentIds = await getPaidStudentIds();
        hasPaidFee = paidStudentIds.has(normalizeStudentId(user.studentId));
    } catch (error) {
        console.error('同步繳費狀態失敗:', error.message);
        user.hasPaidFee = false;
        return;
    }

    if (Boolean(user.hasPaidFee) !== hasPaidFee) {
        await user.update({ hasPaidFee });
    }
}

module.exports = {
    checkStudentPaidFee,
    syncStudentFeeStatus,
    buildPaidStudentSet,
    parseCsv,
    normalizeStudentId,
};
