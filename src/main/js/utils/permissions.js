// 權限名稱的顯示。
//
// 權限目錄（GET /api/roles/permissions）來自後端 config/permissions.js，
// 那裡的 label / description 只有中文——英文介面照樣顯示中文。
// 介面文字一律取語系檔的 permissions.<key> 與 permissionGroups.<group>，
// 後端的中文只在語系檔漏了某個 key 時當作 fallback（permissionLabels.test.js 會抓到漏的）。

export const permissionLabel = (t, permission) =>
    t(`permissions.${permission.key}.label`, { defaultValue: permission.label || permission.key });

export const permissionDescription = (t, permission) =>
    t(`permissions.${permission.key}.description`, {
        defaultValue: permission.description || '',
    });

export const permissionGroupLabel = (t, group) =>
    t(`permissionGroups.${group}`, { defaultValue: group });

// 只有 key、沒有目錄資料時（例如身分組卡片上的權限 chip）用這個
export const permissionLabelByKey = (t, key, catalog = []) =>
    permissionLabel(t, catalog.find((p) => p.key === key) || { key });
