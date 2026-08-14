// 身分預覽目標的儲存（管理台的「以身分組檢視」/「以成員檢視」）。
//
// 刻意獨立成一個模組，不放在 api.js 裡：這裡只碰 sessionStorage，和 axios 無關。
// 混在 api.js 會讓任何想測這段邏輯的測試都被迫載入 axios——而 axios v1 是 ESM，
// CRA 的 jest 預設不轉譯 node_modules，整個測試檔會直接掛掉。
//
// 用 sessionStorage 而非 localStorage：預覽是臨時的除錯狀態，關掉分頁就該結束，
// 也不該影響同時開著的其他分頁。
const PREVIEW_KEY = 'previewAs';

export const getPreviewTarget = () => {
    try {
        return sessionStorage.getItem(PREVIEW_KEY);
    } catch (error) {
        // 無痕模式或 storage 被封鎖時當作沒有預覽
        return null;
    }
};

export const setPreviewTarget = (target) => {
    try {
        // 一定要用 removeItem 而不是 setItem(key, null)——後者會存成字串 'null'，
        // 之後每個請求都會帶 X-Preview-As: null，後端一律回 400。
        if (target) sessionStorage.setItem(PREVIEW_KEY, target);
        else sessionStorage.removeItem(PREVIEW_KEY);
    } catch (error) {
        // 存不進去就只在這個分頁的記憶體裡生效，不影響切換本身
    }
};
