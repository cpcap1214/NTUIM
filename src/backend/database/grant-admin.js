// 救援用 CLI：授予某個帳號管理員權限。
//
// 用途：所有管理員都被鎖在外面（例如不小心把最後一位管理員降權/刪除、或新環境還沒有人
// 持有管理員身分組）時，一條不必記得 sqlite3 語法、可直接 SSH 執行的復原路徑。
//
// 用法（在 src/backend 目錄下）：
//   node database/grant-admin.js --list             列出目前擁有管理員權限的帳號
//   node database/grant-admin.js <username>         授予該帳號管理員身分組
//
// 「管理員」＝持有任一帶 '*' 權限的身分組，和 services/permissionService.js 的判斷一致。
// 授予時一律加入內建的 admin 身分組。
//
// ⚠️ 這支腳本以前寫的是 users.role = 'admin'。身分組系統上線後授權只看 user_roles，
// 那個寫法執行成功卻完全沒有效果——救援工具在最需要它的時候靜靜失效。
// users.role 現在只為程式碼回滾而保留（見 migration 015），這裡不再碰它。

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

const SUPERUSERS_SQL = `
    SELECT DISTINCT u.id, u.username, u.full_name
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN role_permissions rp ON rp.role_id = ur.role_id AND rp.permission = '*'
    ORDER BY u.id`;

async function assertRbacTables(db) {
    const row = await get(
        db,
        "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name IN ('roles','user_roles','role_permissions')",
    );
    if (row.c < 3) {
        throw new Error('身分組資料表不存在，請先執行 npm run migrate。');
    }
}

async function listAdmins(db) {
    const rows = await all(db, SUPERUSERS_SQL);
    if (rows.length === 0) {
        console.log('⚠️ 目前沒有任何帳號擁有管理員權限。');
        console.log('   請執行：node database/grant-admin.js <username>');
        return;
    }
    console.log(`目前的管理員（共 ${rows.length} 位）：`);
    rows.forEach((u) => console.log(`  #${u.id} ${u.username}（${u.full_name}）`));
}

async function grant(db, username) {
    const user = await get(db, 'SELECT id, username, full_name FROM users WHERE username = ?', [
        username,
    ]);

    if (!user) {
        console.error(`找不到使用者「${username}」。`);
        const candidates = await all(db, 'SELECT username FROM users ORDER BY id LIMIT 20');
        console.error(`現有帳號：${candidates.map((u) => u.username).join(', ')}`);
        process.exitCode = 1;
        return;
    }

    const alreadyAdmin = (await all(db, SUPERUSERS_SQL)).some((u) => u.id === user.id);
    if (alreadyAdmin) {
        console.log(`「${user.username}」（${user.full_name}）已經是管理員，未做任何變更。`);
        return;
    }

    const adminRole = await get(db, "SELECT id FROM roles WHERE key = 'admin'");
    if (!adminRole) {
        throw new Error('找不到內建的 admin 身分組，請先執行 npm run migrate。');
    }

    await run(db, 'INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [
        user.id,
        adminRole.id,
    ]);
    console.log(`✅ 已將「${user.username}」（${user.full_name}）加入管理員身分組。`);
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
            return;
        }
        await run(db, 'PRAGMA foreign_keys = ON');
        await assertRbacTables(db);
        if (args[0] === '--list') {
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
