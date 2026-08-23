import { useTranslation } from 'react-i18next';
import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import CheatSheetManagePanel from '../components/admin/CheatSheetManagePanel';

// /admin/cheatsheet-manage 的路由外殼。
//
// 實際功能在 components/admin/CheatSheetManagePanel.js——後台控制台的大抄管理
// 分頁渲染的是同一個元件。這支檔案只負責兩件路由層級的事：擋下沒有權限的人，
// 以及套上頁面的外框（Container）。
const CheatSheetManagePage = () => {
    const { t } = useTranslation();
    const { user, isAdmin } = useAuth();

    if (!user || !isAdmin) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="h5" color="error">
                        {t('guard.noPermissionTitle')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {t('guard.adminRequiredBody')}
                    </Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ py: { xs: 2, md: 4 } }}>
                <CheatSheetManagePanel />
            </Box>
        </Container>
    );
};

export default CheatSheetManagePage;
