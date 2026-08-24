import { useTranslation } from 'react-i18next';
import React from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
    Chip,
    Alert,
    Snackbar,
    TextField,
    InputAdornment,
    Avatar,
    Stack,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Search as SearchIcon,
    Download as DownloadIcon,
    Description as DescriptionIcon,
    Tag as TagIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import { useResourceManage } from '../../hooks/useResourceManage';
import cheatSheetService from '../../services/cheatSheetService';
import EditCheatSheetDialog from '../EditCheatSheetDialog';

// 標籤配色。原本定義在元件內部，但它不依賴任何 state，
// 放在裡面只會讓每次 render 都重建一次這個物件。
//
// 註：這些鍵是使用者自己打的標籤字串，所以刻意不走 i18n——
// 對不上就退回 'default'，多一個新標籤也不必改這裡。
const TAG_COLORS = {
    資料庫: 'primary',
    React: 'info',
    JavaScript: 'warning',
    前端: 'success',
    機器學習: 'secondary',
    AI: 'error',
    演算法: 'primary',
    理論: 'info',
};

const getTagColor = (tag) => TAG_COLORS[tag] || 'default';

// 大抄管理的整塊功能。獨立頁面 /admin/cheatsheet-manage 與後台控制台的
// 大抄管理分頁都渲染這個元件——理由同 ExamManagePanel。
//
// onNotify 選填：後台有共用的 Snackbar，傳進來就交給它；獨立頁面不傳，自己顯示。
const CheatSheetManagePanel = ({ onNotify }) => {
    const { t, i18n } = useTranslation();
    // 共用的狀態機在 hooks/useResourceManage.js，考古題管理頁用的是同一支。
    const {
        items: cheatSheets,
        filteredItems: filteredCheatSheets,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        snackbar,
        notify,
        closeSnackbar,
        deleteTarget: cheatSheetToDelete,
        requestDelete: handleDeleteClick,
        cancelDelete: handleDeleteCancel,
        confirmDelete: handleDeleteConfirm,
        editTarget: cheatSheetToEdit,
        requestEdit: handleEditClick,
        closeEdit: handleEditClose,
        refresh: fetchCheatSheets,
        download: handleDownload,
        openPreview,
    } = useResourceManage({
        onNotify,
        resourcePath: 'cheat-sheets',
        // 大抄比對標題、課名、描述——注意這裡沒有課號，跟考古題頁不同。
        // 表格裡看得到課號卻搜不到，是複製貼上後各自長歪的結果，
        // 已由 test/unit/pages/ManagePages.test.js 釘住現況；
        // 要統一的話是一次刻意的決定，不該在重構時順手改掉。
        matches: (sheet, term) =>
            sheet.title.toLowerCase().includes(term) ||
            sheet.courseName.toLowerCase().includes(term) ||
            (sheet.description && sheet.description.toLowerCase().includes(term)),
        messages: {
            fetchFailed: t('cheatSheet.fetchFailed'),
            deleteFailed: t('manage.deleteFailed'),
            deleted: t('manage.cheatSheetDeleted'),
            downloadFailed: t('cheatSheet.downloadFailedRetry'),
        },
    });

    const deleteDialogOpen = Boolean(cheatSheetToDelete);
    const editDialogOpen = Boolean(cheatSheetToEdit);

    // 原本指向 /uploads/cheat_sheets/{id}/preview，那是磁碟上不存在的路徑（一直是 404）。
    // 改用有認證的 API 端點，跟 CheatSheetPage 一致。
    const handlePreview = (cheatSheetId) => openPreview(`${cheatSheetId}/preview`);

    const handleEditSave = async (cheatSheetId, cheatSheetData) => {
        try {
            await cheatSheetService.updateCheatSheet(cheatSheetId, cheatSheetData);
            await fetchCheatSheets();
            notify(t('manage.cheatSheetInfoUpdated'), 'success');
        } catch (error) {
            console.error('更新大抄錯誤:', error);
            throw new Error(error.error || t('exam.form.updateFailed'));
        }
    };

    const handleFileUpdate = async (cheatSheetId, formData) => {
        try {
            await cheatSheetService.updateCheatSheetFile(cheatSheetId, formData);
            await fetchCheatSheets();
            notify(t('manage.cheatSheetFileUpdated'), 'success');
        } catch (error) {
            console.error('更新大抄檔案錯誤:', error);
            throw new Error(error.error || t('exam.form.fileUpdateFailed'));
        }
    };

    return (
        <>
            {/* Search Bar */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder={t('cheatSheet.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {/* 錯誤提示 */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* 載入中 */}
            {loading && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary">
                        {t('cheatSheet.loadingList')}
                    </Typography>
                </Box>
            )}

            {/* 大抄列表 */}
            {!loading && (
                <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                    {/* 低於 minWidth 就在容器內橫向捲動，不要把整頁撐開 */}
                    <Table sx={{ minWidth: 900 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('manage.columns.title')}</TableCell>
                                <TableCell>{t('manage.columns.courseInfo')}</TableCell>
                                <TableCell>{t('manage.columns.description')}</TableCell>
                                <TableCell>{t('manage.columns.tags')}</TableCell>
                                <TableCell>{t('manage.columns.fileInfo')}</TableCell>
                                <TableCell>{t('manage.columns.uploader')}</TableCell>
                                <TableCell>{t('manage.columns.uploadDate')}</TableCell>
                                <TableCell align="right">{t('manage.columns.downloads')}</TableCell>
                                <TableCell align="center">{t('manage.columns.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCheatSheets.map((sheet) => (
                                <TableRow key={sheet.id} hover>
                                    <TableCell>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            <DescriptionIcon
                                                sx={{ fontSize: 20, color: 'success.main' }}
                                            />
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {sheet.title}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {sheet.courseName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {sheet.courseCode}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                maxWidth: 200,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {sheet.description || '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ maxWidth: 150 }}>
                                            {sheet.tags && sheet.tags.length > 0 ? (
                                                <Stack
                                                    direction="row"
                                                    spacing={0.5}
                                                    flexWrap="wrap"
                                                    useFlexGap
                                                >
                                                    {sheet.tags.slice(0, 2).map((tag) => (
                                                        <Chip
                                                            key={tag}
                                                            label={tag}
                                                            size="small"
                                                            color={getTagColor(tag)}
                                                            variant="outlined"
                                                        />
                                                    ))}
                                                    {sheet.tags.length > 2 && (
                                                        <Chip
                                                            label={`+${sheet.tags.length - 2}`}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                </Stack>
                                            ) : (
                                                <Typography variant="caption" color="text.disabled">
                                                    {t('manage.noTags')}
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="caption" display="block">
                                                {sheet.fileName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {(sheet.fileSize / 1024 / 1024).toFixed(2)} MB
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                                                {sheet.uploader
                                                    ? sheet.uploader.fullName.charAt(0)
                                                    : '?'}
                                            </Avatar>
                                            <Typography variant="body2">
                                                {sheet.uploader?.fullName || t('common.unknown')}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {sheet.created_at
                                            ? new Date(sheet.created_at).toLocaleDateString(
                                                  i18n.language,
                                              )
                                            : t('common.unknown')}
                                    </TableCell>
                                    <TableCell align="right">{sheet.downloadCount || 0}</TableCell>
                                    <TableCell align="center">
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 0.5,
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Tooltip title={t('exam.preview')}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handlePreview(sheet.id)}
                                                >
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('exam.download')}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() =>
                                                        handleDownload(sheet.id, sheet.fileName)
                                                    }
                                                >
                                                    <DownloadIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('common.edit')}>
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => handleEditClick(sheet)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('common.delete')}>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteClick(sheet)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* 沒有結果 */}
            {!loading && filteredCheatSheets.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <TagIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        {t(cheatSheets.length === 0 ? 'cheatSheet.empty' : 'cheatSheet.noMatch')}
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                        {t(
                            cheatSheets.length === 0
                                ? 'manage.uploadCheatSheetFirst'
                                : 'manage.adjustSearch',
                        )}
                    </Typography>
                </Box>
            )}

            {/* 刪除確認對話框 */}
            <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
                <DialogTitle>{t('manage.confirmDeleteCheatSheetTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('manage.confirmDeleteCheatSheet', {
                            name: cheatSheetToDelete?.title,
                        })}
                        <br />
                        {t('manage.deleteIrreversible')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel}>{t('common.cancel')}</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        {t('courseReview.admin.confirmDelete')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 編輯大抄對話框 */}
            <EditCheatSheetDialog
                open={editDialogOpen}
                onClose={handleEditClose}
                cheatSheet={cheatSheetToEdit}
                onSave={handleEditSave}
                onFileUpdate={handleFileUpdate}
            />

            {/* 沒有外部接手通知時自己顯示 */}
            {!onNotify && (
                <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar}>
                    <Alert
                        onClose={closeSnackbar}
                        severity={snackbar.severity}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            )}
        </>
    );
};

export default CheatSheetManagePanel;
