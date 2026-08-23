import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    Grid,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import RateReviewIcon from '@mui/icons-material/RateReview';
import SearchIcon from '@mui/icons-material/Search';
import ReviewCard from '../courseReview/ReviewCard';
import courseReviewService from '../../services/courseReviewService';
import { translateApiError } from '../../utils';

// 學期在同一學年內的先後：上學期 → 下學期 → 暑期
const TERM_RANK = { 1: 1, 2: 2, summer: 3 };

// 後台的「課程評價審核」分頁。原本是 AdminPage.js 裡的一段 activeTab === 5。
//
// 狀態篩選（pending / approved / rejected / all）會回後端重抓；
// 關鍵字、學期、教授三個條件則在前端疊加過濾——一次審核批次的資料量不大，
// 每動一個條件就多打一次 API 並不划算。
const CourseReviewAdminPanel = ({ onError, onSuccess }) => {
    const { t } = useTranslation();
    const [courseReviews, setCourseReviews] = useState([]);
    const [courseReviewSearchTerm, setCourseReviewSearchTerm] = useState('');
    const [courseReviewFilter, setCourseReviewFilter] = useState('pending');
    const [courseReviewTermFilter, setCourseReviewTermFilter] = useState('all');
    const [courseReviewProfessorFilter, setCourseReviewProfessorFilter] = useState('all');
    const [courseReviewLoading, setCourseReviewLoading] = useState(false);
    const [courseReviewRejectDialog, setCourseReviewRejectDialog] = useState(false);
    const [reviewToReject, setReviewToReject] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [courseReviewDeleteDialog, setCourseReviewDeleteDialog] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState(null);

    const reportRef = useRef({ onError, onSuccess });
    reportRef.current = { onError, onSuccess };

    const fetchCourseReviews = useCallback(
        async (filter) => {
            try {
                setCourseReviewLoading(true);
                const result = await courseReviewService.getAdminReviews(
                    filter === 'all' ? undefined : filter,
                );
                setCourseReviews(result.data || []);
            } catch (err) {
                console.error('取得課程評價錯誤:', err);
                reportRef.current.onError(translateApiError(err, t('errors.FETCH_LIST_FAILED')));
            } finally {
                setCourseReviewLoading(false);
            }
        },
        [t],
    );

    // 狀態篩選變更就重抓（含首次掛載）
    useEffect(() => {
        fetchCourseReviews(courseReviewFilter);
    }, [fetchCourseReviews, courseReviewFilter]);

    const handleApproveCourseReview = async (review) => {
        try {
            await courseReviewService.reviewStatus(review.id, { status: 'approved' });
            await fetchCourseReviews(courseReviewFilter);
            onSuccess(t('courseReview.admin.approveSuccess'));
        } catch (err) {
            onError(translateApiError(err, t('courseReview.admin.approveFailed')));
        }
    };

    const openRejectDialog = (review) => {
        setReviewToReject(review);
        setRejectReason('');
        setCourseReviewRejectDialog(true);
    };

    const handleRejectCourseReview = async () => {
        if (!rejectReason.trim()) return;
        try {
            await courseReviewService.reviewStatus(reviewToReject.id, {
                status: 'rejected',
                rejectReason: rejectReason.trim(),
            });
            setCourseReviewRejectDialog(false);
            setReviewToReject(null);
            await fetchCourseReviews(courseReviewFilter);
            onSuccess(t('courseReview.admin.rejectSuccess'));
        } catch (err) {
            onError(translateApiError(err, t('courseReview.admin.rejectFailed')));
        }
    };

    const handleDeleteCourseReviewClick = (review) => {
        setReviewToDelete(review);
        setCourseReviewDeleteDialog(true);
    };

    const handleDeleteCourseReviewConfirm = async () => {
        if (!reviewToDelete) return;
        try {
            await courseReviewService.deleteReview(reviewToDelete.id);
            await fetchCourseReviews(courseReviewFilter);
            onSuccess(t('courseReview.admin.deleteSuccess'));
        } catch (err) {
            onError(translateApiError(err, t('courseReview.admin.deleteFailed')));
        } finally {
            setCourseReviewDeleteDialog(false);
            setReviewToDelete(null);
        }
    };

    const pendingCourseReviewCount = courseReviews.filter((r) => r.status === 'pending').length;

    // 篩選選單的選項由目前抓回來的資料推導，不另外打 API——
    // 選單只需要反映「這批評價裡實際存在哪些學期／教授」
    const courseReviewTermOptions = [
        ...new Map(
            courseReviews.map((r) => [
                `${r.year}-${r.semester}`,
                {
                    value: `${r.year}-${r.semester}`,
                    label: courseReviewService.getAcademicTermLabel(r.year, r.semester),
                    year: r.year,
                    semester: r.semester,
                },
            ]),
        ).values(),
    ].sort((a, b) => b.year - a.year || TERM_RANK[b.semester] - TERM_RANK[a.semester]);

    const courseReviewProfessorOptions = [
        ...new Set(courseReviews.map((r) => r.professor).filter(Boolean)),
    ].sort();

    const filteredCourseReviews = courseReviews.filter((review) => {
        const keyword = courseReviewSearchTerm.toLowerCase();
        const matchesKeyword =
            review.courseName.toLowerCase().includes(keyword) ||
            review.courseCode.toLowerCase().includes(keyword) ||
            (review.professor && review.professor.toLowerCase().includes(keyword));
        const matchesTerm =
            courseReviewTermFilter === 'all' ||
            `${review.year}-${review.semester}` === courseReviewTermFilter;
        const matchesProfessor =
            courseReviewProfessorFilter === 'all' ||
            review.professor === courseReviewProfessorFilter;
        return matchesKeyword && matchesTerm && matchesProfessor;
    });

    return (
        <>
            <Paper sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                    {t('courseReview.admin.title')}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {t('courseReview.admin.description')}
                </Typography>

                {/* 搜尋欄與篩選 */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                placeholder={t('courseReview.admin.searchPlaceholder')}
                                value={courseReviewSearchTerm}
                                onChange={(e) => setCourseReviewSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>{t('courseReview.form.academicTerm')}</InputLabel>
                                <Select
                                    value={courseReviewTermFilter}
                                    label={t('courseReview.form.academicTerm')}
                                    onChange={(e) => setCourseReviewTermFilter(e.target.value)}
                                >
                                    <MenuItem value="all">{t('common.all')}</MenuItem>
                                    {courseReviewTermOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>{t('courseReview.professorFilterLabel')}</InputLabel>
                                <Select
                                    value={courseReviewProfessorFilter}
                                    label={t('courseReview.professorFilterLabel')}
                                    onChange={(e) => setCourseReviewProfessorFilter(e.target.value)}
                                >
                                    <MenuItem value="all">{t('common.all')}</MenuItem>
                                    {courseReviewProfessorOptions.map((professor) => (
                                        <MenuItem key={professor} value={professor}>
                                            {professor}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Paper>

                <ToggleButtonGroup
                    value={courseReviewFilter}
                    exclusive
                    size="small"
                    onChange={(_, v) => v && setCourseReviewFilter(v)}
                    sx={{ mb: 3 }}
                >
                    <ToggleButton value="all">{t('common.all')}</ToggleButton>
                    <ToggleButton value="pending">
                        {t('courseReview.status.pending')}
                        {pendingCourseReviewCount > 0 && (
                            <Chip
                                label={pendingCourseReviewCount}
                                size="small"
                                color="warning"
                                sx={{ ml: 1 }}
                            />
                        )}
                    </ToggleButton>
                    <ToggleButton value="approved">
                        {t('courseReview.status.approved')}
                    </ToggleButton>
                    <ToggleButton value="rejected">
                        {t('courseReview.status.rejected')}
                    </ToggleButton>
                </ToggleButtonGroup>

                {courseReviewLoading && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="text.secondary">
                            {t('common.loading')}
                        </Typography>
                    </Box>
                )}

                {!courseReviewLoading && filteredCourseReviews.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <RateReviewIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            {courseReviews.length === 0
                                ? t('courseReview.admin.noMatchingReviews')
                                : t('courseReview.admin.noMatchingSearchReviews')}
                        </Typography>
                    </Box>
                )}

                {!courseReviewLoading && filteredCourseReviews.length > 0 && (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {t('courseReview.admin.countLabel', {
                                count: filteredCourseReviews.length,
                            })}
                        </Typography>
                        <Grid container spacing={2}>
                            {filteredCourseReviews.map((review) => (
                                <Grid item xs={12} md={6} key={review.id}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            height: '100%',
                                        }}
                                    >
                                        <ReviewCard
                                            review={review}
                                            showStatus
                                            hideReviewedBy
                                            currentUserId={null}
                                            onEdit={() => {}}
                                            onDelete={() => {}}
                                        />
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            flexWrap="wrap"
                                            sx={{ mt: 1, rowGap: 1 }}
                                        >
                                            <Stack spacing={0.25}>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {t('courseReview.admin.submittedAt', {
                                                        time: review.created_at
                                                            ? new Date(
                                                                  review.created_at,
                                                              ).toLocaleString('zh-TW')
                                                            : t('common.unknown'),
                                                    })}
                                                </Typography>
                                                {review.reviewedByUser && (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {t('courseReview.reviewedBy', {
                                                            name: review.reviewedByUser.fullName,
                                                        })}
                                                    </Typography>
                                                )}
                                            </Stack>
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                flexWrap="wrap"
                                                sx={{ rowGap: 1 }}
                                            >
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    startIcon={<DeleteIcon />}
                                                    onClick={() =>
                                                        handleDeleteCourseReviewClick(review)
                                                    }
                                                >
                                                    {t('common.delete')}
                                                </Button>
                                                {review.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="outlined"
                                                            color="warning"
                                                            startIcon={<CancelIcon />}
                                                            onClick={() => openRejectDialog(review)}
                                                        >
                                                            {t('common.reject')}
                                                        </Button>
                                                        <Button
                                                            variant="contained"
                                                            color="success"
                                                            startIcon={<CheckCircleIcon />}
                                                            onClick={() =>
                                                                handleApproveCourseReview(review)
                                                            }
                                                        >
                                                            {t('common.approve')}
                                                        </Button>
                                                    </>
                                                )}
                                            </Stack>
                                        </Stack>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}
            </Paper>

            {/* 拒絕課程評價對話框 */}
            <Dialog
                open={courseReviewRejectDialog}
                onClose={() => setCourseReviewRejectDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{t('courseReview.admin.rejectDialogTitle')}</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        autoFocus
                        label={t('courseReview.admin.rejectReasonInput')}
                        required
                        sx={{ mt: 1 }}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        helperText={t('courseReview.admin.rejectReasonHelper')}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCourseReviewRejectDialog(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleRejectCourseReview}
                        disabled={!rejectReason.trim()}
                    >
                        {t('courseReview.admin.confirmReject')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 刪除課程評價對話框 */}
            <Dialog
                open={courseReviewDeleteDialog}
                onClose={() => setCourseReviewDeleteDialog(false)}
            >
                <DialogTitle>{t('courseReview.admin.deleteDialogTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('courseReview.admin.deleteDialogBody')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCourseReviewDeleteDialog(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleDeleteCourseReviewConfirm}
                        color="error"
                        variant="contained"
                    >
                        {t('courseReview.admin.confirmDelete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default CourseReviewAdminPanel;
