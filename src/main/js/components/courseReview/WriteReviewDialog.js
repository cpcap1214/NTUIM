import React, { useState, useEffect } from 'react';
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

const metricFields = [
    { key: 'quality', label: '課程品質', textFn: (v) => courseReviewService.getQualityText(v) },
    { key: 'difficulty', label: '難易度', textFn: (v) => courseReviewService.getDifficultyText(v) },
    { key: 'sweetness', label: '給分高低', textFn: (v) => courseReviewService.getSweetnessText(v) },
    { key: 'usefulness', label: '實用性', textFn: (v) => courseReviewService.getUsefulnessText(v) },
];

// 產生「學年期」選項（民國年-學期），從今學年往前推 3 個學年，新到舊排序
const buildAcademicTermOptions = () => {
    const currentRocYear = new Date().getFullYear() - 1911;
    const startYear = currentRocYear - 3;
    const chronological = [];
    for (let y = startYear; y <= currentRocYear; y++) {
        chronological.push({ value: `${y}-1`, label: `${y}-1`, adYear: y + 1911, semester: '1' });
        chronological.push({ value: `${y}-2`, label: `${y}-2`, adYear: y + 1911, semester: '2' });
        chronological.push({ value: `${y}-summer`, label: `${y}-暑`, adYear: y + 1911, semester: 'summer' });
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
                setError('課程代碼、課程名稱、授課教授為必填');
                return;
            }
        }
        if (
            formData.quality === null ||
            formData.difficulty === null ||
            formData.sweetness === null ||
            formData.usefulness === null
        ) {
            setError('請完成所有評分項目');
            return;
        }
        const commentLength = formData.comment.trim().length;
        if (commentLength < 50 || commentLength > 1000) {
            setError('心得為必填，請填寫 50-1000 字');
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
            setError(err.error || err.errors?.[0]?.msg || '送出失敗，請稍後再試');
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
                  label: `${formData.year - 1911}-${formData.semester === 'summer' ? '暑' : formData.semester}`,
                  adYear: formData.year,
                  semester: formData.semester,
              },
              ...BASE_ACADEMIC_TERM_OPTIONS,
          ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEditing ? '編輯課程評價' : '新增課程評價'}</DialogTitle>
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
                                清除草稿
                            </Button>
                        }
                    >
                        已還原上次未完成的草稿
                    </Alert>
                )}

                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="課程名稱"
                            value={formData.courseName}
                            onChange={(e) => handleChange('courseName', e.target.value)}
                            disabled={isEditing}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                        <TextField
                            fullWidth
                            label="課程代碼"
                            value={formData.courseCode}
                            onChange={(e) => handleChange('courseCode', e.target.value)}
                            disabled={isEditing}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="授課教授"
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
                            label="學年期"
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

                    {metricFields.map((m) => (
                        <Grid item xs={12} sm={6} key={m.key}>
                            <Typography variant="subtitle2" gutterBottom>
                                {m.label}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Rating
                                    precision={0.5}
                                    value={formData[m.key]}
                                    onChange={(e, value) => handleChange(m.key, value)}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {formData[m.key] === null ? '尚未評分' : m.textFn(formData[m.key])}
                                </Typography>
                            </Stack>
                        </Grid>
                    ))}

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="心得評論"
                            required
                            value={formData.comment}
                            onChange={(e) => handleChange('comment', e.target.value)}
                            inputProps={{ maxLength: 1000 }}
                            helperText={`${formData.comment.trim().length} / 1000 字（至少 50 字，評價通過審核後才會公開顯示；內容會自動暫存草稿）`}
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
                            label="以匿名身份發布"
                        />
                    </Grid>
                </Grid>

                {isEditing && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.disabled">
                            課程、教授、學期資訊建立後無法修改，如有錯誤請刪除後重新新增。
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>取消</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                    {isEditing ? '儲存變更' : '送出評價'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default WriteReviewDialog;
