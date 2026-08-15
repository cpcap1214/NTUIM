import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n';
import authService from '../services/authService';
import userService from '../services/userService';
import moduleService from '../services/moduleService';
import { getPreviewTarget, setPreviewTarget } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // 模組開放狀態。獨立於 user 之外載入，因為未登入的訪客同樣需要它來決定導覽列內容
    const [modules, setModules] = useState({});

    // 身分預覽狀態。頁面重新整理後要能接續（目標存在 sessionStorage），
    // 否則畫面會停在別人的權限下卻沒有橫幅可以退出。
    const [preview, setPreview] = useState(() => {
        const raw = getPreviewTarget();
        if (!raw) return null;
        const [kind, id] = raw.split(':');
        return { kind, id: Number(id), label: null };
    });

    const syncUserProfile = async () => {
        const profile = await userService.getProfile();
        setUser(profile);
        // 預覽中拿到的是「別人的」資料，不可寫進 localStorage 蓋掉你自己的快取
        if (!getPreviewTarget()) authService.setCurrentUser(profile);
        if (profile?.modules) setModules(profile.modules);
        return profile;
    };

    // 模組清單走公開端點，登入與否都要載入。
    // 登入者的 /users/profile 也會帶回同一份資料，兩邊都更新即可，
    // 差別在於登入後的結果會反映該使用者的身分組。
    const loadModules = async () => {
        try {
            const data = await moduleService.getModules();
            setModules(data || {});
        } catch (error) {
            // 取不到就維持空物件；isModuleVisible 對未知模組預設回 true，
            // 寧可先顯示也不要讓導覽列整個消失
            console.warn('取得模組清單失敗:', error);
        }
    };

    useEffect(() => {
        loadModules();
    }, []);

    // 初始化時以後端資料為準，避免沿用舊的權限快取
    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                const token = authService.getToken();

                if (!token) {
                    if (isMounted) {
                        setUser(null);
                    }
                    return;
                }

                const profile = await userService.getProfile();
                authService.setCurrentUser(profile);

                if (isMounted) {
                    setUser(profile);
                    // profile 帶回的模組狀態已反映此使用者的身分組，覆蓋掉先前的匿名版本
                    if (profile?.modules) setModules(profile.modules);
                }
            } catch (error) {
                console.error('初始化認證失敗:', error);
                const status = error.response?.status;
                const cachedUser = authService.getCurrentUser();

                if (status === 401 || status === 403 || status === 404) {
                    authService.clearAuthData();
                    if (isMounted) {
                        setUser(null);
                    }
                } else if (isMounted && cachedUser) {
                    setUser(cachedUser);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        return () => {
            isMounted = false;
        };
    }, []);

    // 登入
    const login = async (username, password) => {
        try {
            setLoading(true);
            const response = await authService.login(username, password);
            setUser(response.user);
            // 登入 API 只回基本欄位，權限與模組要另外抓；模組開放狀態會因身分組而不同
            await Promise.all([syncUserProfile().catch(() => {}), loadModules()]);
            return response;
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // 註冊
    const register = async (userData) => {
        try {
            setLoading(true);
            const response = await authService.register(userData);
            setUser(response.user);
            return response;
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // 登出
    const logout = () => {
        authService.logout();
        setUser(null);
        // 模組開放狀態要回到匿名版本（authService.logout 會轉頁，這裡是保險）
        loadModules();
    };

    // 重新同步目前使用者資料
    const refreshUser = async () => {
        try {
            const token = authService.getToken();

            if (!token) {
                setUser(null);
                return null;
            }

            setLoading(true);
            return await syncUserProfile();
        } catch (error) {
            console.error('重新取得使用者資料失敗:', error);

            const status = error.response?.status;
            if (status === 401 || status === 403 || status === 404) {
                authService.clearAuthData();
                setUser(null);
            }

            throw error;
        } finally {
            setLoading(false);
        }
    };

    // 以某個身分組或某位成員的身分檢視全站。
    // 後端會改用對方的權限解析（含 API 回應），所以這不只是介面上的模擬；
    // 預覽期間一律唯讀，任何寫入請求都會被後端以 403 擋下。
    const startPreview = async (kind, id, label) => {
        setPreviewTarget(`${kind}:${id}`);
        setPreview({ kind, id, label });
        try {
            await Promise.all([syncUserProfile(), loadModules()]);
        } catch (error) {
            // 失敗就退回原本身分，否則會卡在「標頭已送出但權限沒換」的半吊子狀態
            setPreviewTarget(null);
            setPreview(null);
            await Promise.all([syncUserProfile().catch(() => {}), loadModules()]);
            throw error;
        }
    };

    const stopPreview = async () => {
        setPreviewTarget(null);
        setPreview(null);
        await Promise.all([syncUserProfile().catch(() => {}), loadModules()]);
    };

    // 更新使用者資料
    const updateUser = (userData) => {
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        authService.updateLocalUser(updatedUser);
    };

    // 全前端唯一的管理員判斷來源。原本這個判斷（含寫死的 cpcap 使用者名稱後門）
    // 在前端被複製了 6 份、後端 5 份；後門已移除，理由見後端 middleware/auth.js。
    //
    // 以後端解析出的 isAdmin 為準。舊的 user.role 欄位「不會」隨身分組更新
    // （唯一的寫入點是註冊時的 'user'），所以新指派的管理員用它判斷會是 false。
    // 保留 role 當退路，是為了涵蓋 isAdmin 還沒到手的兩個時間點：
    // localStorage 的舊快取、以及登入 API 的回應（它只回基本欄位，權限要另外抓）。
    const isAdminUser = user?.isAdmin ?? (user?.role === 'admin');

    // 後端解析好的權限清單（GET /users/profile 回傳）。前端只做顯示層的判斷，
    // 真正的授權一律由後端強制執行——這裡放行不代表 API 會放行。
    const permissions = user?.permissions || [];

    // 檢查是否持有某個權限 key（例如 'users.manage'）。
    // 也相容舊的語意化字串（'admin'/'paid'…），避免既有呼叫端一次全壞。
    const hasPermission = (permission) => {
        if (!user) return false;

        switch (permission) {
            case 'admin':
                return isAdminUser;
            case 'member':
                return user.role === 'member' || isAdminUser;
            case 'paid':
            case 'upload':
            case 'download':
                return user.hasPaidFee || isAdminUser;
            default:
                // 新式權限 key：直接查後端給的清單
                return permissions.includes(permission);
        }
    };

    // 模組開放狀態。未登入時也要能取得，否則登出訪客的導覽列會全空或先閃出完整選單。
    const isModuleVisible = (moduleKey) => {
        if (!moduleKey) return true; // 沒綁模組的項目（首頁、關於我們）一律顯示
        const info = modules[moduleKey];
        if (!info) return true; // 還沒載入或後端沒有該模組 → 先顯示，避免畫面閃爍
        return info.visible;
    };

    const isModuleAccessible = (moduleKey) => {
        if (!moduleKey) return true;
        const info = modules[moduleKey];
        if (!info) return true;
        return info.accessible;
    };

    const isModuleComingSoon = (moduleKey) => {
        if (!moduleKey) return false;
        return !!modules[moduleKey]?.comingSoon;
    };

    // 取得會費狀態訊息
    const getFeeStatusMessage = () => {
        if (!user) return i18n.t('feeStatus.pleaseLogin');
        if (isAdminUser) return i18n.t('feeStatus.admin');
        if (user.hasPaidFee) return i18n.t('feeStatus.paid');
        return i18n.t('feeStatus.unpaid');
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
        hasPermission,
        getFeeStatusMessage,
        // 權限與模組
        permissions,
        roles: user?.roles || [],
        modules,
        reloadModules: loadModules,
        isModuleVisible,
        isModuleAccessible,
        isModuleComingSoon,
        // 身分預覽
        preview,
        isPreviewing: !!preview,
        startPreview,
        stopPreview,
        // 便利方法
        isAuthenticated: !!user,
        isAdmin: isAdminUser,
        isMember: user?.role === 'member' || isAdminUser,
        hasPaidFee: user?.hasPaidFee || isAdminUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
