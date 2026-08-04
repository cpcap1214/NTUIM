// 把既有使用者的權限回填成身分組成員資格。
//
// 對應關係：
//   users.role = 'admin'          → 管理員身分組
//   users.can_manage_payouts = 1  → 總務身分組
//   users.has_paid_fee            → 不回填！「會員」是自動身分組，成員資格在解析權限時
//                                    直接從 has_paid_fee 推導，不存 user_roles。
//                                    理由：繳費狀態有三個寫入點（註冊時從 Google Sheet 同步、
//                                    PATCH /users/:id/fee-status、admin 的 PUT /users/:id），
//                                    存成兩份資料必然漂移，而且漂移方向通常是「多給了不該給的權限」。
//
// 這是 .js 遷移而非 .sql，因為結尾必須驗證「至少還有一位管理員」，
// 那是純 SQL 表達不了的。驗證失敗會丟出例外 → 整個遷移回滾。
//
// 刻意「不」實作「找不到管理員就自動提升 id 最小的使用者」這種退路：
// 那會把正式站交給 database/init.js 種下的測試帳號（admin / admin123）。
// 真的沒有管理員時，正確做法是用 npm run grant-admin -- <username> 手動指定。

module.exports.up = async ({ run, all }) => {
    // 管理員
    await run(`
        INSERT OR IGNORE INTO user_roles (user_id, role_id)
        SELECT u.id, r.id
        FROM users u
        CROSS JOIN roles r
        WHERE r.key = 'admin' AND u.role = 'admin'
    `);

    // 總務
    await run(`
        INSERT OR IGNORE INTO user_roles (user_id, role_id)
        SELECT u.id, r.id
        FROM users u
        CROSS JOIN roles r
        WHERE r.key = 'treasurer' AND u.can_manage_payouts = 1
    `);

    const admins = await all(`
        SELECT u.username
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN users u ON u.id = ur.user_id
        WHERE r.key = 'admin'
        ORDER BY u.id
    `);

    if (admins.length === 0) {
        throw new Error(
            '回填後沒有任何使用者持有管理員身分組，已中止並回滾。\n' +
            '  這代表 users 表裡沒有 role = \'admin\' 的帳號。\n' +
            '  請先確認資料庫狀態，或用 npm run grant-admin -- <username> 指定管理員後重新執行遷移。'
        );
    }

    const treasurers = await all(`
        SELECT u.username
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN users u ON u.id = ur.user_id
        WHERE r.key = 'treasurer'
        ORDER BY u.id
    `);

    console.log('');
    console.log(`    管理員身分組：${admins.length} 位（${admins.map((u) => u.username).join(', ')}）`);
    console.log(`    總務身分組：${treasurers.length} 位${treasurers.length ? `（${treasurers.map((u) => u.username).join(', ')}）` : ''}`);
    console.log('    會員身分組：依 has_paid_fee 自動推導，不寫入 user_roles');
    process.stdout.write('  ');
};
