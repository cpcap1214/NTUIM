import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Grid,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Stack,
    Typography,
    Button,
} from '@mui/material';
import { Search as SearchIcon, RateReview as RateReviewIcon } from '@mui/icons-material';
import ReviewCard from './ReviewCard';
import courseReviewService from '../../services/courseReviewService';

// 純粹拿來排序用的四指標平均，不會被渲染成任何畫面上的指標
const reviewAvg = (review) =>
    (Number(review.quality) + Number(review.difficulty) + Number(review.sweetness) + Number(review.usefulness)) / 4;

// 學年期由新到舊排序：同一民國學年內，暑期在下學期之後、下學期在上學期之後
const SEMESTER_RANK = { '1': 1, '2': 2, summer: 3 };

// 「所有評價」與「我的評價」共用同一個元件，只靠 variant 切換文案與空狀態行為，
// 方便維護（不用兩份幾乎一樣的搜尋列/篩選/排序/清單程式碼）。
const ReviewFeedView = ({
    reviews,
    searchTerm,
    onSearchChange,
    academicTermFilter,
    onAcademicTermFilterChange,
    professorFilter,
    onProfessorFilterChange,
    sortBy,
    onSortChange,
    currentUserId,
    onEdit,
    onDelete,
    canWrite,
    onWriteReview,
    variant = 'all',
}) => {
    const { t } = useTranslation();
    const isMine = variant === 'mine';

    const professors = useMemo(
        () => [...new Set(reviews.map((r) => r.professor))].sort(),
        [reviews]
    );

    const academicTermOptions = useMemo(() => {
        const map = new Map();
        reviews.forEach((review) => {
            const value = `${review.year}-${review.semester}`;
            if (!map.has(value)) {
                map.set(value, {
                    value,
                    label: courseReviewService.getAcademicTermLabel(review.year, review.semester),
                    year: review.year,
                    semester: review.semester,
                });
            }
        });
        return [...map.values()].sort(
            (a, b) => b.year - a.year || SEMESTER_RANK[b.semester] - SEMESTER_RANK[a.semester]
        );
    }, [reviews]);

    const filtered = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        const list = reviews.filter((review) => {
            const matchesKeyword =
                !keyword ||
                review.courseName.toLowerCase().includes(keyword) ||
                review.courseCode.toLowerCase().includes(keyword) ||
                review.professor.toLowerCase().includes(keyword);
            const matchesTerm = academicTermFilter === 'all' || `${review.year}-${review.semester}` === academicTermFilter;
            const matchesProfessor = professorFilter === 'all' || review.professor === professorFilter;
            return matchesKeyword && matchesTerm && matchesProfessor;
        });

        return [...list].sort((a, b) => {
            switch (sortBy) {
                case 'highest':
                    return reviewAvg(b) - reviewAvg(a);
                case 'lowest':
                    return reviewAvg(a) - reviewAvg(b);
                case 'latest':
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });
    }, [reviews, searchTerm, academicTermFilter, professorFilter, sortBy]);

    return (
        <Box>
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderColor: 'divider' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                        <TextField
                            fullWidth
                            placeholder={t('courseReview.searchPlaceholder.feed')}
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('courseReview.form.academicTerm')}</InputLabel>
                            <Select
                                value={academicTermFilter}
                                label={t('courseReview.form.academicTerm')}
                                onChange={(e) => onAcademicTermFilterChange(e.target.value)}
                            >
                                <MenuItem value="all">{t('common.all')}</MenuItem>
                                {academicTermOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('courseReview.professorFilterLabel')}</InputLabel>
                            <Select value={professorFilter} label={t('courseReview.professorFilterLabel')} onChange={(e) => onProfessorFilterChange(e.target.value)}>
                                <MenuItem value="all">{t('common.all')}</MenuItem>
                                {professors.map((professor) => (
                                    <MenuItem key={professor} value={professor}>
                                        {professor}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('common.sort')}</InputLabel>
                            <Select value={sortBy} label={t('common.sort')} onChange={(e) => onSortChange(e.target.value)}>
                                <MenuItem value="latest">{t('courseReview.sort.latestPost')}</MenuItem>
                                <MenuItem value="highest">{t('courseReview.sort.ratingHighest')}</MenuItem>
                                <MenuItem value="lowest">{t('courseReview.sort.ratingLowest')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    {t('courseReview.totalReviewCount', { count: filtered.length })}
                </Typography>
                {canWrite ? (
                    <Button variant="contained" size="small" onClick={() => onWriteReview()}>
                        {t('courseReview.writeReview')}
                    </Button>
                ) : (
                    <Typography variant="caption" color="text.disabled">
                        {t('courseReview.emptyState.loginToWrite')}
                    </Typography>
                )}
            </Stack>

            {filtered.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <RateReviewIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        {reviews.length === 0
                            ? t(isMine ? 'courseReview.emptyState.noReviewsMine' : 'courseReview.emptyState.noReviewsYet')
                            : t('courseReview.emptyState.noMatchingReviews')}
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: reviews.length === 0 && isMine && canWrite ? 2 : 0 }}>
                        {reviews.length === 0
                            ? t(isMine ? 'courseReview.emptyState.shareYourExperience' : 'courseReview.emptyState.beFirst')
                            : t('courseReview.emptyState.adjustSearchOrFilter')}
                    </Typography>
                    {reviews.length === 0 && isMine && canWrite && (
                        <Button variant="contained" onClick={() => onWriteReview()}>
                            {t('courseReview.emptyState.writeFirstReview')}
                        </Button>
                    )}
                </Box>
            )}

            <Grid container spacing={2}>
                {filtered.map((review) => (
                    <Grid item xs={12} md={6} key={review.id}>
                        <ReviewCard
                            review={review}
                            showStatus={isMine}
                            currentUserId={currentUserId}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default ReviewFeedView;
