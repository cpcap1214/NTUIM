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

const FEED_PAGE_SIZE = 12;
const SEMESTER_RANK = { '1': 1, '2': 2, summer: 3 };

const reviewAvg = (review) =>
    (Number(review.quality) + Number(review.difficulty) + Number(review.sweetness) + Number(review.usefulness)) / 4;

const buildAcademicTermOptions = (terms) =>
    terms
        .map((term) => ({
            value: `${term.year}-${term.semester}`,
            label: courseReviewService.getAcademicTermLabel(term.year, term.semester),
            year: term.year,
            semester: term.semester,
        }))
        .sort((a, b) => b.year - a.year || SEMESTER_RANK[b.semester] - SEMESTER_RANK[a.semester]);

const CourseReviewPage = () => {
    const { t } = useTranslation();
    const { user } = useAuth();

    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('feed');

    // 「所有評價」分頁：真正走後端分頁/搜尋/排序（評價量大時不會整包抓到瀏覽器裡）
    const [feedReviews, setFeedReviews] = useState([]);
    const [feedPagination, setFeedPagination] = useState({ total: 0, page: 1, pages: 1 });
    const [feedLoading, setFeedLoading] = useState(true);
    // 只有「第一次載入完成前」才顯示整頁的載入畫面；之後每次搜尋/篩選都保持 ReviewFeedView 掛載，
    // 否則搜尋當下整個元件（含搜尋框本身）會被抽換掉，造成畫面閃爍、輸入游標跑掉
    const [feedInitialized, setFeedInitialized] = useState(false);
    const [feedPage, setFeedPage] = useState(1);
    const [feedSearchInput, setFeedSearchInput] = useState('');
    const [debouncedFeedSearch, setDebouncedFeedSearch] = useState('');
    const [feedTermFilter, setFeedTermFilter] = useState('all');
    const [feedProfessorFilter, setFeedProfessorFilter] = useState('all');
    const [feedSortBy, setFeedSortBy] = useState('latest');
    const [feedFilterOptions, setFeedFilterOptions] = useState({ academicTerms: [], professors: [] });

    // 「我的評價」分頁：單一使用者的評價數量本來就不多，不需要後端分頁，維持前端就地篩選
    const [myReviews, setMyReviews] = useState([]);
    const [mineLoading, setMineLoading] = useState(true);
    const [mineInitialized, setMineInitialized] = useState(false);
    const [mineSearchTerm, setMineSearchTerm] = useState('');
    const [mineTermFilter, setMineTermFilter] = useState('all');
    const [mineProfessorFilter, setMineProfessorFilter] = useState('all');
    const [mineSortBy, setMineSortBy] = useState('latest');

    const [writeDialogOpen, setWriteDialogOpen] = useState(false);
    const [editingReview, setEditingReview] = useState(null);

    // 搜尋框防抖 400ms 才觸發後端查詢，避免每打一個字就打一次 API
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedFeedSearch(feedSearchInput), 400);
        return () => clearTimeout(timer);
    }, [feedSearchInput]);

    // 篩選/排序/搜尋條件改變時，分頁要重置回第一頁
    useEffect(() => {
        setFeedPage(1);
    }, [debouncedFeedSearch, feedTermFilter, feedProfessorFilter, feedSortBy]);

    const fetchFeedReviews = useCallback(async () => {
        setFeedLoading(true);
        setError('');
        try {
            const params = { page: feedPage, limit: FEED_PAGE_SIZE, sortBy: feedSortBy };
            if (debouncedFeedSearch.trim()) params.search = debouncedFeedSearch.trim();
            if (feedProfessorFilter !== 'all') params.professor = feedProfessorFilter;
            if (feedTermFilter !== 'all') {
                const [termYear, termSemester] = feedTermFilter.split('-');
                params.year = termYear;
                params.semester = termSemester;
            }
            const res = await courseReviewService.getReviews(params);
            setFeedReviews(res.data || []);
            setFeedPagination(res.pagination || { total: 0, page: 1, pages: 1 });
        } catch (err) {
            setError(translateApiError(err, t('errors.FETCH_FAILED')));
        } finally {
            setFeedLoading(false);
            setFeedInitialized(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedPage, feedSortBy, debouncedFeedSearch, feedProfessorFilter, feedTermFilter]);

    useEffect(() => {
        fetchFeedReviews();
    }, [fetchFeedReviews]);

    useEffect(() => {
        courseReviewService
            .getFilterOptions()
            .then((res) => setFeedFilterOptions(res || { academicTerms: [], professors: [] }))
            .catch(() => {});
    }, []);

    const loadMyReviews = useCallback(async () => {
        if (!user) {
            setMyReviews([]);
            setMineLoading(false);
            setMineInitialized(true);
            return;
        }
        setMineLoading(true);
        try {
            const mine = await courseReviewService.getMyReviews();
            setMyReviews(Array.isArray(mine) ? mine : []);
        } catch (err) {
            setError(translateApiError(err, t('errors.FETCH_FAILED')));
        } finally {
            setMineLoading(false);
            setMineInitialized(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        loadMyReviews();
    }, [loadMyReviews]);

    // GET /my-reviews 沒有 include reviewer，這裡自己補上目前使用者的資料才能正確顯示名字
    const enrichedMyReviews = useMemo(() => {
        if (!user) return [];
        return myReviews.map((review) => ({
            ...review,
            reviewer: { username: user.username, fullName: user.fullName },
        }));
    }, [myReviews, user]);

    const mineAcademicTermOptions = useMemo(() => {
        const map = new Map();
        enrichedMyReviews.forEach((r) => {
            const value = `${r.year}-${r.semester}`;
            if (!map.has(value)) map.set(value, { year: r.year, semester: r.semester });
        });
        return buildAcademicTermOptions([...map.values()]);
    }, [enrichedMyReviews]);

    const mineProfessorOptions = useMemo(
        () => [...new Set(enrichedMyReviews.map((r) => r.professor))].sort(),
        [enrichedMyReviews]
    );

    const mineFilteredReviews = useMemo(() => {
        const keyword = mineSearchTerm.trim().toLowerCase();
        const list = enrichedMyReviews.filter((review) => {
            const matchesKeyword =
                !keyword ||
                review.courseName.toLowerCase().includes(keyword) ||
                review.courseCode.toLowerCase().includes(keyword) ||
                review.professor.toLowerCase().includes(keyword);
            const matchesTerm = mineTermFilter === 'all' || `${review.year}-${review.semester}` === mineTermFilter;
            const matchesProfessor = mineProfessorFilter === 'all' || review.professor === mineProfessorFilter;
            return matchesKeyword && matchesTerm && matchesProfessor;
        });

        return [...list].sort((a, b) => {
            switch (mineSortBy) {
                case 'highest':
                    return reviewAvg(b) - reviewAvg(a);
                case 'lowest':
                    return reviewAvg(a) - reviewAvg(b);
                case 'latest':
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });
    }, [enrichedMyReviews, mineSearchTerm, mineTermFilter, mineProfessorFilter, mineSortBy]);

    const feedAcademicTermOptions = useMemo(
        () => buildAcademicTermOptions(feedFilterOptions.academicTerms),
        [feedFilterOptions]
    );

    const canWrite = !!user;

    const handleWriteReview = () => {
        setEditingReview(null);
        setWriteDialogOpen(true);
    };

    const handleEditReview = (review) => {
        setEditingReview(review);
        setWriteDialogOpen(true);
    };

    const refreshAfterChange = async () => {
        await Promise.all([fetchFeedReviews(), loadMyReviews()]);
    };

    const handleDeleteReview = async (reviewId) => {
        try {
            await courseReviewService.deleteReview(reviewId);
            await refreshAfterChange();
        } catch (err) {
            setError(translateApiError(err, t('errors.DELETE_FAILED')));
        }
    };

    const handleSaved = async () => {
        setWriteDialogOpen(false);
        setEditingReview(null);
        await refreshAfterChange();
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

            {viewMode === 'feed' && (
                !feedInitialized ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="body2" color="text.secondary">
                            {t('courseReview.loadingReviews')}
                        </Typography>
                    </Box>
                ) : (
                    <ReviewFeedView
                        reviews={feedReviews}
                        totalCount={feedPagination.total}
                        hasAnyReviews={feedFilterOptions.professors.length > 0}
                        searchTerm={feedSearchInput}
                        onSearchChange={setFeedSearchInput}
                        academicTermFilter={feedTermFilter}
                        onAcademicTermFilterChange={setFeedTermFilter}
                        academicTermOptions={feedAcademicTermOptions}
                        professorFilter={feedProfessorFilter}
                        onProfessorFilterChange={setFeedProfessorFilter}
                        professorOptions={feedFilterOptions.professors}
                        sortBy={feedSortBy}
                        onSortChange={setFeedSortBy}
                        page={feedPage}
                        pageCount={feedPagination.pages}
                        onPageChange={setFeedPage}
                        currentUserId={user?.id}
                        onEdit={handleEditReview}
                        onDelete={handleDeleteReview}
                        canWrite={canWrite}
                        onWriteReview={handleWriteReview}
                        loading={feedLoading}
                        variant="all"
                    />
                )
            )}

            {viewMode === 'mine' && user && (
                !mineInitialized ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="body2" color="text.secondary">
                            {t('courseReview.loadingReviews')}
                        </Typography>
                    </Box>
                ) : (
                    <ReviewFeedView
                        reviews={mineFilteredReviews}
                        totalCount={mineFilteredReviews.length}
                        hasAnyReviews={enrichedMyReviews.length > 0}
                        searchTerm={mineSearchTerm}
                        onSearchChange={setMineSearchTerm}
                        academicTermFilter={mineTermFilter}
                        onAcademicTermFilterChange={setMineTermFilter}
                        academicTermOptions={mineAcademicTermOptions}
                        professorFilter={mineProfessorFilter}
                        onProfessorFilterChange={setMineProfessorFilter}
                        professorOptions={mineProfessorOptions}
                        sortBy={mineSortBy}
                        onSortChange={setMineSortBy}
                        page={1}
                        pageCount={1}
                        onPageChange={() => {}}
                        currentUserId={user.id}
                        onEdit={handleEditReview}
                        onDelete={handleDeleteReview}
                        canWrite
                        onWriteReview={handleWriteReview}
                        loading={mineLoading}
                        variant="mine"
                    />
                )
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
