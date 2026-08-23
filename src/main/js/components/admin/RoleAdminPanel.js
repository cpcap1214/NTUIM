import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ViewIcon from '@mui/icons-material/Visibility';
import roleService from '../../services/roleService';
import { translateApiError } from '../../utils';

const EMPTY_ROLE = {
    id: null,
    key: '',
    name: '',
    description: '',
    color: '',
    priority: 0,
    permissions: [],
};

// 後台的「身分組」分頁。原本是 AdminPage.js 裡的一段 activeTab === 7。
//
// roles / permissionCatalog / loading 由 AdminPage 傳進來而不是自己抓：
// 身分組清單同時被使用者管理（分配身分組）與模組管理（白名單下拉）使用，
// 三個地方各抓一次只是多打兩次 API。改動之後呼叫 onRefresh 請它重抓。
// onStartPreview 也由外部提供：預覽別人的身分要動到 AuthContext 與路由，
// 那是控制台層級的事，不屬於這個分頁。
const RoleAdminPanel = ({
    roles,
    permissionCatalog,
    loading,
    onRefresh,
    onStartPreview,
    onError,
    onSuccess,
}) => {
    const { t } = useTranslation();
    const [roleDialog, setRoleDialog] = useState(false);
    const [roleForm, setRoleForm] = useState(EMPTY_ROLE);
    const [roleDeleteDialog, setRoleDeleteDialog] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);

    const openRoleDialog = (role = null) => {
        setRoleForm(role ? { ...role, permissions: role.permissions || [] } : EMPTY_ROLE);
        setRoleDialog(true);
    };

    const handleSaveRole = async () => {
        try {
            if (roleForm.id) {
                await roleService.updateRole(roleForm.id, roleForm);
            } else {
                await roleService.createRole(roleForm);
            }
            setRoleDialog(false);
            await onRefresh();
            onSuccess(t('admin.roles.saved'));
        } catch (err) {
            onError(translateApiError(err, t('admin.roles.saveFailed')));
        }
    };

    const handleDeleteRole = async () => {
        try {
            await roleService.deleteRole(roleToDelete.id);
            await onRefresh();
            onSuccess(t('admin.roles.deleted'));
        } catch (err) {
            onError(translateApiError(err, t('admin.roles.deleteFailed')));
        } finally {
            setRoleDeleteDialog(false);
            setRoleToDelete(null);
        }
    };

    return (
        <>
            <Paper sx={{ p: 2 }}>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    sx={{ mb: 3 }}
                >
                    <Box>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                            {t('admin.roles.title')}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {t('admin.roles.description')}
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => openRoleDialog()}
                    >
                        {t('admin.roles.create')}
                    </Button>
                </Stack>

                {loading && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="text.secondary">
                            載入中...
                        </Typography>
                    </Box>
                )}

                {!loading && (
                    <Grid container spacing={2}>
                        {roles.map((role) => (
                            <Grid item xs={12} md={6} key={role.id}>
                                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="flex-start"
                                        sx={{ mb: 1 }}
                                    >
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                            flexWrap="wrap"
                                            useFlexGap
                                        >
                                            <Chip
                                                label={role.name}
                                                size="small"
                                                sx={
                                                    role.color
                                                        ? {
                                                              bgcolor: role.color,
                                                              color: '#fff',
                                                              fontWeight: 600,
                                                          }
                                                        : { fontWeight: 600 }
                                                }
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {role.key}
                                            </Typography>
                                            {role.isSystem && (
                                                <Chip
                                                    label={t('admin.roles.builtin')}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                            {role.isAuto && (
                                                <Chip
                                                    label={t('admin.roles.auto')}
                                                    size="small"
                                                    color="info"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                        <Stack direction="row" spacing={0.5}>
                                            <IconButton
                                                size="small"
                                                color="warning"
                                                title={`以「${role.name}」的身分檢視全站（唯讀）`}
                                                onClick={() =>
                                                    onStartPreview(
                                                        'role',
                                                        role.id,
                                                        `身分組「${role.name}」`,
                                                    )
                                                }
                                            >
                                                <ViewIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => openRoleDialog(role)}
                                                title={t('common.edit')}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                disabled={role.isSystem}
                                                title={t(
                                                    role.isSystem
                                                        ? 'admin.roles.builtinNotDeletable'
                                                        : 'common.delete',
                                                )}
                                                onClick={() => {
                                                    setRoleToDelete(role);
                                                    setRoleDeleteDialog(true);
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Stack>

                                    {role.description && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ mb: 1 }}
                                        >
                                            {role.description}
                                        </Typography>
                                    )}

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        display="block"
                                        sx={{ mb: 0.5 }}
                                    >
                                        {t('admin.roles.memberCount', {
                                            count: role.memberCount,
                                        })}
                                        {role.isAuto ? t('admin.roles.autoComputed') : ''}
                                    </Typography>

                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                        {role.permissions.includes('*') ? (
                                            <Chip
                                                label={t('admin.roles.allPermissions')}
                                                size="small"
                                                color="error"
                                            />
                                        ) : (
                                            role.permissions.map((p) => (
                                                <Chip
                                                    key={p}
                                                    label={
                                                        permissionCatalog.find((c) => c.key === p)
                                                            ?.label || p
                                                    }
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ))
                                        )}
                                        {role.permissions.length === 0 && (
                                            <Typography variant="caption" color="text.disabled">
                                                未設定任何權限
                                            </Typography>
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Paper>

            {/* 身分組編輯對話框 */}
            <Dialog open={roleDialog} onClose={() => setRoleDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {t(roleForm.id ? 'admin.roles.editTitle' : 'admin.roles.create')}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label={t('admin.roles.keyLabel')}
                            value={roleForm.key}
                            onChange={(e) => setRoleForm({ ...roleForm, key: e.target.value })}
                            disabled={!!roleForm.id}
                            helperText={t(
                                roleForm.id ? 'admin.roles.keyLocked' : 'admin.roles.keyHelper',
                            )}
                            fullWidth
                        />
                        <TextField
                            label={t('admin.roles.nameLabel')}
                            value={roleForm.name}
                            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label={t('admin.roles.descLabel')}
                            value={roleForm.description || ''}
                            onChange={(e) =>
                                setRoleForm({ ...roleForm, description: e.target.value })
                            }
                            fullWidth
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label={t('admin.roles.colorLabel')}
                                type="color"
                                value={roleForm.color || '#1976d2'}
                                onChange={(e) =>
                                    setRoleForm({ ...roleForm, color: e.target.value })
                                }
                                sx={{ width: 120 }}
                            />
                            <TextField
                                label={t('admin.roles.priorityLabel')}
                                type="number"
                                value={roleForm.priority}
                                onChange={(e) =>
                                    setRoleForm({
                                        ...roleForm,
                                        priority: parseInt(e.target.value, 10) || 0,
                                    })
                                }
                                helperText={t('admin.roles.priorityHelper')}
                            />
                        </Stack>

                        <Divider />
                        <Typography variant="subtitle2">權限</Typography>
                        {roleForm.permissions.includes('*') ? (
                            <Alert severity="info">此身分組擁有所有權限，無法逐項調整</Alert>
                        ) : (
                            Object.entries(
                                permissionCatalog.reduce((acc, p) => {
                                    (acc[p.group] = acc[p.group] || []).push(p);
                                    return acc;
                                }, {}),
                            ).map(([group, items]) => (
                                <Box key={group}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ fontWeight: 600 }}
                                    >
                                        {group}
                                    </Typography>
                                    <Stack>
                                        {items.map((p) => (
                                            <FormControlLabel
                                                key={p.key}
                                                control={
                                                    <Checkbox
                                                        size="small"
                                                        checked={roleForm.permissions.includes(
                                                            p.key,
                                                        )}
                                                        onChange={(e) =>
                                                            setRoleForm({
                                                                ...roleForm,
                                                                permissions: e.target.checked
                                                                    ? [
                                                                          ...roleForm.permissions,
                                                                          p.key,
                                                                      ]
                                                                    : roleForm.permissions.filter(
                                                                          (x) => x !== p.key,
                                                                      ),
                                                            })
                                                        }
                                                    />
                                                }
                                                label={
                                                    <Typography variant="body2">
                                                        {p.label}
                                                        <Typography
                                                            component="span"
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            {' '}
                                                            — {p.description}
                                                        </Typography>
                                                    </Typography>
                                                }
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            ))
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRoleDialog(false)}>取消</Button>
                    <Button variant="contained" onClick={handleSaveRole}>
                        儲存
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 刪除身分組確認 */}
            <Dialog open={roleDeleteDialog} onClose={() => setRoleDeleteDialog(false)}>
                <DialogTitle>刪除身分組？</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('admin.roles.deleteWarning', {
                            name: roleToDelete?.name,
                            count: roleToDelete?.memberCount,
                        })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRoleDeleteDialog(false)}>取消</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteRole}>
                        確認刪除
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default RoleAdminPanel;
