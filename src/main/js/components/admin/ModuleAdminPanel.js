import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Chip,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import moduleService from '../../services/moduleService';
import { translateApiError } from '../../utils';

// 後台的「模組管理」分頁。原本是 AdminPage.js 裡的一段 activeTab === 8。
//
// roles 由 AdminPage 傳進來而不是自己抓：身分組清單同時被用戶管理分頁使用，
// 兩邊各抓一次只是多打一次 API。這裡只負責在清單是空的時候請它去抓。
const ModuleAdminPanel = ({ roles, onEnsureRoles, onError, onSuccess }) => {
    const { t } = useTranslation();
    const [moduleSettings, setModuleSettings] = useState([]);
    const [moduleLoading, setModuleLoading] = useState(false);

    // 這些 callback 每次 render 都可能是新的函式參考，
    // 放進依賴會讓 fetch 跟著變、useEffect 就無限重抓
    const reportRef = useRef({ onError, onSuccess, onEnsureRoles });
    reportRef.current = { onError, onSuccess, onEnsureRoles };

    const fetchModuleSettings = useCallback(async () => {
        try {
            setModuleLoading(true);
            setModuleSettings(await moduleService.getModuleSettings());
        } catch (err) {
            reportRef.current.onError(translateApiError(err, t('admin.modules.fetchFailed')));
        } finally {
            setModuleLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchModuleSettings();
        // 白名單的下拉選單需要身分組清單
        if (!roles || roles.length === 0) reportRef.current.onEnsureRoles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchModuleSettings]);

    const handleUpdateModule = async (key, payload) => {
        try {
            await moduleService.updateModule(key, payload);
            await fetchModuleSettings();
            onSuccess(t('admin.modules.saved'));
        } catch (err) {
            onError(translateApiError(err, t('admin.modules.saveFailed')));
        }
    };

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                {t('admin.modules.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {t('admin.modules.description')}
            </Typography>

            {moduleLoading && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary">
                        載入中...
                    </Typography>
                </Box>
            )}

            {!moduleLoading && (
                <Stack spacing={2}>
                    {moduleSettings.map((module) => (
                        <Paper key={module.key} variant="outlined" sx={{ p: 2 }}>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={3}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                        {module.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {module.key}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>開放狀態</InputLabel>
                                        <Select
                                            value={module.visibility}
                                            label={t('admin.modules.visibilityLabel')}
                                            onChange={(e) =>
                                                handleUpdateModule(module.key, {
                                                    visibility: e.target.value,
                                                })
                                            }
                                        >
                                            <MenuItem value="public">公開（所有人）</MenuItem>
                                            <MenuItem value="restricted">限定（白名單）</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <FormControl
                                        fullWidth
                                        size="small"
                                        disabled={module.visibility === 'public'}
                                    >
                                        <InputLabel>可使用的身分組</InputLabel>
                                        <Select
                                            multiple
                                            value={(module.allowedRoles || []).map((r) => r.id)}
                                            label={t('admin.modules.allowedRoles')}
                                            onChange={(e) =>
                                                handleUpdateModule(module.key, {
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
                                                        const r = roles.find((x) => x.id === id);
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
                                            {roles.map((r) => (
                                                <MenuItem key={r.id} value={r.id}>
                                                    {r.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Switch
                                            checked={!!module.showWhenRestricted}
                                            disabled={module.visibility === 'public'}
                                            onChange={(e) =>
                                                handleUpdateModule(module.key, {
                                                    showWhenRestricted: e.target.checked,
                                                })
                                            }
                                        />
                                        <Typography variant="caption">
                                            {t(
                                                module.showWhenRestricted
                                                    ? 'admin.modules.showComingSoon'
                                                    : 'admin.modules.hideCompletely',
                                            )}
                                        </Typography>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Paper>
                    ))}
                </Stack>
            )}
        </Paper>
    );
};

export default ModuleAdminPanel;
