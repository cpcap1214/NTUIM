import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Alert,
    Typography,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import feedbackService from '../services/feedbackService';
import { translateApiError } from '../utils';

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

// 匿名意見回饋。
//
// 「匿名」在這裡是技術保證而不是介面承諾：後端的 feedback 資料表沒有 user_id 欄位。
// 要求登入只是為了擋洪水與限流（限流計數在記憶體裡，不落地）。
//
// 送出後刻意不顯示編號或任何「我們會回覆你」的字樣——那會暗示送出者可被追溯，
// 與這個功能的前提矛盾。
const FeedbackDialog = ({ open, onClose }) => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();

    const [category, setCategory] = useState('suggestion');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const reset = () => {
        setCategory('suggestion');
        setBody('');
        setError('');
        setSent(false);
        setSubmitting(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');
        try {
            await feedbackService.submit({ body: body.trim(), category });
            setSent(true);
            setBody('');
        } catch (err) {
            setError(translateApiError(err, t('feedback.submitFailed')));
        } finally {
            setSubmitting(false);
        }
    };

    const trimmedLength = body.trim().length;
    const canSubmit = trimmedLength >= MIN_LENGTH && trimmedLength <= MAX_LENGTH && !submitting;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>{t('feedback.title')}</DialogTitle>

            <DialogContent dividers>
                {!isAuthenticated ? (
                    <Stack spacing={2}>
                        <Alert severity="info">{t('feedback.loginRequired')}</Alert>
                        <Typography variant="body2" color="text.secondary">
                            {t('feedback.loginRequiredWhy')}
                        </Typography>
                        <Button component={RouterLink} to="/login" variant="contained" onClick={handleClose}>
                            {t('nav.login')}
                        </Button>
                    </Stack>
                ) : sent ? (
                    <Stack spacing={2}>
                        <Alert severity="success">{t('feedback.sent')}</Alert>
                        <Typography variant="body2" color="text.secondary">
                            {t('feedback.sentHint')}
                        </Typography>
                    </Stack>
                ) : (
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Alert severity="info">{t('feedback.anonymityNotice')}</Alert>

                        <FormControl fullWidth>
                            <InputLabel>{t('feedback.category')}</InputLabel>
                            <Select
                                value={category}
                                label={t('feedback.category')}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <MenuItem value="bug">{t('feedback.categories.bug')}</MenuItem>
                                <MenuItem value="suggestion">{t('feedback.categories.suggestion')}</MenuItem>
                                <MenuItem value="other">{t('feedback.categories.other')}</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label={t('feedback.body')}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            multiline
                            minRows={5}
                            fullWidth
                            inputProps={{ maxLength: MAX_LENGTH }}
                            helperText={t('feedback.bodyHelper', { count: trimmedLength, max: MAX_LENGTH })}
                        />

                        {error && <Alert severity="error">{error}</Alert>}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={handleClose}>{sent ? t('common.close') : t('common.cancel')}</Button>
                {isAuthenticated && !sent && (
                    <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
                        {submitting ? t('feedback.submitting') : t('feedback.submit')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default FeedbackDialog;
