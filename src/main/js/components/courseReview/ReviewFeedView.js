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

// 純粹拿來排序用的四指標平均，不會被渲染成任何畫面上的指標
const reviewAvg = (review) =>
    (Number(review.quality) + Number(review.difficulty) + Number(review.sweetness) + Number(review.usefulness)) / 4;

const ReviewFeedView = ({
    reviews,
    searchTerm,
    onSearchChange,
    semesterFilter,
    onSemesterFilterChange,
    professorFilter,
    onProfessorFilterChange,
    sortBy,
    onSortChange,
    currentUserId,
    onEdit,
    onDelete,
    canWrite,
    onWriteReview,
}) => {
    const { t } = useTranslation();
    const professors = useMemo(
        () => [...new Set(reviews.map((r) => r.professor))].sort(),
        [reviews]
    );

    const filtered = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        const list = reviews.filter((review) => {
            const matchesKeyword =
                !keyword ||
                review.courseName.toLowerCase().includes(keyword) ||
                review.courseCode.toLowerCase().includes(keyword) ||
                review.professor.toLowerCase().includes(keyword);
            const matchesSemester = semesterFilter === 'all' || review.semester === semesterFilter;
            const matchesProfessor = professorFilter === 'all' || review.professor === professorFilter;
            return matchesKeyword && matchesSemester && matchesProfessor;
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
    }, [reviews, searchTerm, semesterFilter, professorFilter, sortBy]);

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
                            <InputLabel>{t('courseReview.form.semester')}</InputLabel>
                            <Select value={semesterFilter} label={t('courseReview.form.semester')} onChange={(e) => onSemesterFilterChange(e.target.value)}>
                                <MenuItem value="all">{t('common.all')}</MenuItem>
                                <MenuItem value="1">{t('courseReview.semester.1')}</MenuItem>
                                <MenuItem value="2">{t('courseReview.semester.2')}</MenuItem>
                                <MenuItem value="summer">{t('courseReview.semester.summer')}</MenuItem>
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
                        {reviews.length === 0 ? t('courseReview.emptyState.noReviewsYet') : t('courseReview.emptyState.noMatchingReviews')}
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                        {reviews.length === 0 ? t('courseReview.emptyState.beFirst') : t('courseReview.emptyState.adjustSearchOrFilter')}
                    </Typography>
                </Box>
            )}

            <Stack spacing={2}>
                {filtered.map((review) => (
                    <ReviewCard
                        key={review.id}
                        review={review}
                        showCourse
                        currentUserId={currentUserId}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </Stack>
        </Box>
    );
};

export default ReviewFeedView;
