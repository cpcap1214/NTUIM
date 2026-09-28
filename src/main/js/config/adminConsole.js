// 管理控制台的門禁與導覽設定。AdminPage、AuthContext、Header 共用這一份。
//
// 原本 PERMISSION_TO_TAB 只寫在 AdminPage 裡，導覽列則自己用 isAdmin 決定要不要
// 顯示後台入口——結果純總務（只有 courseReviews.payout）進得了控制台，
// 卻在選單上找不到入口。門禁條件只能有一份。

// 後台權限 → 該權限對應的分頁編號。
//
// 這張表有兩個用途，漏一筆就會有人被鎖在門外：
//   1. CONSOLE_PERMISSIONS ＝ 控制台的門禁清單。不在表裡的權限，就算 AdminPage
//      為它列了功能卡片，持有者也進不了控制台。
//   2. 沒有 users.manage 的人預設要落在哪個分頁（順序即「第一個有權限的功能」判定順序）。
//
// 新增分頁時務必回來補這一筆。
export const PERMISSION_TO_TAB = {
    'users.manage': 0,
    'roles.manage': 7,
    'modules.manage': 8,
    'exams.manage': 3,
    'cheatSheets.manage': 4,
    'courseReviews.moderate': 5,
    'exams.upload': 1,
    'cheatSheets.upload': 2,
    'courseReviews.payout': 6,
    'announcements.manage': 9,
    'feedback.manage': 10,
};

export const CONSOLE_PERMISSIONS = Object.keys(PERMISSION_TO_TAB);

// 導覽列「管理」區塊的項目。permission 為 null 表示「持有任一後台權限」即可。
// 必須和各頁面自己的權限判斷一致，否則會出現「點得到、進去卻說沒權限」。
export const ADMIN_NAV_ITEMS = [
    { id: 'admin-panel', labelKey: 'nav.adminPanel', path: '/admin', permission: null },
    {
        id: 'admin-exam-manage',
        labelKey: 'nav.adminExamManage',
        path: '/admin/exam-manage',
        permission: 'exams.manage',
    },
    {
        id: 'admin-cheatsheet-manage',
        labelKey: 'nav.adminCheatSheetManage',
        path: '/admin/cheatsheet-manage',
        permission: 'cheatSheets.manage',
    },
];
