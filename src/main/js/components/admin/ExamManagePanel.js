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
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Search as SearchIcon,
    Download as DownloadIcon,
    PictureAsPdf as PdfIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import { useResourceManage } from '../../hooks/useResourceManage';
import examService from '../../services/examService';
import EditExamDialog from '../EditExamDialog';

// 考古題管理的整塊功能。
//
// 同一份功能原本存在兩處：獨立頁面 /admin/exam-manage（2025-08-30 建立）
// 與後台控制台的分頁（隔天才加的複製品）。複製品後來沒有跟上，
// 欄位標題仍是寫死的中文、表格在手機會把整頁撐開。
// 現在兩邊都渲染這個元件，功能只有一份。
//
// ⚠️ 標題與外框不在這裡，由呼叫端提供。兩個情境的外框本來就不同：
// 獨立頁面要的是頁面標題（h1）+ 內容直接放在底色上；後台分頁要的是
// 區塊標題（h5）+ 包在 <Paper> 卡片裡，跟其他十個分頁一致。
// 把外框放進這個元件的話，等於讓其中一邊穿另一邊的衣服——
// 先前後台就因此少了卡片、多了一個 3rem 的頁面標題。
//
// onNotify 選填：後台控制台有共用的 Snackbar，傳進來就把提示交給它；
// 獨立頁面沒有，所以不傳，由這裡自己顯示。
const ExamManagePanel = ({ onNotify }) => {
    const { t, i18n } = useTranslation();
    // 共用的狀態機在 hooks/useResourceManage.js。大抄管理頁用的是同一支——
    // 抽取前這兩頁有 69% 的行完全相同。
    const {
        items: exams,
        filteredItems: filteredExams,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        snackbar,
        notify,
        closeSnackbar,
        deleteTarget: examToDelete,
        requestDelete: handleDeleteClick,
        cancelDelete: handleDeleteCancel,
        confirmDelete: handleDeleteConfirm,
        editTarget: examToEdit,
        requestEdit: handleEditClick,
        closeEdit: handleEditClose,
        refresh: fetchExams,
        download: handleDownload,
        openPreview,
    } = useResourceManage({
        onNotify,
        resourcePath: 'exams',
        // 不分頁，管理頁要一次看到全部
        listQuery: '?limit=1000',
        // 考古題可以用課名、課號、教授搜尋
        matches: (exam, term) =>
            exam.courseName.toLowerCase().includes(term) ||
            exam.courseCode.toLowerCase().includes(term) ||
            (exam.professor && exam.professor.toLowerCase().includes(term)),
        messages: {
            fetchFailed: t('exam.fetchFailed'),
            deleteFailed: t('manage.deleteFailed'),
            deleted: t('manage.examDeleted'),
            downloadFailed: t('cheatSheet.downloadFailedRetry'),
        },
    });

    const deleteDialogOpen = Boolean(examToDelete);
    const editDialogOpen = Boolean(examToEdit);

    // 原本指向 /uploads/exams/{id}/preview，那是磁碟上不存在的路徑（一直是 404）。
    // 改用有認證的 API 端點，跟 ExamArchivePage 一致。
    const handlePreview = (examId) => openPreview(`${examId}/preview/question`);

    const handleEditSave = async (examId, examData) => {
        try {
            await examService.updateExam(examId, examData);
            await fetchExams();
            notify(t('manage.examInfoUpdated'), 'success');
        } catch (error) {
            console.error('更新考古題錯誤:', error);
            throw new Error(error.error || t('exam.form.updateFailed'));
        }
    };

    const handleFileUpdate = async (examId, formData) => {
        try {
            await examService.updateExamFiles(examId, formData);
            await fetchExams();
            notify(t('manage.examFileUpdated'), 'success');
        } catch (error) {
            console.error('更新考古題檔案錯誤:', error);
            throw new Error(error.error || t('exam.form.fileUpdateFailed'));
        }
    };

    return (
        <>
            {/* Search Bar */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder={t('courseReview.admin.searchPlaceholder')}
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
                        {t('exam.loadingList')}
                    </Typography>
                </Box>
            )}

            {/* 考古題列表 */}
            {!loading && (
                <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                    {/* 低於 minWidth 就在容器內橫向捲動，不要把整頁撐開 */}
                    <Table sx={{ minWidth: 720 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('manage.columns.courseInfo')}</TableCell>
                                <TableCell>{t('manage.columns.professor')}</TableCell>
                                <TableCell>{t('manage.columns.examInfo')}</TableCell>
                                <TableCell>{t('manage.columns.fileInfo')}</TableCell>
                                <TableCell>{t('manage.columns.uploader')}</TableCell>
                                <TableCell>{t('manage.columns.uploadDate')}</TableCell>
                                <TableCell align="right">{t('manage.columns.downloads')}</TableCell>
                                <TableCell align="center">{t('manage.columns.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredExams.map((exam) => (
                                <TableRow key={exam.id} hover>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {exam.courseName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {exam.courseCode}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{exam.professor || '-'}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            <Chip
                                                label={exam.examType}
                                                color="primary"
                                                size="small"
                                            />
                                            <Chip
                                                label={`${exam.year - 1911}-${exam.semester}`}
                                                color="secondary"
                                                size="small"
                                            />
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
                                            <PdfIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                            <Box>
                                                <Typography variant="caption" display="block">
                                                    {exam.fileName}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {(exam.fileSize / 1024 / 1024).toFixed(2)} MB
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {exam.uploader?.fullName || t('common.unknown')}
                                    </TableCell>
                                    <TableCell>
                                        {exam.created_at
                                            ? new Date(exam.created_at).toLocaleDateString(
                                                  i18n.language,
                                              )
                                            : t('common.unknown')}
                                    </TableCell>
                                    <TableCell align="right">{exam.downloadCount || 0}</TableCell>
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
                                                    onClick={() => handlePreview(exam.id)}
                                                >
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('exam.download')}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() =>
                                                        handleDownload(exam.id, exam.fileName)
                                                    }
                                                >
                                                    <DownloadIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('common.edit')}>
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => handleEditClick(exam)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('common.delete')}>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteClick(exam)}
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
            {!loading && filteredExams.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        {t(exams.length === 0 ? 'exam.empty' : 'exam.noMatch')}
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                        {t(exams.length === 0 ? 'manage.uploadExamFirst' : 'manage.adjustSearch')}
                    </Typography>
                </Box>
            )}

            {/* 刪除確認對話框 */}
            <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
                <DialogTitle>{t('manage.confirmDeleteExamTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('manage.confirmDeleteExam', {
                            name: `${examToDelete?.courseName} - ${examToDelete?.examType}`,
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

            {/* 編輯考古題對話框 */}
            <EditExamDialog
                open={editDialogOpen}
                onClose={handleEditClose}
                exam={examToEdit}
                onSave={handleEditSave}
                onFileUpdate={handleFileUpdate}
            />

            {/* 沒有外部接手通知時自己顯示。後台控制台會傳 onNotify，
                那裡有共用的 Snackbar，這裡再長一組只會互相蓋掉。 */}
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

export default ExamManagePanel;
