import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../services/api';

// 考古題管理頁與大抄管理頁共用的狀態機。
//
// 這兩支頁面在抽取前有 69% 的行完全相同（180/261）：同一套 loading/error、
// 同一套刪除確認流程、同一套 snackbar、同一套下載 blob 的樣板。差別只在
// 資源路徑、搜尋比對哪些欄位、以及表格長什麼樣。
//
// 刻意抽成 hook 而不是抽成一個吃 columns 設定的共用元件：表格 JSX 留在各自
// 的頁面裡，下一屆打開 ExamManagePage.js 仍然一眼看得到考古題的欄位長怎樣，
// 不必先去讀一份設定物件的規格。共用的是「行為」，不是「長相」。
//
// 參數：
//   resourcePath  API 路徑片段，例如 'exams'、'cheat-sheets'
//   listQuery     取清單時附加的 query string，例如 '?limit=1000'
//   matches       (item, 小寫後的搜尋字串) => boolean，決定搜尋比對哪些欄位
//   messages      已經過 t() 翻譯的訊息字串，hook 本身不碰 i18n
export const useResourceManage = ({ resourcePath, listQuery = '', matches, messages }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);

    // messages 每次 render 都是新物件（裡面是 t() 的結果）。直接放進 useCallback
    // 的依賴會讓 refresh 每次都變，useEffect 就無限重抓；把它排除在依賴之外又會
    // 讀到第一次 render 的舊翻譯（切語言後訊息不會跟著變）。
    // 用 ref 存最新的一份，兩個問題一起解決，也不必去壓 exhaustive-deps 警告。
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    const notify = useCallback((message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const closeSnackbar = useCallback(() => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    }, []);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/${resourcePath}${listQuery}`);
            if (!response.ok) throw new Error(messagesRef.current.fetchFailed);

            const result = await response.json();
            setItems(result.data || []);
        } catch (err) {
            console.error(`取得 ${resourcePath} 失敗:`, err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [resourcePath, listQuery]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return;

        try {
            const response = await fetch(`${API_BASE_URL}/${resourcePath}/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (!response.ok) throw new Error(messagesRef.current.deleteFailed);

            // 一定要重抓：不重抓的話畫面會留著一列已經不存在的資料
            await refresh();
            notify(messagesRef.current.deleted, 'success');
        } catch (err) {
            console.error(`刪除 ${resourcePath} 失敗:`, err);
            notify(err.message || messagesRef.current.deleteFailed, 'error');
        } finally {
            setDeleteTarget(null);
        }
    }, [deleteTarget, resourcePath, refresh, notify]);

    const download = useCallback(
        async (id, filename) => {
            try {
                const response = await fetch(`${API_BASE_URL}/${resourcePath}/${id}/download`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                if (!response.ok) throw new Error(messagesRef.current.downloadFailed);

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            } catch (err) {
                console.error('下載錯誤:', err);
                notify(messagesRef.current.downloadFailed, 'error');
            }
        },
        [resourcePath, notify],
    );

    // window.open 沒辦法帶 Authorization 標頭，所以預覽的 token 走 query string
    const openPreview = useCallback(
        (path) => {
            const token = localStorage.getItem('token');
            window.open(`${API_BASE_URL}/${resourcePath}/${path}?token=${token}`, '_blank');
        },
        [resourcePath],
    );

    const term = searchTerm.toLowerCase();
    const filteredItems = items.filter((item) => matches(item, term));

    return {
        items,
        filteredItems,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        snackbar,
        notify,
        closeSnackbar,
        deleteTarget,
        requestDelete: setDeleteTarget,
        cancelDelete: () => setDeleteTarget(null),
        confirmDelete,
        editTarget,
        requestEdit: setEditTarget,
        closeEdit: () => setEditTarget(null),
        refresh,
        download,
        openPreview,
    };
};

export default useResourceManage;
