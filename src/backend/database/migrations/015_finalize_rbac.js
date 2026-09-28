// 身分組系統收尾：程式碼從這一版起完全不再讀寫 users.role 與 users.can_manage_payouts。
//
// 那兩個欄位在 006/007 之後就已經沒有授權作用（後端一律看 user_roles），
// 但過渡期仍到處被讀寫，看起來像還有兩套權限來源。這個遷移做三件事：
//
//   1. 補種內建身分組與它們的權限（冪等）。任何環境的內建狀態都應該一致；
//      缺了 admin 的 '*'，下面的檢查與 grant-admin 都會失去依據。
//   2. 檢查「至少一位使用者持有帶 '*' 的身分組」。沒有就丟例外 → 整檔回滾，
//      因為從這一版起舊的 role 欄位不再是任何人的退路。
//   3. 列出新舊不一致的帳號，只印不改。
//
// 刻意「不」依舊欄位自動回填：透過後台降權的前管理員，舊欄位仍然是 'admin'
// （後台從來不寫那個欄位），自動回填等於把權限還給被刻意拿掉的人。
// 真正該補的（例如之前用舊版 grant-admin 只寫了 role 的帳號）請看報告後
// 用 npm run grant-admin -- <username> 補上。
//
// 刻意「不」刪除或改寫兩個舊欄位：它們是程式碼回滾的保險。回滾到舊版時，
// 舊程式碼的影子模式與 grant-admin 仍會讀它們。值會停在這個遷移當下。

const BUILTIN_ROLES = [
    {
        key: 'admin',
        name: '管理員',
        description: '擁有全站所有權限',
        color: '#d32f2f',
        priority: 100,
        isAuto: 0,
        permissions: ['*'],
    },
    {
        key: 'treasurer',
        name: '總務',
        description: '管理課程評價回饋金的發放狀態',
        color: '#7b1fa2',
        priority: 50,
        isAuto: 0,
        permissions: ['courseReviews.payout'],
    },
    {
        key: 'member',
        name: '會員',
        description: '已繳交系學會費的會員（依繳費狀態自動判定，不可手動指派）',
        color: '#1976d2',
        priority: 10,
        isAuto: 1,
        permissions: ['exams.download'],
    },
];

const SUPERUSER_IDS = `
    SELECT DISTINCT ur.user_id FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id AND rp.permission = '*'`;

const names = (rows) => rows.map((u) => u.username).join(', ');

module.exports.up = async ({ run, all }) => {
    // 1. 內建身分組。INSERT OR IGNORE：已存在的不覆蓋，管理員改過的名稱與顏色保留
    for (const role of BUILTIN_ROLES) {
        await run(
            `INSERT OR IGNORE INTO roles (key, name, description, color, priority, is_system, is_auto)
             VALUES (?, ?, ?, ?, ?, 1, ?)`,
            [role.key, role.name, role.description, role.color, role.priority, role.isAuto],
        );
        for (const permission of role.permissions) {
            await run(
                `INSERT OR IGNORE INTO role_permissions (role_id, permission)
                 SELECT id, ? FROM roles WHERE key = ?`,
                [permission, role.key],
            );
        }
    }

    // 2. 不變量：至少一位管理員
    const superusers = await all(
        `SELECT id, username FROM users WHERE id IN (${SUPERUSER_IDS}) ORDER BY id`,
    );
    if (superusers.length === 0) {
        throw new Error(
            '沒有任何使用者持有帶「所有權限」的身分組，已中止並回滾。\n' +
                '  從這一版起舊的 users.role 欄位不再有任何作用，必須先指定一位管理員。\n' +
                '  請執行 npm run grant-admin -- <username> 後重新執行遷移。',
        );
    }

    // 3. 一致性報告
    const legacyAdminOnly = await all(
        `SELECT id, username FROM users
         WHERE role = 'admin' AND id NOT IN (${SUPERUSER_IDS}) ORDER BY id`,
    );
    const roleAdminOnly = await all(
        `SELECT id, username FROM users
         WHERE COALESCE(role, '') != 'admin' AND id IN (${SUPERUSER_IDS}) ORDER BY id`,
    );
    const legacyTreasurerOnly = await all(
        `SELECT u.id, u.username FROM users u
         WHERE u.can_manage_payouts = 1
           AND NOT EXISTS (
               SELECT 1 FROM user_roles ur
               JOIN role_permissions rp ON rp.role_id = ur.role_id
               WHERE ur.user_id = u.id AND rp.permission IN ('*', 'courseReviews.*', 'courseReviews.payout')
           )
         ORDER BY u.id`,
    );

    console.log('');
    console.log(
        `    管理員（持有帶「所有權限」的身分組）：${superusers.length} 位（${names(superusers)}）`,
    );

    if (
        legacyAdminOnly.length === 0 &&
        roleAdminOnly.length === 0 &&
        legacyTreasurerOnly.length === 0
    ) {
        console.log('    舊欄位與身分組一致，沒有需要核對的帳號。');
    } else {
        console.log('    ⚠️ 以下帳號的舊欄位與身分組不一致（僅供核對，未做任何變更）：');
        if (legacyAdminOnly.length) {
            console.log(`      舊 role='admin' 但沒有管理員身分組：${names(legacyAdminOnly)}`);
            console.log(
                '        → 若是之前在後台降權的，屬正常；若該是管理員，執行 npm run grant-admin -- <username>',
            );
        }
        if (roleAdminOnly.length) {
            console.log(`      有管理員身分組但舊 role 不是 'admin'：${names(roleAdminOnly)}`);
            console.log('        → 在後台指派的管理員，屬正常。只影響程式碼回滾到舊版後的權限');
        }
        if (legacyTreasurerOnly.length) {
            console.log(
                `      舊 can_manage_payouts=1 但沒有發放回饋金權限：${names(legacyTreasurerOnly)}`,
            );
            console.log('        → 若該是總務，到後台「用戶管理」指派總務身分組');
        }
    }
    process.stdout.write('  ');
};
