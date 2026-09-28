import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography } from '@mui/material';
import { Lock } from '@mui/icons-material';
import PermissionDenied from './common/PermissionDenied';

// 路由守衛。只有三種條件，全部對應後端真的在檢查的東西：
//   requireModule      模組是否對此使用者開放（後端 requireModuleAccess）
//   requireAuth        是否登入
//   requirePermission  是否持有某個權限 key（後端 requirePermission）
//
// 原本還有 requireAdmin 與 requirePaid：前者看的是 isAdmin 而不是實際需要的權限，
// 後者看的是繳費狀態而後端看的是 exams.download。兩個都沒有呼叫端，已移除，
// 以免之後有人用了一個跟後端判斷不一致的守衛。
const ProtectedRoute = ({
    children,
    requireAuth = true,
    requirePermission = null,
    requireModule = null,
    fallback = null,
}) => {
    const { t } = useTranslation();
    const { user, loading, hasPermission, isModuleAccessible, isModuleComingSoon } = useAuth();
    const location = useLocation();

    // 載入中
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <Typography>{t('common.loading')}</Typography>
            </Box>
        );
    }

    // 模組是否開放。這一關要放在登入檢查「之前」——未開放的功能，
    // 對未登入者也該直接說「尚未開放」，而不是先叫他去登入、登入完才發現不能用。
    if (requireModule && !isModuleAccessible(requireModule)) {
        const comingSoon = isModuleComingSoon(requireModule);
        return (
            fallback || (
                <PermissionDenied
                    icon={<Lock sx={{ fontSize: 60, color: 'text.disabled' }} />}
                    title={t(comingSoon ? 'nav.comingSoon' : 'guard.moduleUnavailableTitle')}
                    body={t(comingSoon ? 'guard.comingSoonBody' : 'guard.moduleUnavailableBody')}
                />
            )
        );
    }

    // 檢查登入要求
    if (requireAuth && !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 檢查特定權限（權限 key，例如 'users.manage'）
    if (requirePermission && !hasPermission(requirePermission)) {
        return fallback || <PermissionDenied />;
    }

    return children;
};

export default ProtectedRoute;
