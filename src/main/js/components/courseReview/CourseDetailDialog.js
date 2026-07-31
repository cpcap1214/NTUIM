import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Stack,
    Divider,
    Grid,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from '@mui/material';
import RatingDisplay from './RatingDisplay';
import ReviewCard from './ReviewCard';
import courseReviewService from '../../services/courseReviewService';

const METRIC_FIELDS = [
    { groupKey: 'avgQuality', metricKey: 'quality' },
    { groupKey: 'avgDifficulty', metricKey: 'difficulty' },
    { groupKey: 'avgSweetness', metricKey: 'sweetness' },
    { groupKey: 'avgUsefulness', metricKey: 'usefulness' },
];

const CourseDetailDialog = ({ open, course, currentUserId, canWrite, onClose, onWriteReview, onEditReview, onDeleteReview }) => {
    const { t } = useTranslation();
    const [byProfessor, setByProfessor] = useState([]);

    useEffect(() => {
        if (open && course) {
            courseReviewService
                .getCourseStatistics(course.courseCode)
                .then((stats) => setByProfessor(stats.byProfessor || []))
                .catch(() => setByProfessor([]));
        } else {
            setByProfessor([]);
        }
    }, [open, course]);

    if (!course) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {course.courseName}
                <Typography variant="body2" color="text.secondary">
                    {course.courseCode}
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('courseReview.totalReviewCount', { count: course.count })}
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {METRIC_FIELDS.map((m) => (
                        <Grid item xs={6} sm={3} key={m.groupKey}>
                            <Stack spacing={0.25}>
                                <Typography variant="caption" color="text.secondary">
                                    {t(`courseReview.metrics.${m.metricKey}`)}
                                </Typography>
                                <RatingDisplay value={course[m.groupKey]} size="medium" />
                            </Stack>
                        </Grid>
                    ))}
                </Grid>

                {byProfessor.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            {t('courseReview.byProfessor')}
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('courseReview.professorColumn')}</TableCell>
                                    {METRIC_FIELDS.map((m) => (
                                        <TableCell align="right" key={m.groupKey}>{t(`courseReview.metrics.${m.metricKey}`)}</TableCell>
                                    ))}
                                    <TableCell align="right">{t('courseReview.countColumn')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {byProfessor.map((prof) => (
                                    <TableRow key={prof.professor}>
                                        <TableCell>{prof.professor}</TableCell>
                                        {METRIC_FIELDS.map((m) => (
                                            <TableCell align="right" key={m.groupKey}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: courseReviewService.getRatingColor(prof[m.groupKey]), fontWeight: 600 }}
                                                >
                                                    {prof[m.groupKey]}
                                                </Typography>
                                            </TableCell>
                                        ))}
                                        <TableCell align="right">{prof.reviewCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2} direction="column">
                    {course.reviews.map((review) => (
                        <Grid item key={review.id}>
                            <ReviewCard
                                review={review}
                                showCourse={false}
                                currentUserId={currentUserId}
                                onEdit={onEditReview}
                                onDelete={onDeleteReview}
                            />
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
            <DialogActions>
                {canWrite && (
                    <Button variant="contained" onClick={() => onWriteReview(course)} sx={{ mr: 'auto' }}>
                        {t('courseReview.newReview')}
                    </Button>
                )}
                <Button onClick={onClose}>{t('common.close')}</Button>
            </DialogActions>
        </Dialog>
    );
};

export default CourseDetailDialog;
