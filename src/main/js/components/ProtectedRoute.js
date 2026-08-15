import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Lock, Payment, AdminPanelSettings } from '@mui/icons-material';

const ProtectedRoute = ({
    children,
    requireAuth = true,
    requirePaid = false,
    requireAdmin = false,
    requirePermission = null,
    requireModule = null,
    fallback = null
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
        return fallback || (
            <Box maxWidth="md" mx="auto" p={3}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Lock sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        {t(isModuleComingSoon(requireModule) ? 'nav.comingSoon' : 'guard.moduleUnavailableTitle')}
                    </Typography>
                    <Typography color="textSecondary" paragraph>
                        {t(isModuleComingSoon(requireModule)
                            ? 'guard.comingSoonBody'
                            : 'guard.moduleUnavailableBody')}
                    </Typography>
                    <Button variant="contained" href="/" sx={{ mt: 2 }}>
                        {t('guard.backHome')}
                    </Button>
                </Paper>
            </Box>
        );
    }

    // 檢查登入要求
    if (requireAuth && !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 檢查特定權限（新式權限 key，例如 'users.manage'）
    if (requirePermission && !hasPermission(requirePermission)) {
        return fallback || (
            <Box maxWidth="md" mx="auto" p={3}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <AdminPanelSettings sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        {t('guard.noPermissionTitle')}
                    </Typography>
                    <Typography color="textSecondary" paragraph>
                        {t('guard.noPermissionBody')}
                    </Typography>
                    <Button variant="contained" href="/" sx={{ mt: 2 }}>
                        {t('guard.backHome')}
                    </Button>
                </Paper>
            </Box>
        );
    }

    // 檢查管理員權限
    if (requireAdmin && !hasPermission('admin')) {
        return fallback || (
            <Box maxWidth="md" mx="auto" p={3}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <AdminPanelSettings sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        {t('guard.adminRequiredTitle')}
                    </Typography>
                    <Typography color="textSecondary" paragraph>
                        {t('guard.adminRequiredBody')}
                    </Typography>
                    <Button variant="contained" href="/" sx={{ mt: 2 }}>
                        {t('guard.backHome')}
                    </Button>
                </Paper>
            </Box>
        );
    }

    // 檢查繳費要求
    if (requirePaid && !hasPermission('paid')) {
        return fallback || (
            <Box maxWidth="md" mx="auto" p={3}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Payment sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        {t('guard.paymentRequiredTitle')}
                    </Typography>
                    <Typography color="textSecondary" paragraph>
                        {t('guard.paymentRequiredBody')}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                        {t('guard.paymentRequiredHint')}
                    </Typography>
                    <Button variant="contained" href="/about" sx={{ mt: 2 }}>
                        {t('guard.contactUs')}
                    </Button>
                </Paper>
            </Box>
        );
    }

    return children;
};

// 便利組件 - 需要登入
export const RequireAuth = ({ children, fallback }) => (
    <ProtectedRoute requireAuth={true} fallback={fallback}>
        {children}
    </ProtectedRoute>
);

// 便利組件 - 需要繳費
export const RequirePaid = ({ children, fallback }) => (
    <ProtectedRoute requireAuth={true} requirePaid={true} fallback={fallback}>
        {children}
    </ProtectedRoute>
);

// 便利組件 - 需要管理員權限
export const RequireAdmin = ({ children, fallback }) => (
    <ProtectedRoute requireAuth={true} requireAdmin={true} fallback={fallback}>
        {children}
    </ProtectedRoute>
);

// 登入狀態顯示組件
export const AuthStatus = () => {
    const { t } = useTranslation();
    const { user, isAuthenticated, getFeeStatusMessage } = useAuth();

    if (!isAuthenticated) {
        return (
            <Box display="flex" alignItems="center" gap={1}>
                <Lock fontSize="small" />
                <Typography variant="body2">{t('guard.notLoggedIn')}</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="body2">
                {t('guard.welcome', { name: user.fullName || user.username })}
            </Typography>
            <Typography variant="caption" color="textSecondary">
                {getFeeStatusMessage()}
            </Typography>
        </Box>
    );
};

export default ProtectedRoute;