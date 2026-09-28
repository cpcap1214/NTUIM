import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Link,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import authService from '../services/authService';
import { translateApiError } from '../utils/apiError';

const MIN_PASSWORD_LENGTH = 6; // 和後端註冊／重設的規則一致

// 從網址的 #token=... 取出重設碼。
// token 放在 # 後面是刻意的：fragment 不會送到伺服器，不會留在 nginx 的存取紀錄裡。
const readTokenFromHash = (hash) =>
    new URLSearchParams(String(hash).replace(/^#/, '')).get('token');

const ResetPasswordPage = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    // 只在第一次 render 讀取：讀完就把 hash 從網址列清掉（下面的 effect），
    // 之後 location.hash 會變成空的
    const [token] = useState(() => readTokenFromHash(location.hash));
    // checking → valid | invalid
    const [status, setStatus] = useState(token ? 'checking' : 'invalid');
    const [invalidReason, setInvalidReason] = useState('');
    const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!token) return undefined;

        // 不讓重設碼留在網址列與瀏覽紀錄裡（旁人瞄到、或同一台電腦的下一個人按上一頁）。
        // 代價是重新整理這頁會失效——再點一次信裡的連結即可，連結在用掉之前都有效。
        window.history.replaceState(null, '', location.pathname);

        let active = true;
        authService
            .verifyResetToken(token)
            .then(() => active && setStatus('valid'))
            .catch((err) => {
                if (!active) return;
                setInvalidReason(translateApiError(err, t('errors.RESET_TOKEN_INVALID')));
                setStatus('invalid');
            });
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
            setError(t('errors.NEW_PASSWORD_TOO_SHORT'));
            return;
        }
        if (form.newPassword !== form.confirmPassword) {
            setError(t('auth.reset.mismatch'));
            return;
        }

        setSubmitting(true);
        try {
            await authService.resetPassword(token, form.newPassword);
            // 不自動登入：讓使用者用新密碼登入一次，確認他真的記住了
            navigate('/login', { replace: true, state: { passwordReset: true } });
        } catch (err) {
            const message = translateApiError(err, t('auth.reset.failed'));
            // 連結在填表期間過期或被用掉了：切到無效畫面，給「重新申請」的出口
            if (['RESET_TOKEN_INVALID', 'RESET_TOKEN_EXPIRED'].includes(err?.errorCode)) {
                setInvalidReason(message);
                setStatus('invalid');
            } else {
                setError(message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 4, md: 6 } }}>
            <Paper
                variant="outlined"
                sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 420, borderColor: 'divider' }}
            >
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {t('auth.reset.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('auth.reset.subtitle')}
                    </Typography>
                </Box>

                {status === 'checking' && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {status === 'invalid' && (
                    <Stack spacing={2}>
                        <Alert severity="warning">
                            {invalidReason || t('errors.RESET_TOKEN_INVALID')}
                        </Alert>
                        <Button
                            component={RouterLink}
                            to="/forgot-password"
                            variant="contained"
                            fullWidth
                        >
                            {t('auth.reset.requestNew')}
                        </Button>
                    </Stack>
                )}

                {status === 'valid' && (
                    <>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label={t('auth.reset.newPassword')}
                                    name="newPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    value={form.newPassword}
                                    onChange={handleChange}
                                    helperText={t('auth.reset.hint', { min: MIN_PASSWORD_LENGTH })}
                                    required
                                    autoFocus
                                />
                                <TextField
                                    fullWidth
                                    label={t('auth.reset.confirmPassword')}
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    size="large"
                                    variant="contained"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <CircularProgress size={22} sx={{ color: 'inherit' }} />
                                    ) : (
                                        t('auth.reset.submit')
                                    )}
                                </Button>
                            </Stack>
                        </Box>
                    </>
                )}

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: 'center', mt: 3 }}
                >
                    <Link component={RouterLink} to="/login" sx={{ fontWeight: 500 }}>
                        {t('auth.forgot.backToLogin')}
                    </Link>
                </Typography>
            </Paper>
        </Box>
    );
};

export default ResetPasswordPage;
