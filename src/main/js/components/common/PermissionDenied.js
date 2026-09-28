import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Paper, Typography } from '@mui/material';
import { AdminPanelSettings } from '@mui/icons-material';

// 全站唯一的「不能進來」畫面。
//
// 原本 ProtectedRoute 內有三份幾乎一樣的區塊（權限不足／需要管理員／需要繳費），
// 管理頁各自又寫了一份樣式不同的，後台控制台則是跳 alert() 再導回首頁。
// 同一件事長四種樣子，使用者分不出是權限問題還是頁面壞了。
const PermissionDenied = ({
    icon = <AdminPanelSettings sx={{ fontSize: 60, color: 'error.main' }} />,
    title,
    body,
}) => {
    const { t } = useTranslation();

    return (
        <Box maxWidth="md" mx="auto" p={3}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{ mb: 2 }}>{icon}</Box>
                <Typography variant="h5" gutterBottom>
                    {title || t('guard.noPermissionTitle')}
                </Typography>
                <Typography color="text.secondary" paragraph>
                    {body || t('guard.noPermissionBody')}
                </Typography>
                <Button variant="contained" href="/" sx={{ mt: 2 }}>
                    {t('guard.backHome')}
                </Button>
            </Paper>
        </Box>
    );
};

export default PermissionDenied;
