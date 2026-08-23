import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    LinearProgress,
    Paper,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import feedbackService from '../../services/feedbackService';
import { translateApiError } from '../../utils';

// 後台的「意見回饋」分頁。原本是 AdminPage.js 裡的一段 activeTab === 10，
// 連同 8 個 useState 與 5 個處理函式散在那支 5294 行的檔案裡。
//
// 這個元件只在該分頁被選中時才掛載，所以資料在 mount 時抓就好——
// 不必再回到 AdminPage 那條 if/else if 鏈裡多加一個分支。
//
// 錯誤與成功訊息仍然交給 AdminPage 的共用 Snackbar 顯示，
// 因此用 onError / onSuccess 回報，而不是自己再長一組。
const FeedbackAdminPanel = ({ onError, onSuccess }) => {
    const { t, i18n } = useTranslation();
    const [feedbackList, setFeedbackList] = useState([]);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('new');
    const [feedbackNoteDialog, setFeedbackNoteDialog] = useState(false);
    const [feedbackNoteTarget, setFeedbackNoteTarget] = useState(null);
    const [feedbackNoteDraft, setFeedbackNoteDraft] = useState('');
    const [feedbackDeleteDialog, setFeedbackDeleteDialog] = useState(false);
    const [feedbackToDelete, setFeedbackToDelete] = useState(null);

    // onError / onSuccess 每次 render 都可能是新的函式參考，放進依賴會讓
    // fetchFeedback 跟著變、useEffect 就無限重抓。用 ref 存最新的一份。
    const reportRef = React.useRef({ onError, onSuccess });
    reportRef.current = { onError, onSuccess };

    const fetchFeedback = useCallback(
        async (status = feedbackStatusFilter) => {
            try {
                setFeedbackLoading(true);
                // status 傳空字串代表「全部」
                setFeedbackList(await feedbackService.getAll(status ? { status } : {}));
            } catch (err) {
                reportRef.current.onError(translateApiError(err, t('feedback.admin.fetchFailed')));
            } finally {
                setFeedbackLoading(false);
            }
        },
        // feedbackStatusFilter 只當預設值用，呼叫端都會明確傳入，
        // 放進依賴反而會讓每次切換篩選都重建這個函式
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [t],
    );

    useEffect(() => {
        fetchFeedback(feedbackStatusFilter);
        // 只在掛載時抓一次；之後的重抓由篩選與各個操作自己觸發
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFeedbackStatusFilter = (status) => {
        setFeedbackStatusFilter(status);
        fetchFeedback(status);
    };

    const handleUpdateFeedbackStatus = async (item, status) => {
        try {
            await feedbackService.update(item.id, { status });
            await fetchFeedback();
            onSuccess(t('feedback.admin.updated'));
        } catch (err) {
            onError(translateApiError(err, t('feedback.admin.updateFailed')));
        }
    };

    const handleSaveFeedbackNote = async () => {
        try {
            await feedbackService.update(feedbackNoteTarget.id, { adminNote: feedbackNoteDraft });
            setFeedbackNoteDialog(false);
            setFeedbackNoteTarget(null);
            await fetchFeedback();
            onSuccess(t('feedback.admin.updated'));
        } catch (err) {
            onError(translateApiError(err, t('feedback.admin.updateFailed')));
        }
    };

    const handleDeleteFeedback = async () => {
        try {
            await feedbackService.remove(feedbackToDelete.id);
            setFeedbackDeleteDialog(false);
            setFeedbackToDelete(null);
            await fetchFeedback();
            onSuccess(t('feedback.admin.deleted'));
        } catch (err) {
            onError(translateApiError(err, t('feedback.admin.deleteFailed')));
        }
    };

    return (
        <>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {t('feedback.admin.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('feedback.admin.description')}
                    </Typography>
                </Box>

                {/* 這段提示是刻意放的：資料表沒有送出者欄位，但 nginx access log 有 IP 與時間，
      技術上仍可能用時間戳去對。把界線寫清楚，比假裝風險不存在誠實。 */}
                <Alert severity="info" sx={{ mb: 2 }}>
                    {t('feedback.admin.anonymityNotice')}
                </Alert>

                <ToggleButtonGroup
                    value={feedbackStatusFilter}
                    exclusive
                    size="small"
                    onChange={(_, v) => v !== null && handleFeedbackStatusFilter(v)}
                    sx={{ mb: 2 }}
                >
                    <ToggleButton value="new">{t('feedback.admin.status.new')}</ToggleButton>
                    <ToggleButton value="read">{t('feedback.admin.status.read')}</ToggleButton>
                    <ToggleButton value="resolved">
                        {t('feedback.admin.status.resolved')}
                    </ToggleButton>
                    <ToggleButton value="">{t('feedback.admin.allStatuses')}</ToggleButton>
                </ToggleButtonGroup>

                {feedbackLoading && <LinearProgress sx={{ mb: 2 }} />}

                {feedbackList.length === 0 && !feedbackLoading ? (
                    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        {t('feedback.admin.empty')}
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        {feedbackList.map((item) => (
                            <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{ mb: 1 }}
                                    flexWrap="wrap"
                                >
                                    <Chip
                                        size="small"
                                        label={t(`feedback.categories.${item.category}`)}
                                        color="primary"
                                        variant="outlined"
                                    />
                                    <Chip
                                        size="small"
                                        label={t(`feedback.admin.status.${item.status}`)}
                                        color={
                                            item.status === 'new'
                                                ? 'warning'
                                                : item.status === 'resolved'
                                                  ? 'success'
                                                  : 'default'
                                        }
                                    />
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ ml: 'auto' }}
                                    >
                                        {new Date(item.created_at || item.createdAt).toLocaleString(
                                            i18n.language,
                                        )}
                                    </Typography>
                                </Stack>

                                <Typography
                                    variant="body2"
                                    sx={{
                                        whiteSpace: 'pre-line',
                                        lineHeight: 1.8,
                                        mb: 1.5,
                                    }}
                                >
                                    {item.body}
                                </Typography>

                                {item.adminNote && (
                                    <Alert severity="info" icon={false} sx={{ mb: 1.5, py: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            sx={{ fontWeight: 700, display: 'block' }}
                                        >
                                            {t('feedback.admin.note')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                            {item.adminNote}
                                        </Typography>
                                    </Alert>
                                )}

                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {item.status !== 'read' && (
                                        <Button
                                            size="small"
                                            onClick={() => handleUpdateFeedbackStatus(item, 'read')}
                                        >
                                            {t('feedback.admin.markRead')}
                                        </Button>
                                    )}
                                    {item.status !== 'resolved' && (
                                        <Button
                                            size="small"
                                            color="success"
                                            onClick={() =>
                                                handleUpdateFeedbackStatus(item, 'resolved')
                                            }
                                        >
                                            {t('feedback.admin.markResolved')}
                                        </Button>
                                    )}
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            setFeedbackNoteTarget(item);
                                            setFeedbackNoteDraft(item.adminNote || '');
                                            setFeedbackNoteDialog(true);
                                        }}
                                    >
                                        {t('feedback.admin.editNote')}
                                    </Button>
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={() => {
                                            setFeedbackToDelete(item);
                                            setFeedbackDeleteDialog(true);
                                        }}
                                    >
                                        {t('common.delete')}
                                    </Button>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                )}
            </Paper>

            {/* 管理員備註對話框 */}
            <Dialog
                open={feedbackNoteDialog}
                onClose={() => setFeedbackNoteDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{t('feedback.admin.editNote')}</DialogTitle>
                <DialogContent>
                    <TextField
                        value={feedbackNoteDraft}
                        onChange={(e) => setFeedbackNoteDraft(e.target.value)}
                        multiline
                        minRows={4}
                        fullWidth
                        sx={{ mt: 1 }}
                        helperText={t('feedback.admin.noteHelper')}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFeedbackNoteDialog(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="contained" onClick={handleSaveFeedbackNote}>
                        {t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 回饋刪除確認 */}
            <Dialog open={feedbackDeleteDialog} onClose={() => setFeedbackDeleteDialog(false)}>
                <DialogTitle>{t('feedback.admin.deleteTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('feedback.admin.confirmDelete')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFeedbackDeleteDialog(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button color="error" variant="contained" onClick={handleDeleteFeedback}>
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default FeedbackAdminPanel;
