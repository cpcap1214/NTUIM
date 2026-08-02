import React from 'react';
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
    Pagination,
    LinearProgress,
} from '@mui/material';
import { Search as SearchIcon, RateReview as RateReviewIcon } from '@mui/icons-material';
import ReviewCard from './ReviewCard';

// 純呈現元件：搜尋/篩選/排序/分頁的實際邏輯（不管是「所有評價」走後端分頁查詢，
// 還是「我的評價」在前端就地過濾）都交給呼叫端決定，這裡只負責畫面跟把使用者操作往上傳。
// 「所有評價」與「我的評價」共用同一個元件，只靠 variant 切換文案與空狀態行為，
// 方便維護（不用兩份幾乎一樣的搜尋列/篩選/排序/清單程式碼）。
const ReviewFeedView = ({
    reviews,
    totalCount,
    hasAnyReviews,
    searchTerm,
    onSearchChange,
    academicTermFilter,
    onAcademicTermFilterChange,
    academicTermOptions,
    professorFilter,
    onProfessorFilterChange,
    professorOptions,
    sortBy,
    onSortChange,
    page,
    pageCount,
    onPageChange,
    currentUserId,
    onEdit,
    onDelete,
    canWrite,
    onWriteReview,
    loading = false,
    variant = 'all',
}) => {
    const { t } = useTranslation();
    const isMine = variant === 'mine';

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                    {t('courseReview.totalReviewCount', { count: totalCount })}
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
                                {professorOptions.map((professor) => (
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

            {/* 查詢中只顯示一條細進度條，不抽換整個畫面，避免搜尋框在打字途中被卸載、游標跑掉 */}
            <Box sx={{ height: 4, mb: 1 }}>{loading && <LinearProgress />}</Box>

            {reviews.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <RateReviewIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        {!hasAnyReviews
                            ? t(isMine ? 'courseReview.emptyState.noReviewsMine' : 'courseReview.emptyState.noReviewsYet')
                            : t('courseReview.emptyState.noMatchingReviews')}
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: !hasAnyReviews && isMine && canWrite ? 2 : 0 }}>
                        {!hasAnyReviews
                            ? t(isMine ? 'courseReview.emptyState.shareYourExperience' : 'courseReview.emptyState.beFirst')
                            : t('courseReview.emptyState.adjustSearchOrFilter')}
                    </Typography>
                    {!hasAnyReviews && isMine && canWrite && (
                        <Button variant="contained" onClick={() => onWriteReview()}>
                            {t('courseReview.emptyState.writeFirstReview')}
                        </Button>
                    )}
                </Box>
            )}

            <Grid container spacing={2}>
                {reviews.map((review) => (
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

            {pageCount > 1 && (
                <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
                    <Pagination count={pageCount} page={page} onChange={(_, p) => onPageChange(p)} color="primary" />
                </Stack>
            )}
        </Box>
    );
};

export default ReviewFeedView;
