import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, Stack, ToggleButton, ToggleButtonGroup, Alert } from '@mui/material';
import {
    ViewModule as CoursesIcon,
    DynamicFeed as FeedIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import courseReviewService from '../services/courseReviewService';
import CourseListView from '../components/courseReview/CourseListView';
import ReviewFeedView from '../components/courseReview/ReviewFeedView';
import MyReviewsView from '../components/courseReview/MyReviewsView';
import CourseDetailDialog from '../components/courseReview/CourseDetailDialog';
import WriteReviewDialog from '../components/courseReview/WriteReviewDialog';

const average = (list, field) => list.reduce((sum, item) => sum + Number(item[field] || 0), 0) / list.length;

const CourseReviewPage = () => {
    const { user } = useAuth();

    const [reviews, setReviews] = useState([]);
    const [myReviews, setMyReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [viewMode, setViewMode] = useState('courses');

    // 課程總覽的搜尋/排序
    const [courseSearchTerm, setCourseSearchTerm] = useState('');
    const [courseSortBy, setCourseSortBy] = useState('latest');

    // 動態牆的搜尋/篩選/排序
    const [feedSearchTerm, setFeedSearchTerm] = useState('');
    const [semesterFilter, setSemesterFilter] = useState('all');
    const [professorFilter, setProfessorFilter] = useState('all');
    const [feedSortBy, setFeedSortBy] = useState('latest');

    const [selectedCourse, setSelectedCourse] = useState(null);
    const [writeDialogOpen, setWriteDialogOpen] = useState(false);
    const [editingReview, setEditingReview] = useState(null);
    const [initialCourse, setInitialCourse] = useState(null);

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
            setError(err.error || '載入課程評價失敗');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const courseGroups = useMemo(() => {
        const map = new Map();
        reviews.forEach((review) => {
            if (!map.has(review.courseCode)) {
                map.set(review.courseCode, {
                    courseCode: review.courseCode,
                    courseName: review.courseName,
                    reviews: [],
                });
            }
            map.get(review.courseCode).reviews.push(review);
        });

        return [...map.values()].map((group) => {
            const avgQuality = average(group.reviews, 'quality');
            const avgDifficulty = average(group.reviews, 'difficulty');
            const avgSweetness = average(group.reviews, 'sweetness');
            const avgUsefulness = average(group.reviews, 'usefulness');
            return {
                ...group,
                count: group.reviews.length,
                avgQuality,
                avgDifficulty,
                avgSweetness,
                avgUsefulness,
                // 只給「評分最高」排序用，不會被渲染成任何畫面上的指標
                avgOfFour: (avgQuality + avgDifficulty + avgSweetness + avgUsefulness) / 4,
                professors: [...new Set(group.reviews.map((r) => r.professor))],
                latestCreatedAt: group.reviews.reduce(
                    (latest, r) => (new Date(r.created_at) > new Date(latest) ? r.created_at : latest),
                    group.reviews[0].created_at
                ),
            };
        });
    }, [reviews]);

    // 課程詳情彈窗開著時，評價異動後同步刷新裡面顯示的資料
    useEffect(() => {
        setSelectedCourse((prev) => {
            if (!prev) return prev;
            return courseGroups.find((g) => g.courseCode === prev.courseCode) || null;
        });
    }, [courseGroups]);

    const canWrite = !!user;

    const handleWriteReview = (course) => {
        setEditingReview(null);
        setInitialCourse(course || null);
        setWriteDialogOpen(true);
    };

    const handleEditReview = (review) => {
        setEditingReview(review);
        setInitialCourse(null);
        setWriteDialogOpen(true);
    };

    const handleDeleteReview = async (reviewId) => {
        try {
            await courseReviewService.deleteReview(reviewId);
            await loadData();
        } catch (err) {
            setError(err.error || '刪除評價失敗');
        }
    };

    const handleSaved = async () => {
        setWriteDialogOpen(false);
        setEditingReview(null);
        setInitialCourse(null);
        await loadData();
    };

    const viewOptions = [
        { value: 'courses', label: '課程總覽', icon: <CoursesIcon fontSize="small" sx={{ mr: 0.5 }} /> },
        { value: 'feed', label: '動態牆', icon: <FeedIcon fontSize="small" sx={{ mr: 0.5 }} /> },
    ];
    if (user) {
        viewOptions.push({ value: 'mine', label: '我的評價', icon: <PersonIcon fontSize="small" sx={{ mr: 0.5 }} /> });
    }

    return (
        <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 3 }}>
                <Box>
                    <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                        課程評價
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {loading ? '載入中…' : `共 ${reviews.length} 則評價 · 涵蓋 ${courseGroups.length} 門課程`}
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
                        載入課程評價中…
                    </Typography>
                </Box>
            )}

            {!loading && viewMode === 'courses' && (
                <CourseListView
                    courseGroups={courseGroups}
                    searchTerm={courseSearchTerm}
                    onSearchChange={setCourseSearchTerm}
                    sortBy={courseSortBy}
                    onSortChange={setCourseSortBy}
                    onSelectCourse={setSelectedCourse}
                />
            )}

            {!loading && viewMode === 'feed' && (
                <ReviewFeedView
                    reviews={reviews}
                    searchTerm={feedSearchTerm}
                    onSearchChange={setFeedSearchTerm}
                    semesterFilter={semesterFilter}
                    onSemesterFilterChange={setSemesterFilter}
                    professorFilter={professorFilter}
                    onProfessorFilterChange={setProfessorFilter}
                    sortBy={feedSortBy}
                    onSortChange={setFeedSortBy}
                    currentUserId={user?.id}
                    onEdit={handleEditReview}
                    onDelete={handleDeleteReview}
                    canWrite={canWrite}
                    onWriteReview={handleWriteReview}
                />
            )}

            {!loading && viewMode === 'mine' && user && (
                <MyReviewsView
                    myReviews={myReviews}
                    currentUser={user}
                    onEdit={handleEditReview}
                    onDelete={handleDeleteReview}
                    onWriteReview={handleWriteReview}
                />
            )}

            <CourseDetailDialog
                open={!!selectedCourse}
                course={selectedCourse}
                currentUserId={user?.id}
                canWrite={canWrite}
                onClose={() => setSelectedCourse(null)}
                onWriteReview={handleWriteReview}
                onEditReview={handleEditReview}
                onDeleteReview={handleDeleteReview}
            />

            <WriteReviewDialog
                open={writeDialogOpen}
                onClose={() => setWriteDialogOpen(false)}
                review={editingReview}
                initialCourse={initialCourse}
                onSaved={handleSaved}
            />
        </Box>
    );
};

export default CourseReviewPage;
