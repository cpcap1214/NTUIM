import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Grid,
    Typography,
    Box,
    Alert,
    Stack,
    Rating,
} from '@mui/material';
import courseReviewService from '../../services/courseReviewService';
import { translateApiError } from '../../utils';
import i18n from '../../i18n';

const emptyForm = {
    courseCode: '',
    courseName: '',
    professor: '',
    year: new Date().getFullYear(),
    semester: '1',
    // 四個指標分數是 0~5（含 0.5），用 null 代表「尚未選擇」，避免跟合法的 0 分混淆
    quality: null,
    difficulty: null,
    sweetness: null,
    usefulness: null,
    comment: '',
    isAnonymous: false,
};

const METRIC_KEYS = ['quality', 'difficulty', 'sweetness', 'usefulness'];
const METRIC_TEXT_FN = {
    quality: courseReviewService.getQualityText,
    difficulty: courseReviewService.getDifficultyText,
    sweetness: courseReviewService.getSweetnessText,
    usefulness: courseReviewService.getUsefulnessText,
};

// 產生「學年期」選項（民國年-學期），從今學年往前推 3 個學年，新到舊排序。
// 這是模組層級（import 時就算好一次），元件內的 hook 用不到，所以直接用
// 靜態的 i18n 實例翻譯後綴，而不是元件內的 useTranslation。
const buildAcademicTermOptions = () => {
    const currentRocYear = new Date().getFullYear() - 1911;
    const startYear = currentRocYear - 3;
    const chronological = [];
    for (let y = startYear; y <= currentRocYear; y++) {
        chronological.push({ value: `${y}-1`, label: `${y}-1`, adYear: y + 1911, semester: '1' });
        chronological.push({ value: `${y}-2`, label: `${y}-2`, adYear: y + 1911, semester: '2' });
        chronological.push({
            value: `${y}-summer`,
            label: `${y}-${i18n.t('courseReview.academicTermSuffix.summer')}`,
            adYear: y + 1911,
            semester: 'summer',
        });
    }
    return chronological.reverse();
};

const BASE_ACADEMIC_TERM_OPTIONS = buildAcademicTermOptions();

const hasDraftContent = (data) =>
    (data.comment && data.comment.trim().length > 0) ||
    data.quality !== null ||
    data.difficulty !== null ||
    data.sweetness !== null ||
    data.usefulness !== null;

const WriteReviewDialog = ({ open, onClose, review, initialCourse, onSaved }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [draftRestored, setDraftRestored] = useState(false);

    const isEditing = !!review;
    const draftKey = review ? `courseReviewDraft:edit:${review.id}` : 'courseReviewDraft:new';

    const buildBaseFormData = () => {
        if (review) {
            return {
                courseCode: review.courseCode || '',
                courseName: review.courseName || '',
                professor: review.professor || '',
                year: review.year || new Date().getFullYear(),
                semester: review.semester || '1',
                quality: review.quality !== undefined ? parseFloat(review.quality) : null,
                difficulty: review.difficulty !== undefined ? parseFloat(review.difficulty) : null,
                sweetness: review.sweetness !== undefined ? parseFloat(review.sweetness) : null,
                usefulness: review.usefulness !== undefined ? parseFloat(review.usefulness) : null,
                comment: review.comment || '',
                isAnonymous: !!review.isAnonymous,
            };
        }
        return {
            ...emptyForm,
            courseCode: initialCourse?.courseCode || '',
            courseName: initialCourse?.courseName || '',
        };
    };

    useEffect(() => {
        if (!open) return;
        const base = buildBaseFormData();
        try {
            const saved = localStorage.getItem(draftKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                setFormData(parsed);
                setDraftRestored(hasDraftContent(parsed));
            } else {
                setFormData(base);
                setDraftRestored(false);
            }
        } catch (e) {
            setFormData(base);
            setDraftRestored(false);
        }
        setError('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [review, initialCourse, open]);

    // 自動暫存草稿（防抖 500ms），避免使用者不小心跳開頁面後心得整篇消失
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(draftKey, JSON.stringify(formData));
            } catch (e) {
                // localStorage 滿了或被封鎖時直接忽略，不影響填寫
            }
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, open]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleAcademicTermChange = (value) => {
        const option = BASE_ACADEMIC_TERM_OPTIONS.find((o) => o.value === value) || currentAcademicTermOptions.find((o) => o.value === value);
        if (!option) return;
        setFormData((prev) => ({ ...prev, year: option.adYear, semester: option.semester }));
        setError('');
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem(draftKey);
        setDraftRestored(false);
        setFormData(buildBaseFormData());
    };

    const handleSubmit = async () => {
        if (!isEditing) {
            if (!formData.courseCode.trim() || !formData.courseName.trim() || !formData.professor.trim()) {
                setError(t('courseReview.form.basicInfoRequired'));
                return;
            }
        }
        if (
            formData.quality === null ||
            formData.difficulty === null ||
            formData.sweetness === null ||
            formData.usefulness === null
        ) {
            setError(t('courseReview.form.ratingsIncomplete'));
            return;
        }
        const commentLength = formData.comment.trim().length;
        if (commentLength < 50 || commentLength > 1000) {
            setError(t('errors.COMMENT_LENGTH'));
            return;
        }

        setLoading(true);
        setError('');
        try {
            if (isEditing) {
                await courseReviewService.updateReview(review.id, {
                    quality: formData.quality,
                    difficulty: formData.difficulty,
                    sweetness: formData.sweetness,
                    usefulness: formData.usefulness,
                    comment: formData.comment,
                    isAnonymous: formData.isAnonymous,
                });
            } else {
                await courseReviewService.createReview(formData);
            }
            localStorage.removeItem(draftKey);
            onSaved();
        } catch (err) {
            setError(translateApiError(err));
        } finally {
            setLoading(false);
        }
    };

    const currentTermValue = `${formData.year - 1911}-${formData.semester}`;
    const currentAcademicTermOptions = BASE_ACADEMIC_TERM_OPTIONS.some((o) => o.value === currentTermValue)
        ? BASE_ACADEMIC_TERM_OPTIONS
        : [
              {
                  value: currentTermValue,
                  label: `${formData.year - 1911}-${t(`courseReview.academicTermSuffix.${formData.semester}`)}`,
                  adYear: formData.year,
                  semester: formData.semester,
              },
              ...BASE_ACADEMIC_TERM_OPTIONS,
          ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEditing ? t('courseReview.editReview') : t('courseReview.newReviewTitle')}</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {draftRestored && (
                    <Alert
                        severity="info"
                        sx={{ mb: 2 }}
                        action={
                            <Button color="inherit" size="small" onClick={handleDiscardDraft}>
                                {t('courseReview.form.clearDraft')}
                            </Button>
                        }
                    >
                        {t('courseReview.form.draftRestored')}
                    </Alert>
                )}

                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label={t('courseReview.form.courseName')}
                            value={formData.courseName}
                            onChange={(e) => handleChange('courseName', e.target.value)}
                            disabled={isEditing}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                        <TextField
                            fullWidth
                            label={t('courseReview.form.courseCode')}
                            value={formData.courseCode}
                            onChange={(e) => handleChange('courseCode', e.target.value)}
                            disabled={isEditing}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label={t('courseReview.form.professor')}
                            value={formData.professor}
                            onChange={(e) => handleChange('professor', e.target.value)}
                            disabled={isEditing}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            select
                            fullWidth
                            label={t('courseReview.form.academicTerm')}
                            value={currentTermValue}
                            onChange={(e) => handleAcademicTermChange(e.target.value)}
                            disabled={isEditing}
                        >
                            {currentAcademicTermOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {METRIC_KEYS.map((key) => (
                        <Grid item xs={12} sm={6} key={key}>
                            <Typography variant="subtitle2" gutterBottom>
                                {t(`courseReview.metrics.${key}`)}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Rating
                                    precision={0.5}
                                    value={formData[key]}
                                    onChange={(e, value) => handleChange(key, value)}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {formData[key] === null ? t('courseReview.form.notRatedYet') : METRIC_TEXT_FN[key](formData[key])}
                                </Typography>
                            </Stack>
                        </Grid>
                    ))}

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label={t('courseReview.form.comment')}
                            required
                            value={formData.comment}
                            onChange={(e) => handleChange('comment', e.target.value)}
                            inputProps={{ maxLength: 1000 }}
                            helperText={t('courseReview.form.commentHelper', { count: formData.comment.trim().length })}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.isAnonymous}
                                    onChange={(e) => handleChange('isAnonymous', e.target.checked)}
                                />
                            }
                            label={t('courseReview.form.anonymous')}
                        />
                    </Grid>
                </Grid>

                {isEditing && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.disabled">
                            {t('courseReview.form.lockedFieldsHint')}
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.cancel')}</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                    {isEditing ? t('courseReview.form.saveChanges') : t('courseReview.form.submitReview')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default WriteReviewDialog;
