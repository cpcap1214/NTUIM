// 救援用 CLI：授予某個帳號管理員權限。
//
// 用途：權限重構過程中若回填失敗、或未來不小心把最後一位管理員降權/刪除，
// 需要一條不必記得 sqlite3 語法、可直接 SSH 執行的復原路徑。
//
// 用法（在 src/backend 目錄下）：
//   node database/grant-admin.js --list             列出目前擁有管理員權限的帳號
//   node database/grant-admin.js <username>         授予該帳號管理員權限
//
// 目前（Phase 1 之前）管理員身分還是由 users.role 決定，所以這支腳本操作 role 欄位。
// 等 Phase 2 的身分組系統上線後，這裡會改成同時授予 admin 身分組。

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'ntuim.db');

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

const get = (db, sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });

async function listAdmins(db) {
    const rows = await all(db, "SELECT id, username, full_name, role FROM users WHERE role = 'admin' ORDER BY id");
    if (rows.length === 0) {
        console.log('⚠️ 目前沒有任何帳號擁有管理員權限。');
        console.log('   請執行：node database/grant-admin.js <username>');
        return;
    }
    console.log(`目前的管理員（共 ${rows.length} 位）：`);
    rows.forEach((u) => console.log(`  #${u.id} ${u.username}（${u.full_name}）`));
}

async function grant(db, username) {
    const user = await get(db, 'SELECT id, username, full_name, role FROM users WHERE username = ?', [username]);

    if (!user) {
        console.error(`找不到使用者「${username}」。`);
        const candidates = await all(db, 'SELECT username FROM users ORDER BY id LIMIT 20');
        console.error(`現有帳號：${candidates.map((u) => u.username).join(', ')}`);
        process.exitCode = 1;
        return;
    }

    if (user.role === 'admin') {
        console.log(`「${user.username}」（${user.full_name}）已經是管理員，未做任何變更。`);
        return;
    }

    await run(db, "UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
    console.log(`✅ 已授予「${user.username}」（${user.full_name}）管理員權限（原本是 ${user.role}）。`);
    await listAdmins(db);
}

async function main() {
    const args = process.argv.slice(2);
    const db = new sqlite3.Database(DB_PATH);

    try {
        if (args.length === 0) {
            console.error('用法：');
            console.error('  node database/grant-admin.js --list');
            console.error('  node database/grant-admin.js <username>');
            process.exitCode = 1;
        } else if (args[0] === '--list') {
            await listAdmins(db);
        } else {
            await grant(db, args[0]);
        }
    } finally {
        await new Promise((resolve) => db.close(() => resolve()));
    }
}

main().catch((error) => {
    console.error('執行失敗：', error.message);
    process.exit(1);
});
