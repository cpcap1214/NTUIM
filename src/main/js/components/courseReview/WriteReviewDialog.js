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
    FormHelperText,
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

// 學期下拉選單的「全部」選項。它是搜尋範圍，不是一個學年期——
// 選著它送出時會被擋下（見 handleSubmit），學年期必須由挑中的課程帶入。
const ALL_TERMS = 'all';

// 搜尋結果的名額。開得大是因為一門課的每位教授各佔一列
//（FL1008 英文有 24 位、FL1004 有 14 位），名額小的話整個選單會被同一門課佔滿：
// 實測搜「英文」在 limit 15 時只涵蓋 54 個相異課號中的 1 個，150 才是全部。
const SEARCH_LIMIT_SCOPED = 150;
const SEARCH_LIMIT_ALL = 200;

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
    // 結果是否被名額截斷；是的話要提示使用者縮小關鍵字，而不是讓他以為課程不存在
    const [courseSearchTruncated, setCourseSearchTruncated] = useState(false);
    const [termOptions, setTermOptions] = useState([]);
    // 課號與教授是從下拉選單自動帶入的，帶入後就鎖起來不讓手動改，
    // 避免跟課程目錄的正確資料不一致；重新手打課程名稱就會解鎖。
    // 學年期不在鎖定範圍內——它現在是使用者主動先選的搜尋條件，不是自動帶入的結果。
    const [autoFilled, setAutoFilled] = useState(false);
    // 學期下拉的選取值：ALL_TERMS 或「西元年-學期」。
    // 它同時是課程搜尋的範圍，以及（非 ALL_TERMS 時）這筆評價的學年期。
    const [termSelection, setTermSelection] = useState(ALL_TERMS);

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
            setTermSelection(`${base.year}-${base.semester}`);
            setDraftRestored(false);
            setError('');
            return;
        }

        // 還原草稿時連學期選擇一起還原；若該學期已不可填，下面的預設值 effect 會修正
        const applyNew = (data) => {
            setFormData(data);
            setTermSelection(`${data.year}-${data.semester}`);
        };

        try {
            const saved = localStorage.getItem(draftKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // 跟 base 合併，避免舊版（欄位改動前）存的草稿缺少新欄位，
                // 導致還原後 formData 裡有 undefined，畫面 .trim() 時整個炸掉
                const merged = { ...base, ...parsed };
                applyNew(merged);
                setDraftRestored(hasDraftContent(merged));
            } else {
                applyNew(base);
                setDraftRestored(false);
            }
        } catch (e) {
            applyNew(base);
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

    // 新增評價時，預設帶入「最近一個期末考已結束」的學年期。
    // termOptions 是後端依台大行事曆排序好的（新到舊），所以第一筆就是它——
    // 例如現在是 115-1 學期進行中，期末考尚未結束，預設就會是 114-2。
    // emptyForm 的 new Date().getFullYear() 幾乎一定不可填，所以這步是必要的。
    useEffect(() => {
        if (!open || isEditing || termOptions.length === 0 || autoFilled) return;
        if (termOptions.some((o) => o.value === termSelection)) return;
        const newest = termOptions[0];
        setFormData((prev) => ({ ...prev, year: newest.adYear, semester: newest.semester }));
        setTermSelection(newest.value);
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
            setCourseSearchTruncated(false);
            setCourseSearchLoading(false);
            return;
        }
        const scoped = termSelection !== ALL_TERMS;
        const [scopedYear, scopedSemester] = scoped ? termSelection.split('-') : [];
        // 「全部」要跨三個學期，筆數約三倍，名額再放大一級
        const limit = scoped ? SEARCH_LIMIT_SCOPED : SEARCH_LIMIT_ALL;
        const timer = setTimeout(async () => {
            setCourseSearchLoading(true);
            try {
                const results = await courseReviewService.searchCourseCatalog(keyword, {
                    year: scoped ? scopedYear : undefined,
                    semester: scoped ? scopedSemester : undefined,
                    limit,
                });
                setCourseOptions(results);
                // 剛好塞滿名額就代表可能還有沒顯示到的課程，要讓使用者知道，
                // 否則他會以為那些課不存在（這正是「國文、英文有缺」的來源）
                setCourseSearchTruncated(results.length >= limit);
            } catch (e) {
                setCourseOptions([]);
                setCourseSearchTruncated(false);
            } finally {
                setCourseSearchLoading(false);
            }
        }, 400);
        return () => clearTimeout(timer);
        // termSelection 也要在依賴裡：換學期就要用新範圍重新搜尋
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.courseName, termSelection, open, isEditing]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError('');
    };

    // 換學期＝換搜尋範圍。已經自動帶入的課號與教授必須清掉並解鎖：
    // 那組資料屬於原本那個學期，留著會送出「該學期實際上不存在」的課程與教授組合。
    // 課程名稱保留，讓使用者不用重打；搜尋 effect 會用新學期重新列出選項。
    const handleAcademicTermChange = (value) => {
        setTermSelection(value);
        setCourseOptions([]);
        setAutoFilled(false);
        setFormData((prev) => ({
            ...prev,
            courseCode: '',
            professor: '',
            // 「全部」本身不是學年期，等使用者從選單挑課程時才會有值
            ...(value === ALL_TERMS ? {} : { year: parseInt(value.split('-')[0], 10), semester: value.split('-')[1] }),
        }));
        setError('');
    };

    // 從自動完成選單選了一筆課程目錄資料：帶入課程名稱、課號、教授並鎖定後兩者
    // （資料來自課程目錄，不該被手動改成不一致的內容）。
    //
    // 學年期只在「全部」模式下才由課程帶入；已經指定學期時不覆寫——
    // 那是使用者自己先選的，而且搜尋結果本來就限定在該學期內。
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
        // 「全部」模式下把下拉切到該課程的學年期，讓使用者看得到最終會送出什麼
        if (termSelection === ALL_TERMS) {
            setTermSelection(`${option.year}-${option.semester}`);
        }
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
            // 「全部」是搜尋範圍而不是學年期。停在它上面就代表使用者沒從選單挑課程
            //（挑了就會自動切到該課程的學期），這種情況下沒有可送出的學年期。
            if (termSelection === ALL_TERMS) {
                setError(t('courseReview.form.termRequiredForManualEntry'));
                return;
            }
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

    // 選項 value 一律用「西元年-學期」，跟後端回傳的格式一致。
    //
    // 編輯舊評價時，該評價的學年期可能已經不在「可填寫」清單裡（清單只往前推 4 學年），
    // 這時要把它補進選項，否則下拉選單會顯示空白。
    // 這個補選項刻意「只在編輯模式生效」：新增評價時 emptyForm 的預設是今年 + 第一學期
    //（現在是 115-1，期末考還沒結束、不可填），若也補進去，termOptions 載入前的
    // 那一瞬間選單就會閃出一個不該存在的選項。
    const editingTermValue = `${formData.year}-${formData.semester}`;
    const needsLegacyTerm = isEditing && !termOptions.some((o) => o.value === editingTermValue);
    const academicTermOptions = needsLegacyTerm
        ? [
              {
                  value: editingTermValue,
                  label: `${formData.year - 1911}-${t(`courseReview.academicTermSuffix.${formData.semester}`, {
                      defaultValue: formData.semester,
                  })}`,
                  adYear: formData.year,
                  semester: formData.semester,
              },
              ...termOptions,
          ]
        : termOptions;
    // 下拉的實際值。編輯模式固定顯示該評價的學年期，不受 termSelection 影響。
    //
    // 還要防住「值不在選項裡」：termOptions 是非同步取回的，在它到手之前
    // termSelection 會是 emptyForm 的今年+第一學期（現在是 115-1，不可填），
    // 直接丟給 MUI Select 會觸發 out-of-range 警告並渲染成壞掉的空值。
    // 這裡明確給 ''，畫面就是「還沒選」，等 termOptions 到了預設值 effect 會補上。
    const selectableTermValues = new Set([ALL_TERMS, ...academicTermOptions.map((o) => o.value)]);
    const rawTermFieldValue = isEditing ? editingTermValue : termSelection;
    const termFieldValue = selectableTermValues.has(rawTermFieldValue) ? rawTermFieldValue : '';
    const isScopedTerm = termSelection !== ALL_TERMS;

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
                    {/* 第一列：學年期（1/3）在左，課程名稱（2/3）在右。
                        流程是「先選學期、再搜該學期的課」，所以學期必須排在名稱之前。

                        整列包在一個 Grid item 裡再開一層 container，是為了讓下方的說明文字
                        能橫跨整列（從學年期底下開始）。若把說明文字掛回課程名稱欄位的
                        helperText，它只會從該欄位左緣起算，也就是縮排到整列的三分之一處。 */}
                    <Grid item xs={12}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    select
                                    fullWidth
                                    label={t('courseReview.form.academicTerm')}
                                    value={termFieldValue}
                                    onChange={(e) => handleAcademicTermChange(e.target.value)}
                                    disabled={isEditing}
                                >
                                    {!isEditing && (
                                        <MenuItem value={ALL_TERMS}>{t('courseReview.form.allTerms')}</MenuItem>
                                    )}
                                    {academicTermOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={8}>
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
                                // 使用者自己動手改課程名稱（而不是從選單挑）就解除鎖定，讓他能手動填課號與教授
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
                                            {/* 限定單一學期時所有選項的學年期都一樣，顯示它只是雜訊；
                                                「全部」模式才需要，因為同一門課會有多個學期並列 */}
                                            {option.professor || t('common.unknown')} · {option.courseCode}
                                            {!isScopedTerm && ` · ${courseReviewService.getAcademicTermLabel(option.year, option.semester)}`}
                                        </Typography>
                                    </Box>
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={t('courseReview.form.courseName')}
                                    required
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
                        </Grid>
                        {/* 說明文字橫跨整列，從學年期底下開始。
                            mx 1.75 = 14px，對齊 MUI helperText 的預設縮排 */}
                        {!isEditing && (
                            <FormHelperText sx={{ mx: 1.75, mt: 0.5 }}>
                                {t('courseReview.form.courseNameHelper')}
                            </FormHelperText>
                        )}
                        {!isEditing && courseSearchTruncated && (
                            <FormHelperText error sx={{ mx: 1.75 }}>
                                {t('courseReview.form.searchTruncatedHint')}
                            </FormHelperText>
                        )}
                    </Grid>
                    {/* 第二列：授課教授在前、課號在後，各佔一半 */}
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label={t('courseReview.form.professor')}
                            value={formData.professor}
                            onChange={(e) => handleChange('professor', e.target.value)}
                            disabled={isEditing || autoFilled}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label={t('courseReview.form.courseCode')}
                            value={formData.courseCode}
                            onChange={(e) => handleChange('courseCode', e.target.value)}
                            disabled={isEditing || autoFilled}
                            required
                        />
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
