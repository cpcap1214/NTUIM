import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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

// 重設連結的效期（分鐘），和後端 config/passwordReset.js 的 EMAIL_TTL_MS 一致
const LINK_TTL_MINUTES = 30;

// 忘記密碼：輸入帳號或學號，寄一次性重設連結到註冊時的 Email。
//
// 送出後不論帳號存不存在，畫面都一樣——後端的回應本來就刻意相同，
// 前端若依結果顯示不同內容，等於把「誰有帳號」又透露出去。
const ForgotPasswordPage = () => {
    const { t } = useTranslation();
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authService.forgotPassword(identifier.trim());
            setSent(true);
        } catch (err) {
            // 只有輸入空白（400）或申請太頻繁（429）會走到這裡，兩者都不透露帳號是否存在
            setError(translateApiError(err, t('auth.forgot.failed')));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 4, md: 6 } }}>
            <Paper
                variant="outlined"
                sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 420, borderColor: 'divider' }}
            >
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {t('auth.forgot.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('auth.forgot.subtitle')}
                    </Typography>
                </Box>

                {sent ? (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {t('auth.forgot.sent', { minutes: LINK_TTL_MINUTES })}
                    </Alert>
                ) : (
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
                                    label={t('auth.usernameOrStudentId')}
                                    name="identifier"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    size="large"
                                    variant="contained"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <CircularProgress size={22} sx={{ color: 'inherit' }} />
                                    ) : (
                                        t('auth.forgot.submit')
                                    )}
                                </Button>
                            </Stack>
                        </Box>
                    </>
                )}

                {/* 收不到信的人（Email 打錯、被擋）唯一的出路，一定要看得到 */}
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: 'center', mt: 2 }}
                >
                    {t('auth.forgot.noEmailHelp')}
                    <Link href="mailto:imsa@ntu.im" sx={{ ml: 0.5, fontWeight: 500 }}>
                        imsa@ntu.im
                    </Link>
                </Typography>

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

export default ForgotPasswordPage;
