import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Lock, Payment, AdminPanelSettings } from '@mui/icons-material';

const ProtectedRoute = ({ 
    children, 
    requireAuth = true, 
    requirePaid = false, 
    requireAdmin = false,
    fallback = null 
}) => {
    const { user, loading, hasPermission } = useAuth();
    const location = useLocation();

    // 載入中
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <Typography>載入中...</Typography>
            </Box>
        );
    }

    // 檢查登入要求
    if (requireAuth && !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 檢查管理員權限
    if (requireAdmin && !hasPermission('admin')) {
        return fallback || (
            <Box maxWidth="md" mx="auto" p={3}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <AdminPanelSettings sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        需要管理員權限
                    </Typography>
                    <Typography color="textSecondary" paragraph>
                        此頁面僅限管理員存取
                    </Typography>
                    <Button variant="contained" href="/" sx={{ mt: 2 }}>
                        返回首頁
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
                        需要繳交系學會費
                    </Typography>
                    <Typography color="textSecondary" paragraph>
                        此功能僅開放給已繳交系學會費的會員使用
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                        請聯繫系學會幹部或至系辦繳交會費
                    </Typography>
                    <Button variant="contained" href="/about" sx={{ mt: 2 }}>
                        聯絡我們
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
    const { user, isAuthenticated, getFeeStatusMessage } = useAuth();

    if (!isAuthenticated) {
        return (
            <Box display="flex" alignItems="center" gap={1}>
                <Lock fontSize="small" />
                <Typography variant="body2">未登入</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="body2">
                歡迎，{user.fullName || user.username}
            </Typography>
            <Typography variant="caption" color="textSecondary">
                {getFeeStatusMessage()}
            </Typography>
        </Box>
    );
};

export default ProtectedRoute;