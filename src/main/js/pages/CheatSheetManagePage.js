import { useTranslation } from 'react-i18next';
import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import PermissionDenied from '../components/common/PermissionDenied';
import CheatSheetManagePanel from '../components/admin/CheatSheetManagePanel';

// /admin/cheatsheet-manage 的路由外殼。
//
// 實際功能在 components/admin/CheatSheetManagePanel.js——後台控制台的大抄管理
// 分頁渲染的是同一個元件。這支檔案只負責兩件路由層級的事：擋下沒有權限的人，
// 以及套上頁面的外框（Container）。
const CheatSheetManagePage = () => {
    const { t } = useTranslation();
    const { user, hasPermission } = useAuth();

    // 以實際需要的權限判斷，和後端一致。原本看的是 isAdmin，
    // 被給了 cheatSheets.manage 的幹部 API 打得過、頁面卻進不去。
    if (!user || !hasPermission('cheatSheets.manage')) {
        return <PermissionDenied />;
    }

    return (
        <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ py: { xs: 2, md: 4 } }}>
                {/* 頁面標題。放在外殼而不是面板裡：同一個面板也給後台控制台用，
                    那裡要的是區塊標題 + 卡片，不是一整頁的標題。 */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h3"
                        component="h1"
                        gutterBottom
                        sx={{ fontWeight: 700, fontSize: { xs: '1.75rem', md: '3rem' } }}
                    >
                        {t('nav.adminCheatSheetManage')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {t('manage.cheatSheetDescription')}
                    </Typography>
                </Box>

                <CheatSheetManagePanel />
            </Box>
        </Container>
    );
};

export default CheatSheetManagePage;
