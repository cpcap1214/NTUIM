import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Stack, ToggleButton, ToggleButtonGroup, Alert } from '@mui/material';
import {
    DynamicFeed as FeedIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import courseReviewService from '../services/courseReviewService';
import { translateApiError } from '../utils';
import ReviewFeedView from '../components/courseReview/ReviewFeedView';
import WriteReviewDialog from '../components/courseReview/WriteReviewDialog';

const CourseReviewPage = () => {
    const { t } = useTranslation();
    const { user } = useAuth();

    const [reviews, setReviews] = useState([]);
    const [myReviews, setMyReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [viewMode, setViewMode] = useState('feed');

    // 所有評價分頁的搜尋/篩選/排序
    const [feedSearchTerm, setFeedSearchTerm] = useState('');
    const [feedTermFilter, setFeedTermFilter] = useState('all');
    const [feedProfessorFilter, setFeedProfessorFilter] = useState('all');
    const [feedSortBy, setFeedSortBy] = useState('latest');

    // 我的評價分頁的搜尋/篩選/排序（跟所有評價分頁互相獨立）
    const [mineSearchTerm, setMineSearchTerm] = useState('');
    const [mineTermFilter, setMineTermFilter] = useState('all');
    const [mineProfessorFilter, setMineProfessorFilter] = useState('all');
    const [mineSortBy, setMineSortBy] = useState('latest');

    const [writeDialogOpen, setWriteDialogOpen] = useState(false);
    const [editingReview, setEditingReview] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await courseReviewService.getReviews({ limit: 10000 });
            setReviews(res.data || []);

            if (user) {
                const mine = await courseReviewService.getMyReviews();
                setMyReviews(Array.isArray(mine) ? mine : []);
            } else {
                setMyReviews([]);
            }
        } catch (err) {
            setError(translateApiError(err, t('errors.FETCH_FAILED')));
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // GET /my-reviews 沒有 include reviewer，這裡自己補上目前使用者的資料才能正確顯示名字
    const enrichedMyReviews = useMemo(() => {
        if (!user) return [];
        return myReviews.map((review) => ({
            ...review,
            reviewer: { username: user.username, fullName: user.fullName },
        }));
    }, [myReviews, user]);

    const canWrite = !!user;

    const handleWriteReview = () => {
        setEditingReview(null);
        setWriteDialogOpen(true);
    };

    const handleEditReview = (review) => {
        setEditingReview(review);
        setWriteDialogOpen(true);
    };

    const handleDeleteReview = async (reviewId) => {
        try {
            await courseReviewService.deleteReview(reviewId);
            await loadData();
        } catch (err) {
            setError(translateApiError(err, t('errors.DELETE_FAILED')));
        }
    };

    const handleSaved = async () => {
        setWriteDialogOpen(false);
        setEditingReview(null);
        await loadData();
    };

    const viewOptions = [
        { value: 'feed', label: t('courseReview.viewMode.feed'), icon: <FeedIcon fontSize="small" sx={{ mr: 0.5 }} /> },
    ];
    if (user) {
        viewOptions.push({ value: 'mine', label: t('courseReview.viewMode.mine'), icon: <PersonIcon fontSize="small" sx={{ mr: 0.5 }} /> });
    }

    return (
        <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 0.5 }}>
                <Box>
                    <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {t('courseReview.pageTitle')}
                    </Typography>
                </Box>

                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, v) => v && setViewMode(v)}
                    size="small"
                    sx={{
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        '& .MuiToggleButton-root': {
                            border: 0,
                            px: 1.5,
                            color: 'text.secondary',
                        },
                    }}
                >
                    {viewOptions.map((option) => (
                        <ToggleButton key={option.value} value={option.value}>
                            {option.icon}
                            {option.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {loading && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="body2" color="text.secondary">
                        {t('courseReview.loadingReviews')}
                    </Typography>
                </Box>
            )}

            {!loading && viewMode === 'feed' && (
                <ReviewFeedView
                    reviews={reviews}
                    searchTerm={feedSearchTerm}
                    onSearchChange={setFeedSearchTerm}
                    academicTermFilter={feedTermFilter}
                    onAcademicTermFilterChange={setFeedTermFilter}
                    professorFilter={feedProfessorFilter}
                    onProfessorFilterChange={setFeedProfessorFilter}
                    sortBy={feedSortBy}
                    onSortChange={setFeedSortBy}
                    currentUserId={user?.id}
                    onEdit={handleEditReview}
                    onDelete={handleDeleteReview}
                    canWrite={canWrite}
                    onWriteReview={handleWriteReview}
                    variant="all"
                />
            )}

            {!loading && viewMode === 'mine' && user && (
                <ReviewFeedView
                    reviews={enrichedMyReviews}
                    searchTerm={mineSearchTerm}
                    onSearchChange={setMineSearchTerm}
                    academicTermFilter={mineTermFilter}
                    onAcademicTermFilterChange={setMineTermFilter}
                    professorFilter={mineProfessorFilter}
                    onProfessorFilterChange={setMineProfessorFilter}
                    sortBy={mineSortBy}
                    onSortChange={setMineSortBy}
                    currentUserId={user.id}
                    onEdit={handleEditReview}
                    onDelete={handleDeleteReview}
                    canWrite
                    onWriteReview={handleWriteReview}
                    variant="mine"
                />
            )}

            <WriteReviewDialog
                open={writeDialogOpen}
                onClose={() => setWriteDialogOpen(false)}
                review={editingReview}
                onSaved={handleSaved}
            />
        </Box>
    );
};

export default CourseReviewPage;
