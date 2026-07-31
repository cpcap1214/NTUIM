import React, { useEffect, useState } from 'react';
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

const metricFields = [
    { key: 'avgQuality', label: '課程品質' },
    { key: 'avgDifficulty', label: '難易度' },
    { key: 'avgSweetness', label: '給分高低' },
    { key: 'avgUsefulness', label: '實用性' },
];

const CourseDetailDialog = ({ open, course, currentUserId, canWrite, onClose, onWriteReview, onEditReview, onDeleteReview }) => {
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
                    共 {course.count} 則評價
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {metricFields.map((m) => (
                        <Grid item xs={6} sm={3} key={m.key}>
                            <Stack spacing={0.25}>
                                <Typography variant="caption" color="text.secondary">
                                    {m.label}
                                </Typography>
                                <RatingDisplay value={course[m.key]} size="medium" />
                            </Stack>
                        </Grid>
                    ))}
                </Grid>

                {byProfessor.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            依教授分組
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>教授</TableCell>
                                    {metricFields.map((m) => (
                                        <TableCell align="right" key={m.key}>{m.label}</TableCell>
                                    ))}
                                    <TableCell align="right">則數</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {byProfessor.map((prof) => (
                                    <TableRow key={prof.professor}>
                                        <TableCell>{prof.professor}</TableCell>
                                        {metricFields.map((m) => (
                                            <TableCell align="right" key={m.key}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: courseReviewService.getRatingColor(prof[m.key]), fontWeight: 600 }}
                                                >
                                                    {prof[m.key]}
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
                        新增評價
                    </Button>
                )}
                <Button onClick={onClose}>關閉</Button>
            </DialogActions>
        </Dialog>
    );
};

export default CourseDetailDialog;
