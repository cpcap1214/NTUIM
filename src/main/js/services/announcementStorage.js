// 公告「不要再提醒」的本機記錄。
//
// 為什麼需要這一份，而不是全部交給後端：訪客也看得到公告，但訪客沒有帳號可以綁記錄。
//
// 讀取時取「後端記錄 ∪ 本機記錄」的聯集，這是刻意的：
//   - 訪客先關掉公告、之後才註冊登入 → 後端沒有那筆，只看後端會讓公告再跳一次
//   - 換一台裝置登入 → 本機是空的，後端那半邊補上
// 取聯集就不需要額外做一支「登入時把本機記錄同步上去」的端點。
//
// 用 localStorage 而非 sessionStorage：關掉分頁就忘記的話，訪客每次開站都會被公告打斷。
//
// 獨立成一個模組（比照 previewStorage.js）：這裡只碰 storage、不依賴 axios。
// 混進 service 會讓任何想測這段邏輯的測試都被迫載入 axios——axios v1 是 ESM，
// CRA 的 jest 預設不轉譯 node_modules，整個測試檔會直接掛掉。
const STORAGE_KEY = 'dismissedAnnouncements';

export const getDismissedAnnouncements = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        // 手動改壞或舊格式殘留時當作沒有記錄，不要讓整個公告視窗因此爆掉
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : [];
    } catch (error) {
        return [];
    }
};

export const addDismissedAnnouncements = (ids) => {
    if (!ids || ids.length === 0) return;
    try {
        const merged = [...new Set([...getDismissedAnnouncements(), ...ids])];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (error) {
        // 無痕模式或 storage 被封鎖時只在這個分頁的記憶體裡生效，不影響關閉動作本身
    }
};

// 只給測試與「重新顯示所有公告」用
export const clearDismissedAnnouncements = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        // 同上
    }
};
