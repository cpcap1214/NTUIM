import React from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Stack,
    Avatar,
    Chip,
    Divider,
    IconButton,
    Grid,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    School as SchoolIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import RatingDisplay from './RatingDisplay';
import courseReviewService from '../../services/courseReviewService';

const metricFields = [
    { key: 'quality', label: '課程品質', textFn: courseReviewService.getQualityText },
    { key: 'difficulty', label: '難易度', textFn: courseReviewService.getDifficultyText },
    { key: 'sweetness', label: '給分高低', textFn: courseReviewService.getSweetnessText },
    { key: 'usefulness', label: '實用性', textFn: courseReviewService.getUsefulnessText },
];

const ReviewCard = ({ review, showCourse = false, showStatus = false, currentUserId, onEdit, onDelete }) => {
    const isOwner = currentUserId && review.userId === currentUserId;
    const reviewerName = review.reviewer ? review.reviewer.fullName : '未知';

    const handleDelete = () => {
        if (window.confirm('確定要刪除這則評價嗎？')) {
            onDelete(review.id);
        }
    };

    return (
        <Card variant="outlined" sx={{ borderColor: 'divider' }}>
            <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Avatar sx={{ width: 36, height: 36, fontSize: '0.9rem', bgcolor: 'grey.300', color: 'text.primary' }}>
                        {reviewerName.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {reviewerName}
                            </Typography>
                            <Chip label={courseReviewService.getAcademicTermLabel(review.year, review.semester)} size="small" variant="outlined" />
                            {showStatus && review.status && (
                                <Chip
                                    label={courseReviewService.getStatusLabel(review.status)}
                                    size="small"
                                    color={courseReviewService.getStatusColor(review.status)}
                                />
                            )}
                        </Stack>
                        {showCourse && (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                                <SchoolIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                    {review.courseName}（{review.courseCode}）· {review.professor}
                                </Typography>
                            </Stack>
                        )}
                        {!showCourse && (
                            <Typography variant="caption" color="text.secondary">
                                {review.professor}
                            </Typography>
                        )}
                        {showStatus && review.reviewedByUser && (
                            <Typography variant="caption" color="text.secondary" display="block">
                                審核人：{review.reviewedByUser.fullName}
                            </Typography>
                        )}
                    </Box>
                    {isOwner && (
                        <Stack direction="row" spacing={0.25}>
                            <IconButton size="small" onClick={() => onEdit(review)}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={handleDelete}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    )}
                </Stack>

                {review.comment && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
                        {review.comment}
                    </Typography>
                )}

                {showStatus && review.status === 'rejected' && review.rejectReason && (
                    <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mb: 1.5 }}>
                        <WarningIcon sx={{ fontSize: 16, color: 'error.main', mt: 0.25 }} />
                        <Typography variant="caption" color="error.main">
                            拒絕原因：{review.rejectReason}
                        </Typography>
                    </Stack>
                )}

                <Divider sx={{ my: 1.5 }} />

                <Grid container spacing={1}>
                    {metricFields.map((m) => (
                        <Grid item xs={6} sm={3} key={m.key}>
                            <Stack spacing={0.25}>
                                <Typography variant="caption" color="text.secondary">
                                    {m.label}
                                </Typography>
                                <RatingDisplay value={review[m.key]} size="small" />
                            </Stack>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default ReviewCard;
