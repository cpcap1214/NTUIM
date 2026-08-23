import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import announcementService from '../../services/announcementService';
import { translateApiError } from '../../utils';

// 後端存的是 UTC ISO 字串，但 <input type="datetime-local"> 要的是
// 「YYYY-MM-DDTHH:mm」形式的本地牆上時間，而且不帶時區資訊。
// 兩邊各轉一次，少了任何一次台灣就會整整差 8 小時——而症狀只會是
// 「公告設好了卻沒跳出來」，完全看不出跟時區有關。

// UTC ISO → datetime-local 的本地字串
const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    // 減掉時區偏移後取 ISO 的前 16 字元，就是本地牆上時間
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
};

// datetime-local 的本地字串 → UTC ISO（空字串代表不限制，要送 null）
const toUtcIso = (localValue) => (localValue ? new Date(localValue).toISOString() : null);

const EMPTY_FORM = {
    id: null,
    title: '',
    body: '',
    level: 'info',
    enabled: true,
    publishAt: '',
    expireAt: '',
};

// 後台的「公告管理」分頁。原本是 AdminPage.js 裡的一段 activeTab === 9，
// 連同 6 個 useState、時區轉換工具與 4 個處理函式散在那支檔案裡。
//
// 只在該分頁被選中時掛載，所以資料在 mount 時抓；
// 錯誤與成功訊息交回 AdminPage 的共用 Snackbar（onError / onSuccess）。
const AnnouncementAdminPanel = ({ onError, onSuccess }) => {
    const { t, i18n } = useTranslation();
    const [announcements, setAnnouncements] = useState([]);
    const [announcementLoading, setAnnouncementLoading] = useState(false);
    const [announcementDialog, setAnnouncementDialog] = useState(false);
    const [announcementForm, setAnnouncementForm] = useState(EMPTY_FORM);
    const [announcementDeleteDialog, setAnnouncementDeleteDialog] = useState(false);
    const [announcementToDelete, setAnnouncementToDelete] = useState(null);

    // onError / onSuccess 每次 render 都可能是新的函式參考，
    // 放進依賴會讓 fetchAnnouncements 跟著變、useEffect 就無限重抓
    const reportRef = useRef({ onError, onSuccess });
    reportRef.current = { onError, onSuccess };

    const fetchAnnouncements = useCallback(async () => {
        try {
            setAnnouncementLoading(true);
            setAnnouncements(await announcementService.getAll());
        } catch (err) {
            reportRef.current.onError(translateApiError(err, t('announcement.admin.fetchFailed')));
        } finally {
            setAnnouncementLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const openAnnouncementDialog = (announcement = null) => {
        setAnnouncementForm(
            announcement
                ? {
                      id: announcement.id,
                      title: announcement.title,
                      body: announcement.body,
                      level: announcement.level,
                      enabled: Boolean(announcement.enabled),
                      publishAt: toLocalInput(announcement.publishAt),
                      expireAt: toLocalInput(announcement.expireAt),
                  }
                : EMPTY_FORM,
        );
        setAnnouncementDialog(true);
    };

    const handleSaveAnnouncement = async () => {
        const payload = {
            title: announcementForm.title,
            body: announcementForm.body,
            level: announcementForm.level,
            enabled: announcementForm.enabled,
            publishAt: toUtcIso(announcementForm.publishAt),
            expireAt: toUtcIso(announcementForm.expireAt),
        };

        try {
            if (announcementForm.id) {
                await announcementService.update(announcementForm.id, payload);
            } else {
                await announcementService.create(payload);
            }
            setAnnouncementDialog(false);
            await fetchAnnouncements();
            onSuccess(t('announcement.admin.saved'));
        } catch (err) {
            onError(translateApiError(err, t('announcement.admin.saveFailed')));
        }
    };

    const handleDeleteAnnouncement = async () => {
        try {
            await announcementService.remove(announcementToDelete.id);
            setAnnouncementDeleteDialog(false);
            setAnnouncementToDelete(null);
            await fetchAnnouncements();
            onSuccess(t('announcement.admin.deleted'));
        } catch (err) {
            onError(translateApiError(err, t('announcement.admin.deleteFailed')));
        }
    };

    // 這則公告「現在」會不會出現在前台。後端有同一套判斷，這裡是給管理員看的即時狀態——
    // 「已啟用但因為排程還沒到所以沒出現」是最容易誤判成故障的情況。
    const announcementState = (a) => {
        if (!a.enabled) return 'disabled';
        const now = new Date();
        if (a.publishAt && new Date(a.publishAt) > now) return 'scheduled';
        if (a.expireAt && new Date(a.expireAt) <= now) return 'expired';
        return 'active';
    };

    return (
        <>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                >
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {t('announcement.admin.title')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('announcement.admin.description')}
                        </Typography>
                    </Box>
                    <Button variant="contained" onClick={() => openAnnouncementDialog()}>
                        {t('announcement.admin.create')}
                    </Button>
                </Stack>

                {announcementLoading && <LinearProgress sx={{ mb: 2 }} />}

                {announcements.length === 0 && !announcementLoading ? (
                    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        {t('announcement.admin.empty')}
                    </Typography>
                ) : (
                    <TableContainer>
                        {/* 低於 minWidth 就在 TableContainer 內橫向捲動（它預設 overflow-x: auto），
                            不加的話欄位會被擠到字疊在一起 */}
                        <Table size="small" sx={{ minWidth: 560 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('announcement.admin.colTitle')}</TableCell>
                                    <TableCell>{t('announcement.admin.colState')}</TableCell>
                                    <TableCell>{t('announcement.admin.colWindow')}</TableCell>
                                    <TableCell align="right">
                                        {t('announcement.admin.colActions')}
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {announcements.map((a) => {
                                    const state = announcementState(a);
                                    return (
                                        <TableRow key={a.id} hover>
                                            <TableCell>
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    alignItems="center"
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 600 }}
                                                    >
                                                        {a.title}
                                                    </Typography>
                                                    {a.level === 'important' && (
                                                        <Chip
                                                            label={t('announcement.important')}
                                                            color="error"
                                                            size="small"
                                                        />
                                                    )}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={t(`announcement.admin.state.${state}`)}
                                                    color={
                                                        state === 'active' ? 'success' : 'default'
                                                    }
                                                    variant={
                                                        state === 'active' ? 'filled' : 'outlined'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {a.publishAt
                                                        ? new Date(a.publishAt).toLocaleString(
                                                              i18n.language,
                                                          )
                                                        : t('announcement.admin.noLimit')}
                                                    {' → '}
                                                    {a.expireAt
                                                        ? new Date(a.expireAt).toLocaleString(
                                                              i18n.language,
                                                          )
                                                        : t('announcement.admin.noLimit')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => openAnnouncementDialog(a)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => {
                                                        setAnnouncementToDelete(a);
                                                        setAnnouncementDeleteDialog(true);
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* 公告編輯對話框 */}
            <Dialog
                open={announcementDialog}
                onClose={() => setAnnouncementDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {t(
                        announcementForm.id
                            ? 'announcement.admin.editTitle'
                            : 'announcement.admin.create',
                    )}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label={t('announcement.admin.fieldTitle')}
                            value={announcementForm.title}
                            onChange={(e) =>
                                setAnnouncementForm({
                                    ...announcementForm,
                                    title: e.target.value,
                                })
                            }
                            fullWidth
                            required
                        />
                        <TextField
                            label={t('announcement.admin.fieldBody')}
                            value={announcementForm.body}
                            onChange={(e) =>
                                setAnnouncementForm({
                                    ...announcementForm,
                                    body: e.target.value,
                                })
                            }
                            fullWidth
                            required
                            multiline
                            minRows={4}
                            helperText={t('announcement.admin.bodyHelper')}
                        />
                        <FormControl fullWidth>
                            <InputLabel>{t('announcement.admin.fieldLevel')}</InputLabel>
                            <Select
                                value={announcementForm.level}
                                label={t('announcement.admin.fieldLevel')}
                                onChange={(e) =>
                                    setAnnouncementForm({
                                        ...announcementForm,
                                        level: e.target.value,
                                    })
                                }
                            >
                                <MenuItem value="info">{t('announcement.levelInfo')}</MenuItem>
                                <MenuItem value="important">{t('announcement.important')}</MenuItem>
                            </Select>
                        </FormControl>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                label={t('announcement.admin.fieldPublishAt')}
                                type="datetime-local"
                                value={announcementForm.publishAt}
                                onChange={(e) =>
                                    setAnnouncementForm({
                                        ...announcementForm,
                                        publishAt: e.target.value,
                                    })
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                            <TextField
                                label={t('announcement.admin.fieldExpireAt')}
                                type="datetime-local"
                                value={announcementForm.expireAt}
                                onChange={(e) =>
                                    setAnnouncementForm({
                                        ...announcementForm,
                                        expireAt: e.target.value,
                                    })
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            {t('announcement.admin.windowHelper')}
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={announcementForm.enabled}
                                    onChange={(e) =>
                                        setAnnouncementForm({
                                            ...announcementForm,
                                            enabled: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label={t('announcement.admin.fieldEnabled')}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAnnouncementDialog(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveAnnouncement}
                        disabled={!announcementForm.title.trim() || !announcementForm.body.trim()}
                    >
                        {t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 公告刪除確認 */}
            <Dialog
                open={announcementDeleteDialog}
                onClose={() => setAnnouncementDeleteDialog(false)}
            >
                <DialogTitle>{t('announcement.admin.deleteTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('announcement.admin.confirmDelete', {
                            title: announcementToDelete?.title,
                        })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAnnouncementDeleteDialog(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button color="error" variant="contained" onClick={handleDeleteAnnouncement}>
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AnnouncementAdminPanel;
