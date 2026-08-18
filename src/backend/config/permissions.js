// 全站權限目錄。
//
// 權限「種類」定義在程式碼裡而不是資料表：它們是隨程式碼演進的東西，
// 管理員應該能自由組合權限成身分組，但不該能憑空發明一個沒有任何程式碼在檢查的權限。
// 這份 manifest 同時供後台的身分組編輯器渲染（透過 GET /api/permissions）。
//
// 命名規則：<模組或領域>.<動作>，例如 courseReviews.payout。
// 萬用字元支援兩種：
//   '*'           所有權限（管理員身分組持有）
//   'exams.*'     該命名空間下的所有權限

const PERMISSIONS = [
    // 系統管理
    { key: 'users.manage', group: '系統管理', label: '用戶管理', description: '查詢、編輯、刪除使用者與重設密碼' },
    { key: 'roles.manage', group: '系統管理', label: '身分組管理', description: '建立身分組、調整權限、指派成員' },
    { key: 'modules.manage', group: '系統管理', label: '模組管理', description: '設定各功能模組開放給哪些身分組或使用者' },
    { key: 'announcements.manage', group: '系統管理', label: '公告管理', description: '發佈、編輯與下架站上公告' },
    { key: 'feedback.manage', group: '系統管理', label: '回饋管理', description: '檢視與處理使用者送出的匿名意見回饋' },

    // 考古題
    { key: 'exams.upload', group: '考古題', label: '上傳考古題', description: '新增考古題與答案檔案' },
    { key: 'exams.manage', group: '考古題', label: '管理考古題', description: '編輯與刪除任何人上傳的考古題' },
    { key: 'exams.download', group: '考古題', label: '下載考古題', description: '預覽與下載考古題檔案（目前等同已繳費會員）' },

    // 大抄
    { key: 'cheatSheets.upload', group: '大抄', label: '上傳大抄', description: '新增課程重點整理' },
    { key: 'cheatSheets.manage', group: '大抄', label: '管理大抄', description: '編輯與刪除任何人上傳的大抄' },

    // 課程評價
    { key: 'courseReviews.moderate', group: '課程評價', label: '審核課程評價', description: '核准或拒絕使用者送出的課程評價' },
    { key: 'courseReviews.payout', group: '課程評價', label: '發放回饋金', description: '管理課程評價回饋金的發放狀態' },
];

const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

const WILDCARD = '*';

// 判斷「持有的權限集合」是否滿足某個所需權限。
// 支援 '*'（全部）與 'namespace.*'（該命名空間全部）。
const permissionSatisfies = (heldSet, required) => {
    if (!heldSet || heldSet.size === 0) return false;
    if (heldSet.has(WILDCARD)) return true;
    if (heldSet.has(required)) return true;

    const namespace = required.split('.')[0];
    return heldSet.has(`${namespace}.*`);
};

// 把可能含萬用字元的權限集合，展開成實際存在的權限 key 清單（給前端顯示用）。
// 程式碼裡已不存在的舊權限 key 會被忽略——資料庫可能還留著被刪掉的權限，
// 那不該讓解析爆掉，也不該對程式碼常數建外鍵。
const expandPermissions = (heldSet) => {
    if (!heldSet || heldSet.size === 0) return [];
    if (heldSet.has(WILDCARD)) return [...PERMISSION_KEYS];

    const result = new Set();
    heldSet.forEach((held) => {
        if (held.endsWith('.*')) {
            const namespace = held.slice(0, -2);
            PERMISSION_KEYS.filter((k) => k.startsWith(`${namespace}.`)).forEach((k) => result.add(k));
        } else if (PERMISSION_KEYS.includes(held)) {
            result.add(held);
        }
    });
    return [...result];
};

module.exports = { PERMISSIONS, PERMISSION_KEYS, WILDCARD, permissionSatisfies, expandPermissions };
