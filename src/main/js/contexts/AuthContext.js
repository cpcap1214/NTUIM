import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import userService from '../services/userService';

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

    const syncUserProfile = async () => {
        const profile = await userService.getProfile();
        setUser(profile);
        authService.setCurrentUser(profile);
        return profile;
    };

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

    // 檢查權限
    const hasPermission = (permission) => {
        if (!user) return false;

        switch (permission) {
            case 'admin':
                return user.role === 'admin';
            case 'member':
                return user.role === 'member' || user.role === 'admin';
            case 'paid':
                return user.hasPaidFee || user.role === 'admin';
            case 'upload':
                return user.hasPaidFee || user.role === 'admin';
            case 'download':
                return user.hasPaidFee || user.role === 'admin';
            default:
                return false;
        }
    };

    // 取得會費狀態訊息
    const getFeeStatusMessage = () => {
        if (!user) return '請先登入';
        if (user.role === 'admin') return '管理員身份';
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
        // 便利方法
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isMember: user?.role === 'member' || user?.role === 'admin',
        hasPaidFee: user?.hasPaidFee || user?.role === 'admin'
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
