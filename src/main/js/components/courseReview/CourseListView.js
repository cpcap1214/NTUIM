import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Stack,
    Chip,
    Divider,
} from '@mui/material';
import { Search as SearchIcon, MenuBook as MenuBookIcon, RateReview as RateReviewIcon } from '@mui/icons-material';
import RatingDisplay from './RatingDisplay';

const METRIC_FIELDS = [
    { groupKey: 'avgQuality', metricKey: 'quality' },
    { groupKey: 'avgDifficulty', metricKey: 'difficulty' },
    { groupKey: 'avgSweetness', metricKey: 'sweetness' },
    { groupKey: 'avgUsefulness', metricKey: 'usefulness' },
];

const CourseListView = ({ courseGroups, searchTerm, onSearchChange, sortBy, onSortChange, onSelectCourse }) => {
    const { t } = useTranslation();
    const filtered = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        const list = courseGroups.filter((group) => {
            if (!keyword) return true;
            return (
                group.courseCode.toLowerCase().includes(keyword) ||
                group.courseName.toLowerCase().includes(keyword) ||
                group.professors.some((p) => p.toLowerCase().includes(keyword))
            );
        });

        return [...list].sort((a, b) => {
            switch (sortBy) {
                case 'rating':
                    return b.avgOfFour - a.avgOfFour;
                case 'count':
                    return b.count - a.count;
                case 'latest':
                default:
                    return new Date(b.latestCreatedAt) - new Date(a.latestCreatedAt);
            }
        });
    }, [courseGroups, searchTerm, sortBy]);

    return (
        <Box>
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderColor: 'divider' }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <TextField
                            fullWidth
                            placeholder={t('courseReview.searchPlaceholder.courses')}
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
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('common.sort')}</InputLabel>
                            <Select value={sortBy} label={t('common.sort')} onChange={(e) => onSortChange(e.target.value)}>
                                <MenuItem value="latest">{t('courseReview.sort.latestReview')}</MenuItem>
                                <MenuItem value="rating">{t('courseReview.sort.ratingHighest')}</MenuItem>
                                <MenuItem value="count">{t('courseReview.sort.mostReviewed')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {filtered.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <RateReviewIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        {courseGroups.length === 0 ? t('courseReview.emptyState.noCoursesYet') : t('courseReview.emptyState.noMatchingCourses')}
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                        {courseGroups.length === 0 ? t('courseReview.emptyState.beFirst') : t('courseReview.emptyState.adjustSearch')}
                    </Typography>
                </Box>
            )}

            <Grid container spacing={2.5}>
                {filtered.map((group) => (
                    <Grid item xs={12} md={6} key={group.courseCode}>
                        <Card
                            sx={{ height: '100%', cursor: 'pointer' }}
                            onClick={() => onSelectCourse(group)}
                        >
                            <CardContent sx={{ p: 2.5 }}>
                                <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 1.5,
                                            bgcolor: 'rgba(25, 118, 210, 0.1)',
                                            color: 'primary.main',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <MenuBookIcon sx={{ fontSize: 22 }} />
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                                            {group.courseName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {group.courseCode} · {t('courseReview.reviewCountLabel', { count: group.count })}
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                                    {group.professors.map((professor) => (
                                        <Chip key={professor} label={professor} size="small" variant="outlined" />
                                    ))}
                                </Stack>

                                <Divider sx={{ my: 1.5 }} />

                                <Grid container spacing={1}>
                                    {METRIC_FIELDS.map((m) => (
                                        <Grid item xs={6} sm={3} key={m.groupKey}>
                                            <Stack spacing={0.25}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {t(`courseReview.metrics.${m.metricKey}`)}
                                                </Typography>
                                                <RatingDisplay value={group[m.groupKey]} size="small" />
                                            </Stack>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default CourseListView;
