const https = require('https');

const DEFAULT_SPREADSHEET_ID = '1UAgzYPzRKhhBa7hHdX_temfLfMmIdNLX';
const DEFAULT_SHEET_GID = '350665428';
const CACHE_TTL_MS = 5 * 60 * 1000;

let feeStatusCache = {
    expiresAt: 0,
    paidStudentIds: new Set()
};

function getFeeSheetCsvUrl() {
    const spreadsheetId = process.env.FEE_SHEET_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
    const gid = process.env.FEE_SHEET_GID || DEFAULT_SHEET_GID;
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

function fetchText(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (
                response.statusCode >= 300
                && response.statusCode < 400
                && response.headers.location
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
        }).on('error', reject);
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
    return String(studentId || '').trim().toUpperCase();
}

function isPaidMarker(value) {
    return /^o$/i.test(String(value || '').trim());
}

function buildPaidStudentSet(rows) {
    if (rows.length < 3) {
        return new Set();
    }

    const labelRow = rows[1] || [];
    const studentColumns = [];

    labelRow.forEach((label, index) => {
        if (String(label || '').trim() === '學號') {
            studentColumns.push(index);
        }
    });

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
        paidStudentIds
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

module.exports = {
    checkStudentPaidFee,
    buildPaidStudentSet,
    parseCsv,
    normalizeStudentId
};
