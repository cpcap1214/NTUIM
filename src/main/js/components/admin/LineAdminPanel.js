import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    LinearProgress,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import lineService from '../../services/lineService';
import { translateApiError } from '../../utils';

// 後台的「LINE 通知綁定」分頁。原本是 AdminPage.js 裡的一段 activeTab === 11。
//
// 這個分頁刻意不需要任何權限：綁定自己的帳號是個人設定，不是管理功能。
// 鎖在 users.manage 後面的話，只有審核權限的幹部就綁不了自己的帳號——
// 而他們正是最需要收到待審通知的人。下半部的「已綁定成員」名單才鎖權限。
const LineAdminPanel = ({ canManageUsers, onError, onSuccess }) => {
    const { t, i18n } = useTranslation();
    // null = 還在載入（此時顯示進度條而不是「未綁定」，否則畫面會先閃一下錯的狀態）
    const [lineBinding, setLineBinding] = useState(null);
    const [lineBindings, setLineBindings] = useState([]);
    const [lineBindingsLoading, setLineBindingsLoading] = useState(false);
    const [lineUnbindDialog, setLineUnbindDialog] = useState(false);
    const [lineUnbindTarget, setLineUnbindTarget] = useState(null);

    const reportRef = useRef({ onError, onSuccess });
    reportRef.current = { onError, onSuccess };

    const fetchLineBinding = useCallback(async () => {
        try {
            setLineBinding(await lineService.getBinding());
        } catch (err) {
            // 綁定狀態拿不到不該擋住整個分頁，顯示成「未設定」即可
            setLineBinding({ enabled: false, bound: false, bindingCode: null });
        }
    }, []);

    const fetchLineBindings = useCallback(async () => {
        try {
            setLineBindingsLoading(true);
            setLineBindings(await lineService.getBindings());
        } catch (err) {
            reportRef.current.onError(translateApiError(err, t('line.admin.fetchFailed')));
        } finally {
            setLineBindingsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchLineBinding();
        // 名單需要 users.manage；沒權限的人只看得到上半部的「我的綁定」
        if (canManageUsers) fetchLineBindings();
    }, [fetchLineBinding, fetchLineBindings, canManageUsers]);

    const handleCreateLineCode = async () => {
        try {
            const data = await lineService.createBindingCode();
            setLineBinding((prev) => ({ ...prev, ...data }));
        } catch (err) {
            onError(translateApiError(err, t('line.codeFailed')));
        }
    };

    const handleUnbindLine = async () => {
        try {
            await lineService.unbind();
            await fetchLineBinding();
            if (canManageUsers) await fetchLineBindings();
            onSuccess(t('line.unbound'));
        } catch (err) {
            onError(translateApiError(err, t('line.unbindFailed')));
        }
    };

    const handleUnbindOther = async () => {
        try {
            await lineService.unbindUser(lineUnbindTarget.id);
            setLineUnbindDialog(false);
            setLineUnbindTarget(null);
            await fetchLineBindings();
            // 解到自己頭上時，上半部的「我的綁定」也要跟著更新
            await fetchLineBinding();
            onSuccess(t('line.unbound'));
        } catch (err) {
            onError(translateApiError(err, t('line.unbindFailed')));
        }
    };

    return (
        <>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                {/* 上半：我的綁定。任何進得了控制台的人都看得到——綁定是個人設定。 */}
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('line.myBinding')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('line.description')}
                </Typography>

                {!lineBinding ? (
                    <LinearProgress />
                ) : !lineBinding.enabled ? (
                    <Alert severity="info">{t('line.notConfigured')}</Alert>
                ) : lineBinding.bound ? (
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Chip color="success" label={t('line.bound')} />
                        <Button size="small" color="error" onClick={handleUnbindLine}>
                            {t('line.unbind')}
                        </Button>
                    </Stack>
                ) : (
                    <Stack spacing={1.5} alignItems="flex-start">
                        {lineBinding.bindingCode ? (
                            <>
                                <Alert severity="success" sx={{ width: '100%' }}>
                                    {t('line.codeReady')}
                                </Alert>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 700,
                                        letterSpacing: '0.25em',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    {lineBinding.bindingCode}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {t('line.codeExpiresAt', {
                                        time: new Date(lineBinding.expiresAt).toLocaleTimeString(
                                            i18n.language,
                                        ),
                                    })}
                                </Typography>
                            </>
                        ) : (
                            <Chip variant="outlined" label={t('line.notBound')} />
                        )}
                        <Button variant="contained" size="small" onClick={handleCreateLineCode}>
                            {t(
                                lineBinding.bindingCode
                                    ? 'line.regenerateCode'
                                    : 'line.generateCode',
                            )}
                        </Button>
                    </Stack>
                )}

                {/* 下半：已綁定的成員。這一段才需要 users.manage。 */}
                {canManageUsers && (
                    <>
                        <Divider sx={{ my: 3 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {t('line.admin.title')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {t('line.admin.description')}
                        </Typography>

                        {lineBindingsLoading && <LinearProgress sx={{ mb: 2 }} />}

                        {lineBindings.length === 0 && !lineBindingsLoading ? (
                            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                {t('line.admin.empty')}
                            </Typography>
                        ) : (
                            <TableContainer>
                                {/* 低於 minWidth 就在 TableContainer 內橫向捲動（它預設 overflow-x: auto），
                            不加的話欄位會被擠到字疊在一起 */}
                                <Table size="small" sx={{ minWidth: 520 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('line.admin.colUser')}</TableCell>
                                            <TableCell>{t('line.admin.colBoundAt')}</TableCell>
                                            <TableCell>{t('line.admin.colNotifies')}</TableCell>
                                            <TableCell align="right">
                                                {t('announcement.admin.colActions')}
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {lineBindings.map((b) => (
                                            <TableRow key={b.id} hover>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 600 }}
                                                    >
                                                        {b.fullName || b.username}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {b.username}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {/* 舊綁定沒有時間可考（見 migration 014），顯示「未知」而不是假的日期 */}
                                                        {b.boundAt
                                                            ? new Date(b.boundAt).toLocaleString(
                                                                  i18n.language,
                                                              )
                                                            : t('line.admin.boundAtUnknown')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {b.notifies.length === 0 ? (
                                                        // 綁了卻沒有任何審核權限——這是「我綁了為什麼沒收到通知」的答案
                                                        <Chip
                                                            size="small"
                                                            color="warning"
                                                            variant="outlined"
                                                            label={t('line.admin.notifiesNone')}
                                                        />
                                                    ) : (
                                                        <Stack
                                                            direction="row"
                                                            spacing={0.5}
                                                            flexWrap="wrap"
                                                        >
                                                            {b.notifies.map((k) => (
                                                                <Chip
                                                                    key={k}
                                                                    size="small"
                                                                    label={t(
                                                                        `line.admin.notify.${k}`,
                                                                    )}
                                                                />
                                                            ))}
                                                        </Stack>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        onClick={() => {
                                                            setLineUnbindTarget(b);
                                                            setLineUnbindDialog(true);
                                                        }}
                                                    >
                                                        {t('line.unbind')}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </>
                )}
            </Paper>

            <Dialog open={lineUnbindDialog} onClose={() => setLineUnbindDialog(false)}>
                <DialogTitle>{t('line.admin.unbindTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('line.admin.confirmUnbind', {
                            name: lineUnbindTarget?.fullName || lineUnbindTarget?.username,
                        })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLineUnbindDialog(false)}>{t('common.cancel')}</Button>
                    <Button color="error" variant="contained" onClick={handleUnbindOther}>
                        {t('line.unbind')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default LineAdminPanel;
