import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BadgeIcon from '@mui/icons-material/Badge';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import PaidIcon from '@mui/icons-material/Paid';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import ViewIcon from '@mui/icons-material/Visibility';
import { API_BASE_URL } from '../../services/api';
import roleService from '../../services/roleService';
import { translateApiError } from '../../utils';

// 後台的「使用者管理」分頁。原本是 AdminPage.js 裡的一段 activeTab === 0，
// 是整支檔案裡最大的一塊（778 行 JSX）。
//
// roles 由 AdminPage 傳進來（身分組清單三個分頁共用）；
// currentUser 用來認出「這一列就是你自己」，避免把自己的權限改掉之後
// 畫面上的身分還是舊的。
// onUpdateSelf：改到自己那一列時要同步 AuthContext 的身分，
// 否則畫面上的權限還是舊的（例如把自己的管理員身分拿掉後，選單沒跟著變）。
const UserAdminPanel = ({
    roles,
    currentUser,
    onUpdateSelf,
    onStartPreview,
    onError,
    onSuccess,
}) => {
    const { t, i18n } = useTranslation();
    const [users, setUsers] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [newPasswordDialog, setNewPasswordDialog] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [deleteUserDialog, setDeleteUserDialog] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');

    const reportRef = useRef({ onError, onSuccess });
    reportRef.current = { onError, onSuccess };

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (!response.ok) throw new Error(t('admin.users.fetchFailed'));
            setUsers(await response.json());
        } catch (err) {
            reportRef.current.onError(err.message);
        }
    }, [t]);

    // 以某個身分組或某位成員的身分檢視全站。
    // 切換後管理台通常會直接消失（那正是預期結果），所以要先導回首頁——
    // 停在一個自己已經沒有權限的頁面上只會看到錯誤訊息，看不出模組與選單的實際樣貌。
    // 退出的入口在 Layout 最上層的固定橫幅，不在這個頁面裡。

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleEdit = (user) => {
        setEditingId(currentUser.id);
        setEditData({
            username: user.username,
            email: user.email,
            studentId: user.studentId,
            fullName: user.fullName,
            hasPaidFee: user.hasPaidFee,
            // 刻意不再帶 role：舊欄位的編輯介面已移除，送出去只會讓後端寫入一個
            // 沒有授權作用、又永遠追不上身分組的值。資料庫欄位保留供回滾用。
            // 濾掉自動身分組（「會員」）。它不存在 user_roles，是後端依 has_paid_fee 推導後
            // 補進回應的（admin.js:58），但送回去指派會被 users.js:259 以 400 擋下。
            // 不濾的話，編輯任何「已繳費」使用者都會失敗——即使你只是想多加一個身分組，
            // 送出的陣列仍會夾帶「會員」而讓整筆更新被退回。
            roleIds: (user.roles || []).filter((r) => !r.isAuto).map((r) => r.id),
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleSave = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(editData),
            });

            if (!response.ok) {
                throw new Error(t('exam.form.updateFailed'));
            }

            await response.json();

            // 身分組是獨立的關聯資料表，走專屬端點（它另外有「不可指派自動身分組」
            // 與「不可移除最後一位管理員」的把關，錯誤要讓使用者看得到）
            if (Array.isArray(editData.roleIds)) {
                await roleService.setUserRoles(userId, editData.roleIds);
            }

            onSuccess(t('admin.users.updated'));
            setEditingId(null);

            // 如果更新的是當前登入用戶，同步更新 AuthContext
            if (currentUser && parseInt(userId) === currentUser.id) {
                onUpdateSelf({
                    username: editData.username,
                    email: editData.email,
                    fullName: editData.fullName,
                    hasPaidFee: editData.hasPaidFee,
                    role: editData.role,
                });
            }

            fetchUsers();
        } catch (err) {
            onError(translateApiError(err, err.message || t('exam.form.updateFailed')));
        }
    };

    const handlePasswordChange = async () => {
        if (!newPassword) {
            onError(t('admin.users.enterNewPassword'));
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${selectedUserId}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ password: newPassword }),
            });

            if (!response.ok) {
                throw new Error(t('admin.users.passwordUpdateFailed'));
            }

            onSuccess(t('admin.users.passwordUpdated'));
            setNewPasswordDialog(false);
            setNewPassword('');
            setSelectedUserId(null);
            fetchUsers();
        } catch (err) {
            onError(err.message);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) {
                throw new Error(t('admin.users.deleteFailed'));
            }

            onSuccess(t('admin.users.deleted', { name: userToDelete.username }));
            setDeleteUserDialog(false);
            setUserToDelete(null);
            fetchUsers();
        } catch (err) {
            onError(err.message);
        }
    };

    const openPasswordDialog = (userId) => {
        setSelectedUserId(userId);
        setNewPasswordDialog(true);
    };

    const filteredUsers = users.filter((managedUser) => {
        const keyword = userSearchTerm.trim().toLowerCase();
        const matchKeyword =
            !keyword ||
            [
                managedUser.username,
                managedUser.fullName,
                managedUser.email,
                managedUser.studentId,
            ].some((value) => (value || '').toLowerCase().includes(keyword));

        // 依身分組篩選，不再看舊的 role 欄位——它不隨身分組更新，篩選結果會和
        // 畫面上顯示的 chip 對不起來（明明標著「管理員」，選「管理員」卻篩不到）
        const userRoles = managedUser.roles || [];
        const matchRole =
            roleFilter === 'all' ||
            (roleFilter === 'none'
                ? userRoles.length === 0
                : userRoles.some((r) => r.key === roleFilter));
        const matchPayment =
            paymentFilter === 'all' ||
            (paymentFilter === 'paid' && managedUser.hasPaidFee) ||
            (paymentFilter === 'unpaid' && !managedUser.hasPaidFee);

        return matchKeyword && matchRole && matchPayment;
    });

    const selectedUser =
        filteredUsers.find((managedUser) => managedUser.id === selectedUserId) || null;
    const activeUser = selectedUser || filteredUsers[0] || null;
    const userStats = {
        total: users.length,
        admins: users.filter((u) => (u.roles || []).some((r) => r.key === 'admin')).length,
        members: users.filter((u) => (u.roles || []).some((r) => r.key === 'member')).length,
        paid: users.filter((managedUser) => managedUser.hasPaidFee).length,
    };

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                        <BadgeIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">
                                            總用戶數
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                            {userStats.total}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                                        <AdminPanelSettingsIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">
                                            管理員
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                            {userStats.admins}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: 'info.main' }}>
                                        <BadgeIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">
                                            會員
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                            {userStats.members}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: 'success.main' }}>
                                        <PaidIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">
                                            已繳費
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                            {userStats.paid}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={2}
                            sx={{ mb: 3 }}
                            alignItems={{ xs: 'stretch', md: 'center' }}
                        >
                            <TextField
                                fullWidth
                                placeholder={t('admin.users.searchPlaceholder')}
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            {/* 選項改由身分組清單動態產生。原本是寫死的三個舊 role 值，
            自訂身分組（例如「測試員」）永遠篩不到，而「一般用戶」在身分組模型下
            的正確語意是「沒有任何身分組」，不是某個 role 值。 */}
                            <FormControl sx={{ minWidth: 140 }}>
                                <InputLabel>{t('admin.users.roleFilter')}</InputLabel>
                                <Select
                                    value={roleFilter}
                                    label={t('admin.roles.label')}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                >
                                    <MenuItem value="all">{t('common.all')}</MenuItem>
                                    <MenuItem value="none">{t('admin.users.noRole')}</MenuItem>
                                    {roles.map((r) => (
                                        <MenuItem key={r.id} value={r.key}>
                                            {r.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl sx={{ minWidth: 140 }}>
                                <InputLabel>{t('admin.users.paymentFilter')}</InputLabel>
                                <Select
                                    value={paymentFilter}
                                    label={t('admin.users.paymentFilter')}
                                    onChange={(e) => setPaymentFilter(e.target.value)}
                                >
                                    <MenuItem value="all">{t('common.all')}</MenuItem>
                                    <MenuItem value="paid">{t('admin.users.paid')}</MenuItem>
                                    <MenuItem value="unpaid">{t('admin.users.unpaid')}</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {t('admin.users.showing', {
                                    shown: filteredUsers.length,
                                    total: users.length,
                                })}
                            </Typography>
                            {(userSearchTerm ||
                                roleFilter !== 'all' ||
                                paymentFilter !== 'all') && (
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setUserSearchTerm('');
                                        setRoleFilter('all');
                                        setPaymentFilter('all');
                                    }}
                                >
                                    {t('admin.users.clearFilters')}
                                </Button>
                            )}
                        </Stack>

                        <TableContainer sx={{ overflowX: 'visible' }}>
                            <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                                <colgroup>
                                    <col style={{ width: '34%' }} />
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '20%' }} />
                                    <col style={{ width: '18%' }} />
                                </colgroup>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('admin.users.colUser')}</TableCell>
                                        <TableCell>{t('admin.users.colContact')}</TableCell>
                                        <TableCell>{t('admin.users.colStatus')}</TableCell>
                                        <TableCell align="right">
                                            {t('manage.columns.actions')}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredUsers.map((managedUser) => (
                                        <TableRow
                                            key={managedUser.id}
                                            hover
                                            selected={activeUser?.id === managedUser.id}
                                            onClick={() => setSelectedUserId(managedUser.id)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell>
                                                {editingId === managedUser.id ? (
                                                    <Stack spacing={1} sx={{ minWidth: 220 }}>
                                                        <TextField
                                                            size="small"
                                                            label={t('auth.fullName')}
                                                            value={editData.fullName}
                                                            onChange={(e) =>
                                                                setEditData({
                                                                    ...editData,
                                                                    fullName: e.target.value,
                                                                })
                                                            }
                                                        />
                                                        <TextField
                                                            size="small"
                                                            label={t('auth.username')}
                                                            value={editData.username}
                                                            onChange={(e) =>
                                                                setEditData({
                                                                    ...editData,
                                                                    username: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </Stack>
                                                ) : (
                                                    <Stack
                                                        direction="row"
                                                        spacing={1.5}
                                                        alignItems="center"
                                                    >
                                                        <Avatar sx={{ width: 36, height: 36 }}>
                                                            {(
                                                                managedUser.fullName ||
                                                                managedUser.username ||
                                                                '?'
                                                            ).charAt(0)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography sx={{ fontWeight: 600 }}>
                                                                {managedUser.fullName ||
                                                                    managedUser.username}
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                            >
                                                                @{managedUser.username} · ID{' '}
                                                                {managedUser.id}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingId === managedUser.id ? (
                                                    <Stack spacing={1}>
                                                        <TextField
                                                            size="small"
                                                            label={t('auth.studentId')}
                                                            fullWidth
                                                            value={editData.studentId}
                                                            onChange={(e) =>
                                                                setEditData({
                                                                    ...editData,
                                                                    studentId: e.target.value,
                                                                })
                                                            }
                                                        />
                                                        <TextField
                                                            size="small"
                                                            label="Email"
                                                            fullWidth
                                                            value={editData.email}
                                                            onChange={(e) =>
                                                                setEditData({
                                                                    ...editData,
                                                                    email: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </Stack>
                                                ) : (
                                                    <Stack spacing={0.5}>
                                                        <Typography variant="body2">
                                                            {t('admin.users.studentIdLine', {
                                                                value: managedUser.studentId || '-',
                                                            })}
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                            sx={{ wordBreak: 'break-word' }}
                                                        >
                                                            {managedUser.email ||
                                                                t('admin.users.noEmail')}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            {t('admin.users.registeredLine', {
                                                                value: managedUser.created_at
                                                                    ? new Date(
                                                                          managedUser.created_at,
                                                                      ).toLocaleString(
                                                                          i18n.language,
                                                                      )
                                                                    : '-',
                                                            })}
                                                        </Typography>
                                                    </Stack>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingId === managedUser.id ? (
                                                    <Stack spacing={1}>
                                                        {/* 這裡原本還有一個「管理員/會員/一般用戶」下拉，對應舊的 users.role 欄位。
                          該欄位已無授權作用（後端一律看身分組），留著只會和下方的身分組多選
                          並排出現、看起來像兩個等效的控制項，實際上只有一個有效。已移除。
                          資料庫欄位本身刻意保留，程式碼回滾時仍需要它。 */}
                                                        <Stack
                                                            direction="row"
                                                            spacing={1}
                                                            alignItems="center"
                                                        >
                                                            <Switch
                                                                checked={editData.hasPaidFee}
                                                                onChange={(e) =>
                                                                    setEditData({
                                                                        ...editData,
                                                                        hasPaidFee:
                                                                            e.target.checked,
                                                                    })
                                                                }
                                                            />
                                                            <Typography variant="body2">
                                                                {t(
                                                                    editData.hasPaidFee
                                                                        ? 'admin.users.paid'
                                                                        : 'admin.users.unpaid',
                                                                )}
                                                            </Typography>
                                                        </Stack>
                                                        {/* 身分組（可複選）。取代原本的「總務權限」開關——
                          後端已改用身分組授權，那個布林欄位不再有任何作用。 */}
                                                        <FormControl fullWidth size="small">
                                                            <InputLabel>
                                                                {t('admin.users.roleFilter')}
                                                            </InputLabel>
                                                            <Select
                                                                multiple
                                                                value={editData.roleIds || []}
                                                                label={t('admin.roles.label')}
                                                                onChange={(e) =>
                                                                    setEditData({
                                                                        ...editData,
                                                                        roleIds: e.target.value,
                                                                    })
                                                                }
                                                                renderValue={(selected) => (
                                                                    <Stack
                                                                        direction="row"
                                                                        spacing={0.5}
                                                                        flexWrap="wrap"
                                                                        useFlexGap
                                                                    >
                                                                        {selected.map((id) => {
                                                                            const r = roles.find(
                                                                                (x) => x.id === id,
                                                                            );
                                                                            return r ? (
                                                                                <Chip
                                                                                    key={id}
                                                                                    label={r.name}
                                                                                    size="small"
                                                                                />
                                                                            ) : null;
                                                                        })}
                                                                    </Stack>
                                                                )}
                                                            >
                                                                {roles.filter((r) => !r.isAuto)
                                                                    .length === 0 && (
                                                                    // 空選單一定要說明原因。/api/roles 需要 roles.manage，
                                                                    // 沒有該權限的人會拿到空清單，看到一個沒東西的下拉選單卻不知為何
                                                                    <MenuItem disabled value="">
                                                                        {t(
                                                                            roles.length === 0
                                                                                ? 'admin.roles.loadingOrNoAccess'
                                                                                : 'admin.roles.noneAssignable',
                                                                        )}
                                                                    </MenuItem>
                                                                )}
                                                                {roles
                                                                    .filter((r) => !r.isAuto)
                                                                    .map((r) => (
                                                                        <MenuItem
                                                                            key={r.id}
                                                                            value={r.id}
                                                                        >
                                                                            {r.name}
                                                                        </MenuItem>
                                                                    ))}
                                                            </Select>
                                                        </FormControl>
                                                        {roles.some((r) => r.isAuto) && (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
                                                                {t('admin.roles.memberAutoHint')}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                ) : (
                                                    // 這裡原本還會先顯示一個由舊 role 欄位推導的 chip，
                                                    // 結果同一列出現兩個「管理員」（一個來自舊欄位、一個來自身分組），
                                                    // 而且兩者可能不一致——身分組才是真正生效的那個。只留身分組。
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        flexWrap="wrap"
                                                        useFlexGap
                                                    >
                                                        <Chip
                                                            size="small"
                                                            label={t(
                                                                managedUser.hasPaidFee
                                                                    ? 'admin.users.paid'
                                                                    : 'admin.users.unpaid',
                                                            )}
                                                            color={
                                                                managedUser.hasPaidFee
                                                                    ? 'success'
                                                                    : 'default'
                                                            }
                                                            variant={
                                                                managedUser.hasPaidFee
                                                                    ? 'filled'
                                                                    : 'outlined'
                                                            }
                                                        />
                                                        {(managedUser.roles || []).map((r) => (
                                                            <Chip
                                                                key={r.id}
                                                                size="small"
                                                                label={r.name}
                                                                sx={
                                                                    r.color
                                                                        ? {
                                                                              bgcolor: r.color,
                                                                              color: '#fff',
                                                                          }
                                                                        : undefined
                                                                }
                                                            />
                                                        ))}
                                                        {(managedUser.roles || []).length === 0 && (
                                                            <Chip
                                                                size="small"
                                                                label={t('admin.roles.none')}
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Stack>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                {editingId === managedUser.id ? (
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.5}
                                                        justifyContent="flex-end"
                                                    >
                                                        <IconButton
                                                            color="primary"
                                                            onClick={() =>
                                                                handleSave(managedUser.id)
                                                            }
                                                            title={t('common.save')}
                                                        >
                                                            <SaveIcon />
                                                        </IconButton>
                                                        <IconButton
                                                            color="secondary"
                                                            onClick={handleCancel}
                                                            title={t('common.cancel')}
                                                        >
                                                            <CancelIcon />
                                                        </IconButton>
                                                    </Stack>
                                                ) : (
                                                    // 四個操作鍵排成 2×2 並靠右。排成一列時在窄欄位裡會擠成一團，
                                                    // 誤觸「刪除用戶」的代價又特別高。
                                                    <Box
                                                        sx={{
                                                            display: 'inline-grid',
                                                            gridTemplateColumns: 'repeat(2, auto)',
                                                            justifyContent: 'end',
                                                            gap: 0.25,
                                                        }}
                                                    >
                                                        <IconButton
                                                            size="small"
                                                            color="warning"
                                                            title={
                                                                managedUser.id === currentUser?.id
                                                                    ? t('admin.preview.selfHint')
                                                                    : t('admin.preview.asUser', {
                                                                          name: managedUser.username,
                                                                      })
                                                            }
                                                            disabled={
                                                                managedUser.id === currentUser?.id
                                                            }
                                                            onClick={() =>
                                                                onStartPreview(
                                                                    'user',
                                                                    managedUser.id,
                                                                    `使用者「${managedUser.username}」`,
                                                                )
                                                            }
                                                        >
                                                            <ViewIcon />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEdit(managedUser)}
                                                            title={t('common.edit')}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                openPasswordDialog(managedUser.id)
                                                            }
                                                            color="info"
                                                            title={t('admin.users.resetPassword')}
                                                        >
                                                            <LockResetIcon />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setUserToDelete(managedUser);
                                                                setDeleteUserDialog(true);
                                                            }}
                                                            color="error"
                                                            title={t(
                                                                managedUser.id === currentUser?.id
                                                                    ? 'admin.users.cannotDeleteSelf'
                                                                    : 'admin.users.deleteUser',
                                                            )}
                                                            disabled={
                                                                managedUser.id === currentUser?.id
                                                            }
                                                        >
                                                            <PersonRemoveIcon />
                                                        </IconButton>
                                                    </Box>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {filteredUsers.length === 0 && (
                            <Box sx={{ py: 6, textAlign: 'center' }}>
                                <Typography variant="h6" gutterBottom>
                                    沒有符合條件的用戶
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('admin.users.adjustFilters')}
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, position: 'sticky', top: 24 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                            {t('admin.users.detailTitle')}
                        </Typography>

                        {activeUser ? (
                            <Stack spacing={2.5}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ width: 56, height: 56, fontSize: 24 }}>
                                        {(activeUser.fullName || activeUser.username || '?').charAt(
                                            0,
                                        )}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                            {activeUser.fullName || activeUser.username}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            @{activeUser.username}
                                        </Typography>
                                    </Box>
                                </Stack>

                                {/* 同列表：顯示實際生效的身分組，不再由舊 role 欄位推導 */}
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Chip
                                        label={t(
                                            activeUser.hasPaidFee
                                                ? 'admin.users.paid'
                                                : 'admin.users.unpaid',
                                        )}
                                        color={activeUser.hasPaidFee ? 'success' : 'default'}
                                        variant={activeUser.hasPaidFee ? 'filled' : 'outlined'}
                                    />
                                    {(activeUser.roles || []).map((r) => (
                                        <Chip
                                            key={r.id}
                                            label={r.name}
                                            sx={
                                                r.color
                                                    ? { bgcolor: r.color, color: '#fff' }
                                                    : undefined
                                            }
                                        />
                                    ))}
                                    {(activeUser.roles || []).length === 0 && (
                                        <Chip label={t('admin.roles.none')} variant="outlined" />
                                    )}
                                </Stack>

                                <Divider />

                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        學號
                                    </Typography>
                                    <Typography>
                                        {activeUser.studentId || t('admin.users.notProvided')}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Email
                                    </Typography>
                                    <Typography sx={{ wordBreak: 'break-word' }}>
                                        {activeUser.email || t('admin.users.notProvided')}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        註冊時間
                                    </Typography>
                                    <Typography>
                                        {activeUser.created_at
                                            ? new Date(activeUser.created_at).toLocaleString(
                                                  i18n.language,
                                              )
                                            : t('common.unknown')}
                                    </Typography>
                                </Box>

                                <Divider />

                                <Stack spacing={1.5}>
                                    <Button
                                        variant="contained"
                                        startIcon={<EditIcon />}
                                        onClick={() => handleEdit(activeUser)}
                                        disabled={editingId === activeUser.id}
                                    >
                                        {t('admin.users.editThisUser')}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="info"
                                        startIcon={<LockResetIcon />}
                                        onClick={() => openPasswordDialog(activeUser.id)}
                                    >
                                        {t('admin.users.resetPassword')}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<PersonRemoveIcon />}
                                        title={
                                            activeUser.id === currentUser?.id
                                                ? t('admin.users.cannotDeleteSelf')
                                                : undefined
                                        }
                                        disabled={activeUser.id === currentUser?.id}
                                        onClick={() => {
                                            setUserToDelete(activeUser);
                                            setDeleteUserDialog(true);
                                        }}
                                    >
                                        {t('admin.users.deleteThisUser')}
                                    </Button>
                                </Stack>
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                {t('admin.users.empty')}
                            </Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* 更改密碼對話框 */}
            <Dialog open={newPasswordDialog} onClose={() => setNewPasswordDialog(false)}>
                <DialogTitle>{t('admin.users.changePasswordTitle')}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label={t('admin.users.newPassword')}
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setNewPasswordDialog(false);
                            setNewPassword('');
                        }}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handlePasswordChange} variant="contained">
                        {t('admin.users.confirmChange')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 刪除用戶對話框 */}
            <Dialog open={deleteUserDialog} onClose={() => setDeleteUserDialog(false)}>
                <DialogTitle>{t('admin.users.confirmDeleteTitle')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('admin.users.confirmDelete', { name: userToDelete?.username })}
                    </Typography>
                    <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
                        {t('admin.users.deleteIrreversible')}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setDeleteUserDialog(false);
                            setUserToDelete(null);
                        }}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleDeleteUser} color="error" variant="contained">
                        {t('courseReview.admin.confirmDelete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default UserAdminPanel;
