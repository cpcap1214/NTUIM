// 資料庫遷移執行器
//
// 在此之前，這個專案的 .sql 全部是人工 SSH 手動執行、且非冪等（重跑會噴 duplicate column），
// 也沒有任何「已套用」的紀錄。這支腳本補上最基本的遷移基礎設施：
//   - schema_migrations 表記錄已套用的檔案
//   - migrations/ 目錄下的 .sql 依檔名順序執行，已套用的自動跳過
//   - 每個檔案包在一個交易裡（SQLite 的 DDL 是交易安全的），中途失敗會整檔回滾
//
// 用法（在 src/backend 目錄下）：
//   npm run migrate                指令：套用所有尚未執行的遷移
//   npm run migrate -- --status    只列出已套用/待套用，不做任何事
//   npm run migrate -- --baseline  把目前 migrations/ 內的檔案「標記為已套用」但不執行
//
// ⚠️ --baseline 的用途與時機：
// 既有的資料庫（包含正式機）裡，001~004 這幾個遷移「早就人工跑過了」，
// 直接執行會失敗。第一次導入這支執行器時，必須先跑一次 --baseline 建立基準，
// 之後的新遷移才會正常套用。全新用 init.js（schema.sql）建立的資料庫同理——
// schema.sql 已經包含了 001~004 的結果，所以一樣要先 --baseline。

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'ntuim.db');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const openDb = () => new sqlite3.Database(DB_PATH);

const run = (db, sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

const all = (db, sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });

const exec = (db, sql) =>
    new Promise((resolve, reject) => {
        db.exec(sql, (err) => (err ? reject(err) : resolve()));
    });

const close = (db) =>
    new Promise((resolve) => db.close(() => resolve()));

const ensureLedger = (db) =>
    run(
        db,
        `CREATE TABLE IF NOT EXISTS schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    );

// 支援 .sql 與 .js 兩種遷移。
// .js 用在需要條件判斷的情境（例如回填後必須驗證「至少還有一位管理員」才算成功），
// 這是純 SQL 表達不了的。.js 檔需 export 一個 async up(helpers) 函式，
// 在與 .sql 相同的交易內執行，丟出例外即整檔回滾。
const listMigrationFiles = () => {
    if (!fs.existsSync(MIGRATIONS_DIR)) return [];
    return fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((name) => name.endsWith('.sql') || name.endsWith('.js'))
        .sort(); // 檔名前綴數字決定執行順序
};

const getApplied = async (db) => {
    const rows = await all(db, 'SELECT filename FROM schema_migrations');
    return new Set(rows.map((r) => r.filename));
};

async function showStatus(db) {
    const applied = await getApplied(db);
    const files = listMigrationFiles();
    if (files.length === 0) {
        console.log('migrations/ 目錄下沒有任何 .sql 檔');
        return;
    }
    console.log('遷移狀態：');
    files.forEach((file) => {
        console.log(`  ${applied.has(file) ? '[已套用]' : '[待套用]'} ${file}`);
    });
    const pending = files.filter((f) => !applied.has(f)).length;
    console.log(`\n共 ${files.length} 個遷移，${pending} 個待套用。`);
}

async function baseline(db) {
    const files = listMigrationFiles();
    if (files.length === 0) {
        console.log('migrations/ 目錄下沒有任何 .sql 檔，無需建立基準。');
        return;
    }
    let marked = 0;
    for (const file of files) {
        const result = await run(db, 'INSERT OR IGNORE INTO schema_migrations (filename) VALUES (?)', [file]);
        if (result.changes > 0) marked += 1;
    }
    console.log(`已建立基準：標記 ${marked} 個遷移為已套用（未執行任何 SQL），${files.length - marked} 個原本就已記錄。`);
    console.log('之後執行 npm run migrate 只會套用新增的遷移。');
}

// 安全防線：既有資料庫 + 空白帳本 = 幾乎確定是「還沒建立基準」。
// 這種情況下絕不能直接套用舊遷移——001/002 內含 DROP TABLE，
// 而且那是合法 SQL、會成功提交，不會有任何錯誤讓你察覺資料已經被清空。
async function assertBaselineDone(db) {
    const applied = await getApplied(db);
    if (applied.size > 0) return;

    const existing = await all(
        db,
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','course_reviews','exams')"
    );
    if (existing.length === 0) return; // 全新空資料庫，正常往下跑

    console.error('已中止：偵測到這是既有資料庫，但尚未建立遷移基準。');
    console.error('');
    console.error(`  已存在的資料表：${existing.map((t) => t.name).join(', ')}`);
    console.error('  schema_migrations 帳本：空的');
    console.error('');
    console.error('直接套用會重跑 001~004 等舊遷移，其中含有 DROP TABLE，將造成資料永久遺失。');
    console.error('請先執行一次：npm run migrate -- --baseline');
    throw new Error('尚未建立遷移基準');
}

async function migrate(db) {
    await assertBaselineDone(db);

    const applied = await getApplied(db);
    const pending = listMigrationFiles().filter((file) => !applied.has(file));

    if (pending.length === 0) {
        console.log('沒有待套用的遷移，資料庫已是最新狀態。');
        return;
    }

    console.log(`待套用的遷移共 ${pending.length} 個：`);
    pending.forEach((f) => console.log(`  - ${f}`));
    console.log('');

    for (const file of pending) {
        const fullPath = path.join(MIGRATIONS_DIR, file);
        process.stdout.write(`套用 ${file} ... `);
        // BEGIN/COMMIT 分開下，不要把整個檔案字串包進 BEGIN...COMMIT，
        // 因為 CREATE TRIGGER 的內文本身就含有 BEGIN/END 關鍵字
        await run(db, 'BEGIN');
        try {
            if (file.endsWith('.js')) {
                const migration = require(fullPath);
                if (typeof migration.up !== 'function') {
                    throw new Error('.js 遷移必須 export 一個 async up(helpers) 函式');
                }
                await migration.up({
                    run: (sql, params) => run(db, sql, params),
                    all: (sql, params) => all(db, sql, params),
                    exec: (sql) => exec(db, sql),
                });
            } else {
                await exec(db, fs.readFileSync(fullPath, 'utf8'));
            }
            await run(db, 'INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
            await run(db, 'COMMIT');
            console.log('成功');
        } catch (error) {
            await run(db, 'ROLLBACK').catch(() => {});
            console.log('失敗');
            console.error(`\n遷移 ${file} 失敗，已回滾該檔案的所有變更：`);
            console.error(`  ${error.message}`);
            console.error('\n後續遷移不會執行。修正後重新執行 npm run migrate。');
            console.error('若這個遷移其實早就人工套用過，請改用 npm run migrate -- --baseline 建立基準。');
            throw error;
        }
    }

    console.log(`\n完成，共套用 ${pending.length} 個遷移。`);
}

async function main() {
    const args = process.argv.slice(2);
    const db = openDb();

    try {
        // 外鍵設定要在交易之外
        await run(db, 'PRAGMA foreign_keys = ON');
        await ensureLedger(db);

        if (args.includes('--status')) {
            await showStatus(db);
        } else if (args.includes('--baseline')) {
            await baseline(db);
        } else {
            await migrate(db);
        }
    } finally {
        await close(db);
    }
}

main().catch((error) => {
    console.error('遷移執行器錯誤：', error.message);
    process.exit(1);
});
