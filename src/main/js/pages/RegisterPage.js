import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        studentId: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        fullName: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 驗證密碼
        if (formData.password !== formData.confirmPassword) {
            setError('密碼與確認密碼不相符');
            return;
        }

        if (formData.password.length < 6) {
            setError('密碼長度至少需要 6 個字元');
            return;
        }

        setLoading(true);

        try {
            const { confirmPassword, ...registerData } = formData;
            await register(registerData);
            navigate('/');
        } catch (err) {
            if (err.errors && Array.isArray(err.errors)) {
                setError(err.errors[0].msg);
            } else {
                setError(err.error || '註冊失敗，請稍後再試');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h4" align="center" gutterBottom>
                        註冊新帳號
                    </Typography>
                    
                    <Typography variant="body2" align="center" color="textSecondary" sx={{ mb: 3 }}>
                        加入台大資管系學會
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="學號"
                            name="studentId"
                            value={formData.studentId}
                            onChange={handleChange}
                            margin="normal"
                            required
                            placeholder="例：B09705001"
                            helperText="請輸入您的學號"
                        />

                        <TextField
                            fullWidth
                            label="使用者名稱"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            margin="normal"
                            required
                            helperText="用於登入的帳號名稱"
                        />

                        <TextField
                            fullWidth
                            label="真實姓名"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />

                        <TextField
                            fullWidth
                            label="電子郵件"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            margin="normal"
                            required
                            placeholder="例：student@ntu.edu.tw"
                        />

                        <TextField
                            fullWidth
                            label="密碼"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            margin="normal"
                            required
                            helperText="至少 6 個字元"
                        />

                        <TextField
                            fullWidth
                            label="確認密碼"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : '註冊'}
                        </Button>

                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2">
                                已經有帳號？
                                <Link to="/login" style={{ marginLeft: 5 }}>
                                    立即登入
                                </Link>
                            </Typography>
                        </Box>
                    </form>

                    <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                            註冊後您將成為一般使用者。若要使用完整功能（如下載考古題、上傳大抄等），
                            請聯繫系學會繳交會費。
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default RegisterPage;