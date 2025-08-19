import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

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

    // 初始化時檢查本地儲存的使用者資料
    useEffect(() => {
        const initAuth = () => {
            try {
                const token = authService.getToken();
                const userData = authService.getCurrentUser();
                
                if (token && userData) {
                    setUser(userData);
                }
            } catch (error) {
                console.error('初始化認證失敗:', error);
                authService.logout();
            }
            setLoading(false);
        };

        initAuth();
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