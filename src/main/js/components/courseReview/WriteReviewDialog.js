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
    Autocomplete,
    CircularProgress,
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
    courseContent: '',
    teachingMethod: '',
    assignmentExamFormat: '',
    gradingBreakdown: '',
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

// 把後端回傳的可填寫學年期（期末考已結束的學期）轉成下拉選單選項。
// 學年期是否可填由後端依台大行事曆判斷，前端不自己推算，避免兩邊規則不一致。
const toTermOption = (term) => ({
    value: `${term.year}-${term.semester}`,
    label: `${term.year - 1911}-${i18n.t(`courseReview.academicTermSuffix.${term.semester}`, {
        defaultValue: term.semester,
    })}`,
    adYear: term.year,
    semester: term.semester,
});

const hasDraftContent = (data) =>
    (data.comment && data.comment.trim().length > 0) ||
    (data.courseContent && data.courseContent.trim().length > 0) ||
    (data.teachingMethod && data.teachingMethod.trim().length > 0) ||
    (data.assignmentExamFormat && data.assignmentExamFormat.trim().length > 0) ||
    (data.gradingBreakdown && data.gradingBreakdown.trim().length > 0) ||
    data.quality !== null ||
    data.difficulty !== null ||
    data.sweetness !== null ||
    data.usefulness !== null;

const WriteReviewDialog = ({ open, onClose, review, onSaved }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [draftRestored, setDraftRestored] = useState(false);
    const [courseOptions, setCourseOptions] = useState([]);
    const [courseSearchLoading, setCourseSearchLoading] = useState(false);
    const [termOptions, setTermOptions] = useState([]);
    // 課程資料是從下拉選單自動帶入的：課號/教授/學年期就鎖起來不讓手動改，
    // 避免跟課程目錄的正確資料不一致；重新手打課程名稱就會解鎖
    const [autoFilled, setAutoFilled] = useState(false);

    const isEditing = !!review;
    // 被拒絕的評價修改後其實是「重新送出」而不是單純存檔，按鈕文字要對應改變，讓使用者清楚知道這是要重新進入審核
    const isResubmit = isEditing && review?.status === 'rejected';
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
                courseContent: review.courseContent || '',
                teachingMethod: review.teachingMethod || '',
                assignmentExamFormat: review.assignmentExamFormat || '',
                gradingBreakdown: review.gradingBreakdown || '',
                comment: review.comment || '',
                isAnonymous: !!review.isAnonymous,
            };
        }
        return emptyForm;
    };

    // 草稿暫存只用在「新增」：編輯既有評價時內容本來就存在伺服器上，
    // 不需要、也不應該套用本機殘留的草稿（草稿可能是很久以前寫到一半的舊內容）。
    useEffect(() => {
        if (!open) return;
        const base = buildBaseFormData();

        if (isEditing) {
            setFormData(base);
            setDraftRestored(false);
            setError('');
            return;
        }

        try {
            const saved = localStorage.getItem(draftKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // 跟 base 合併，避免舊版（欄位改動前）存的草稿缺少新欄位，
                // 導致還原後 formData 裡有 undefined，畫面 .trim() 時整個炸掉
                const merged = { ...base, ...parsed };
                setFormData(merged);
                setDraftRestored(hasDraftContent(merged));
            } else {
                setFormData(base);
                setDraftRestored(false);
            }
        } catch (e) {
            setFormData(base);
            setDraftRestored(false);
        }
        setError('');
        setAutoFilled(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [review, open]);

    // 取得可填寫的學年期（期末考已結束的學期）
    useEffect(() => {
        if (!open) return;
        courseReviewService
            .getReviewableTerms()
            .then((terms) => setTermOptions(terms.map(toTermOption)))
            .catch(() => setTermOptions([]));
    }, [open]);

    // 新增評價時，預設帶入最新一個可填寫的學年期（emptyForm 的預設值不一定可填）
    useEffect(() => {
        if (!open || isEditing || termOptions.length === 0 || autoFilled) return;
        const currentValue = `${formData.year}-${formData.semester}`;
        if (termOptions.some((o) => o.value === currentValue)) return;
        const newest = termOptions[0];
        setFormData((prev) => ({ ...prev, year: newest.adYear, semester: newest.semester }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [termOptions, open, isEditing]);

    // 自動暫存草稿（防抖 500ms），避免使用者不小心跳開頁面後心得整篇消失；只在新增時啟用
    useEffect(() => {
        if (!open || isEditing) return;
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

    // 課程名稱自動完成（防抖 400ms）：新增時才需要查，編輯模式課程名稱本來就鎖定不能改。
    // loading 狀態要等防抖計時器真的觸發、請求真的送出時才設 true——如果打字當下就同步設 true，
    // 每個按鍵都會讓 loading 圖示瞬間出現又消失，輸入框寬度跟著抖動，看起來就是一直閃爍。
    useEffect(() => {
        if (!open || isEditing) return;
        const keyword = formData.courseName.trim();
        if (!keyword) {
            setCourseOptions([]);
            setCourseSearchLoading(false);
            return;
        }
        const timer = setTimeout(async () => {
            setCourseSearchLoading(true);
            try {
                const results = await courseReviewService.searchCourseCatalog(keyword);
                setCourseOptions(results);
            } catch (e) {
                setCourseOptions([]);
            } finally {
                setCourseSearchLoading(false);
            }
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.courseName, open, isEditing]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleAcademicTermChange = (value) => {
        const option = currentAcademicTermOptions.find((o) => o.value === value);
        if (!option) return;
        setFormData((prev) => ({ ...prev, year: option.adYear, semester: option.semester }));
        setError('');
    };

    // 從自動完成選單選了一筆課程目錄資料：一次帶入課程名稱、課號、教授、學年期，
    // 並鎖定這三個欄位（資料來自課程目錄，不該被手動改成不一致的內容）
    const handleCourseSelect = (option) => {
        if (!option || typeof option === 'string') return;
        setFormData((prev) => ({
            ...prev,
            courseName: option.courseName,
            courseCode: option.courseCode,
            professor: option.professor || '',
            year: option.year,
            semester: option.semester,
        }));
        setCourseOptions([]);
        setAutoFilled(true);
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
        const courseContentLength = formData.courseContent.trim().length;
        if (courseContentLength < 5 || courseContentLength > 1000) {
            setError(t('errors.COURSE_CONTENT_REQUIRED'));
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
                    courseContent: formData.courseContent,
                    teachingMethod: formData.teachingMethod,
                    assignmentExamFormat: formData.assignmentExamFormat,
                    gradingBreakdown: formData.gradingBreakdown,
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

    // 選項 value 一律用「西元年-學期」，跟後端回傳的格式一致
    const currentTermValue = `${formData.year}-${formData.semester}`;
    // 編輯舊評價時，該評價的學年期可能已經不在「可填寫」清單裡（例如清單只往前推 4 學年），
    // 這時候要把它補進選項，否則下拉選單會顯示空白
    const currentAcademicTermOptions = termOptions.some((o) => o.value === currentTermValue)
        ? termOptions
        : [
              {
                  value: currentTermValue,
                  label: `${formData.year - 1911}-${t(`courseReview.academicTermSuffix.${formData.semester}`, {
                      defaultValue: formData.semester,
                  })}`,
                  adYear: formData.year,
                  semester: formData.semester,
              },
              ...termOptions,
          ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEditing ? t('courseReview.editReview') : t('courseReview.newReviewTitle')}</DialogTitle>
            <DialogContent>
                {isResubmit && review.rejectReason && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {t('courseReview.rejectReasonLabel', { reason: review.rejectReason })}
                    </Alert>
                )}

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
                            <>
                                <Button color="inherit" size="small" onClick={() => setDraftRestored(false)}>
                                    {t('courseReview.form.dismissDraftNotice')}
                                </Button>
                                <Button color="inherit" size="small" onClick={handleDiscardDraft}>
                                    {t('courseReview.form.clearDraft')}
                                </Button>
                            </>
                        }
                    >
                        {t('courseReview.form.draftRestored')}
                    </Alert>
                )}

                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12}>
                        <Autocomplete
                            freeSolo
                            fullWidth
                            disabled={isEditing}
                            options={courseOptions}
                            filterOptions={(options) => options}
                            loading={courseSearchLoading}
                            inputValue={formData.courseName}
                            onInputChange={(e, newValue, reason) => {
                                handleChange('courseName', newValue);
                                // 使用者自己動手改課程名稱（而不是從選單挑）就解除鎖定，讓他能手動填課號/教授/學年期
                                if (reason === 'input') setAutoFilled(false);
                            }}
                            onChange={(e, selectedOption) => handleCourseSelect(selectedOption)}
                            getOptionLabel={(option) => (typeof option === 'string' ? option : option.courseName)}
                            isOptionEqualToValue={(option, val) => option.courseCode === val.courseCode && option.professor === val.professor && option.year === val.year && option.semester === val.semester}
                            renderOption={(props, option) => (
                                <li {...props} key={`${option.courseCode}-${option.professor}-${option.year}-${option.semester}`}>
                                    <Box>
                                        <Typography variant="body2">{option.courseName}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {option.professor || t('common.unknown')} · {courseReviewService.getAcademicTermLabel(option.year, option.semester)}
                                        </Typography>
                                    </Box>
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={t('courseReview.form.courseName')}
                                    required
                                    helperText={t('courseReview.form.courseNameHelper')}
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {courseSearchLoading ? <CircularProgress size={16} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label={t('courseReview.form.courseCode')}
                            value={formData.courseCode}
                            onChange={(e) => handleChange('courseCode', e.target.value)}
                            disabled={isEditing || autoFilled}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label={t('courseReview.form.professor')}
                            value={formData.professor}
                            onChange={(e) => handleChange('professor', e.target.value)}
                            disabled={isEditing || autoFilled}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            select
                            fullWidth
                            label={t('courseReview.form.academicTerm')}
                            value={currentTermValue}
                            onChange={(e) => handleAcademicTermChange(e.target.value)}
                            disabled={isEditing || autoFilled}
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
                            rows={3}
                            label={t('courseReview.form.courseContent')}
                            required
                            value={formData.courseContent}
                            onChange={(e) => handleChange('courseContent', e.target.value)}
                            inputProps={{ maxLength: 1000 }}
                            helperText={t('courseReview.form.courseContentHelper', { count: formData.courseContent.trim().length })}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label={t('courseReview.form.teachingMethod')}
                            value={formData.teachingMethod}
                            onChange={(e) => handleChange('teachingMethod', e.target.value)}
                            inputProps={{ maxLength: 1000 }}
                            helperText={t('courseReview.form.optionalFieldHelper', { count: formData.teachingMethod.trim().length })}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label={t('courseReview.form.assignmentExamFormat')}
                            value={formData.assignmentExamFormat}
                            onChange={(e) => handleChange('assignmentExamFormat', e.target.value)}
                            inputProps={{ maxLength: 1000 }}
                            helperText={t('courseReview.form.optionalFieldHelper', { count: formData.assignmentExamFormat.trim().length })}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label={t('courseReview.form.gradingBreakdown')}
                            value={formData.gradingBreakdown}
                            onChange={(e) => handleChange('gradingBreakdown', e.target.value)}
                            inputProps={{ maxLength: 1000 }}
                            helperText={t('courseReview.form.optionalFieldHelper', { count: formData.gradingBreakdown.trim().length })}
                        />
                    </Grid>

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
                    {isResubmit
                        ? t('courseReview.form.resubmit')
                        : isEditing
                            ? t('courseReview.form.saveChanges')
                            : t('courseReview.form.submitReview')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default WriteReviewDialog;
