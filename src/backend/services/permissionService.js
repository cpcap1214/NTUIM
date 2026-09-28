// 權限解析：把「使用者」換算成「他實際持有的權限與可用模組」。
//
// 解析來源有三個：
//   1. user_roles 明確指派的身分組
//   2. 「會員」自動身分組——若 has_paid_fee 為真就併入，不存 user_roles
//      （繳費狀態有多個寫入點，存兩份必然漂移，見 migration 007 的說明）
//   3. 身分組持有的權限字串，支援 '*' 與 'namespace.*' 萬用字元
//
// 每次請求多兩個 join 查詢即可，不做快取：
// 改用身分組的重點就是「權限調整下一個請求就生效」，加了快取等於把剛消除的
// 陳舊問題又搬回來，而失效點散落在多個寫入處，一定會漏掉一個。
// 這是低流量的系學會網站、SQLite 走 WAL、單一 pm2 行程——成本是微秒等級。

const { sequelize, Module } = require('../models');
const { permissionSatisfies, expandPermissions, WILDCARD } = require('../config/permissions');

const AUTO_MEMBER_ROLE_KEY = 'member';

// 身分組對外的唯一形狀。原本 resolve() 不帶 isAuto、admin.js 只有自動身分組才補上，
// 前端要判斷「這個 chip 能不能手動拿掉」時得自己猜。
const toRoleDTO = (role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    color: role.color,
    isAuto: !!role.isAuto,
});

const ROLE_COLUMNS = 'r.id, r.key, r.name, r.color, r.priority, r.is_auto AS isAuto';

// 取得使用者持有的身分組（含自動身分組）
const getUserRoles = async (user) => {
    if (!user || !user.id) return [];

    const assigned = await sequelize.query(
        `SELECT ${ROLE_COLUMNS}
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ?
         ORDER BY r.priority DESC`,
        { replacements: [user.id], type: sequelize.QueryTypes.SELECT },
    );

    // 已繳費 → 自動併入「會員」身分組（不會出現在 user_roles 裡）
    if (user.hasPaidFee) {
        const alreadyHas = assigned.some((r) => r.key === AUTO_MEMBER_ROLE_KEY);
        if (!alreadyHas) {
            const [autoRole] = await sequelize.query(
                `SELECT ${ROLE_COLUMNS} FROM roles r WHERE r.key = ?`,
                { replacements: [AUTO_MEMBER_ROLE_KEY], type: sequelize.QueryTypes.SELECT },
            );
            if (autoRole) assigned.push(autoRole);
        }
    }

    return assigned.sort((a, b) => b.priority - a.priority);
};

// 取得使用者持有的原始權限字串集合（可能含萬用字元）
const getRawPermissions = async (roles) => {
    if (roles.length === 0) return new Set();

    const roleIds = roles.map((r) => r.id);
    const rows = await sequelize.query(
        `SELECT DISTINCT permission FROM role_permissions WHERE role_id IN (:roleIds)`,
        { replacements: { roleIds }, type: sequelize.QueryTypes.SELECT },
    );
    return new Set(rows.map((r) => r.permission));
};

// 解析出完整的權限樣貌，掛到 req.user 上
const resolve = async (user) => {
    const roles = await getUserRoles(user);
    const rawPermissions = await getRawPermissions(roles);

    return {
        roles: roles.map(toRoleDTO),
        // rawPermissions 保留萬用字元供判斷用；permissions 是展開後的實際清單，供前端顯示
        rawPermissions,
        permissions: expandPermissions(rawPermissions),
        isAdmin: rawPermissions.has(WILDCARD),
    };
};

const hasPermission = (resolved, required) =>
    permissionSatisfies(resolved?.rawPermissions, required);

// 解析「只持有某一個身分組」的假想使用者，供管理台的「以身分組檢視」使用。
// 刻意不套用自動身分組的推導——預覽的語意就是「單獨持有這個身分組會怎樣」。
const resolveForRole = async (roleId) => {
    const [role] = await sequelize.query(`SELECT ${ROLE_COLUMNS} FROM roles r WHERE r.id = ?`, {
        replacements: [roleId],
        type: sequelize.QueryTypes.SELECT,
    });
    if (!role) return null;

    const rawPermissions = await getRawPermissions([role]);
    return {
        role,
        resolved: {
            roles: [toRoleDTO(role)],
            rawPermissions,
            permissions: expandPermissions(rawPermissions),
            isAdmin: rawPermissions.has(WILDCARD),
        },
    };
};

// 預覽權限與「發起預覽者本人」取交集。
//
// 目前只有持有 '*' 的管理員能發起預覽，所以交集恆等於 target，這一步看似多餘。
// 但它是結構性防線：哪天有人把發起條件放寬成 users.manage，
// 少了這一步，一個只有用戶管理權限的人就能「預覽成管理員」而取得全站權限。
// 保留它，那個洞就不會隨著一次看似無害的條件放寬而打開。
const intersectResolved = (target, caller) => {
    if (permissionSatisfies(caller?.rawPermissions, WILDCARD)) return target;

    const rawPermissions = new Set(
        [...target.rawPermissions].filter((p) => permissionSatisfies(caller?.rawPermissions, p)),
    );
    return {
        ...target,
        rawPermissions,
        permissions: expandPermissions(rawPermissions),
        isAdmin: rawPermissions.has(WILDCARD),
    };
};

// 一次取得多位使用者的身分組（含依繳費狀態推導的「會員」），給用戶管理清單用。
// 逐一 resolve() 在幾百人的清單上會變成幾百次查詢，這裡固定兩次。
// 回傳 { [userId]: RoleDTO[] }，依 priority 由高到低。
const getRolesForUsers = async (users) => {
    const assignments = await sequelize.query(
        `SELECT ur.user_id AS userId, ${ROLE_COLUMNS}
         FROM user_roles ur JOIN roles r ON r.id = ur.role_id
         ORDER BY r.priority DESC`,
        { type: sequelize.QueryTypes.SELECT },
    );
    const [memberRole] = await sequelize.query(
        `SELECT ${ROLE_COLUMNS} FROM roles r WHERE r.key = ?`,
        { replacements: [AUTO_MEMBER_ROLE_KEY], type: sequelize.QueryTypes.SELECT },
    );

    const byUser = {};
    assignments.forEach((row) => {
        (byUser[row.userId] = byUser[row.userId] || []).push(row);
    });

    const result = {};
    users.forEach((user) => {
        const roles = [...(byUser[user.id] || [])];
        if (user.hasPaidFee && memberRole && !roles.some((r) => r.key === AUTO_MEMBER_ROLE_KEY)) {
            roles.push(memberRole);
        }
        result[user.id] = roles.sort((a, b) => b.priority - a.priority).map(toRoleDTO);
    });
    return result;
};

// 「管理員」＝持有任一帶 '*' 的身分組的人，不綁定 key='admin'——
// 自訂身分組也可能被給了 '*'，那個人同樣是管理員。
//
// 「不可移除最後一位管理員」原本有三套各自的判斷（兩套還在數舊的 users.role 欄位，
// 那個欄位早已不隨身分組更新），刪使用者的其中一條路徑甚至完全沒有保護。
// 一律改用這裡：傳入「假設這個人／這個身分組不算」，看還剩幾位。
const countSuperusers = async ({ exceptUserId = null, exceptRoleId = null } = {}) => {
    const [row] = await sequelize.query(
        `SELECT COUNT(DISTINCT ur.user_id) AS count
         FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id AND rp.permission = :wildcard
         WHERE (:exceptUserId IS NULL OR ur.user_id != :exceptUserId)
           AND (:exceptRoleId IS NULL OR ur.role_id != :exceptRoleId)`,
        {
            replacements: { wildcard: WILDCARD, exceptUserId, exceptRoleId },
            type: sequelize.QueryTypes.SELECT,
        },
    );
    return row.count;
};

// 某位使用者目前是否為管理員（持有帶 '*' 的身分組）
const isSuperuser = async (userId) => {
    const [row] = await sequelize.query(
        `SELECT 1 AS yes FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id AND rp.permission = ?
         WHERE ur.user_id = ? LIMIT 1`,
        { replacements: [WILDCARD, userId], type: sequelize.QueryTypes.SELECT },
    );
    return !!row;
};

// ---------------------------------------------------------------------------
// 模組存取
//
// 真值表（visibility × 白名單）：
//   public     → 所有人可用，module_access 一律忽略
//   restricted → 持有 '*' 者可用（管理員才能在未公開前測試）
//                身分組在白名單內可用
//                使用者本人在白名單內可用
//                白名單為空 → 只有持有 '*' 的人可用
// 未登入者：rawPermissions 為空集合，因此只能存取 public 模組。
// 也就是說 modules.visibility = 'public' 就是這個系統的 @everyone。
// ---------------------------------------------------------------------------
const canAccessModule = async (user, resolved, moduleKey) => {
    const module = await Module.findOne({ where: { key: moduleKey } });

    // 資料庫裡沒有這個模組 → 不做限制（避免忘了 seed 就把整個功能鎖死）
    if (!module) return true;
    if (module.visibility === 'public') return true;
    if (resolved?.rawPermissions?.has(WILDCARD)) return true;

    const roleIds = (resolved?.roles || []).map((r) => r.id);
    const rows = await sequelize.query(
        `SELECT 1 FROM module_access
         WHERE module_id = :moduleId
           AND ( (user_id IS NOT NULL AND user_id = :userId)
              OR (role_id IS NOT NULL AND role_id IN (:roleIds)) )
         LIMIT 1`,
        {
            replacements: {
                moduleId: module.id,
                userId: user?.id || -1,
                // IN () 不能是空陣列，塞一個不可能的 id
                roleIds: roleIds.length > 0 ? roleIds : [-1],
            },
            type: sequelize.QueryTypes.SELECT,
        },
    );

    return rows.length > 0;
};

// 給前端用的模組清單：可否使用、受限時是否仍要顯示入口（標「即將推出」）
const listModulesFor = async (user, resolved) => {
    const modules = await Module.findAll({ order: [['id', 'ASC']] });
    const result = {};

    for (const module of modules) {
        const accessible = await canAccessModule(user, resolved, module.key);
        result[module.key] = {
            key: module.key,
            name: module.name,
            accessible,
            // 不可用但仍要在選單顯示 → 前端標示「即將推出」
            comingSoon: !accessible && module.showWhenRestricted,
            visible: accessible || module.showWhenRestricted,
        };
    }

    return result;
};

module.exports = {
    toRoleDTO,
    getRolesForUsers,
    countSuperusers,
    isSuperuser,
    resolve,
    resolveForRole,
    intersectResolved,
    hasPermission,
    canAccessModule,
    listModulesFor,
};
