import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import userService from '../services/userService';
import moduleService from '../services/moduleService';

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
    // 模塊開放狀態。獨立於 user 之外載入，因為未登入的訪客同樣需要它來決定導覽列內容
    const [modules, setModules] = useState({});

    const syncUserProfile = async () => {
        const profile = await userService.getProfile();
        setUser(profile);
        authService.setCurrentUser(profile);
        if (profile?.modules) setModules(profile.modules);
        return profile;
    };

    // 模塊清單走公開端點，登入與否都要載入。
    // 登入者的 /users/profile 也會帶回同一份資料，兩邊都更新即可，
    // 差別在於登入後的結果會反映該使用者的身分組。
    const loadModules = async () => {
        try {
            const data = await moduleService.getModules();
            setModules(data || {});
        } catch (error) {
            // 取不到就維持空物件；isModuleVisible 對未知模塊預設回 true，
            // 寧可先顯示也不要讓導覽列整個消失
            console.warn('取得模塊清單失敗:', error);
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
                    // profile 帶回的模塊狀態已反映此使用者的身分組，覆蓋掉先前的匿名版本
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
            // 登入 API 只回基本欄位，權限與模塊要另外抓；模塊開放狀態會因身分組而不同
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
        // 模塊開放狀態要回到匿名版本（authService.logout 會轉頁，這裡是保險）
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

    // 更新使用者資料
    const updateUser = (userData) => {
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        authService.updateLocalUser(updatedUser);
    };

    // 全前端唯一的管理員判斷來源。原本這個判斷（含寫死的 cpcap 使用者名稱後門）
    // 在前端被複製了 6 份、後端 5 份；後門已移除，理由見後端 middleware/auth.js。
    const isAdminUser = user?.role === 'admin';

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

    // 模塊開放狀態。未登入時也要能取得，否則登出訪客的導覽列會全空或先閃出完整選單。
    const isModuleVisible = (moduleKey) => {
        if (!moduleKey) return true; // 沒綁模塊的項目（首頁、關於我們）一律顯示
        const info = modules[moduleKey];
        if (!info) return true; // 還沒載入或後端沒有該模塊 → 先顯示，避免畫面閃爍
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
        if (!user) return '請先登入';
        if (isAdminUser) return '管理員身份';
        if (user.hasPaidFee) return '已繳交系學會費';
        return '尚未繳交系學會費';
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
        // 權限與模塊
        permissions,
        roles: user?.roles || [],
        modules,
        reloadModules: loadModules,
        isModuleVisible,
        isModuleAccessible,
        isModuleComingSoon,
        // 便利方法
        isAuthenticated: !!user,
        isAdmin: isAdminUser,
        isMember: user?.role === 'member' || isAdminUser,
        hasPaidFee: user?.hasPaidFee || isAdminUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
