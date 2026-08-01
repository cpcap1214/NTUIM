import React from 'react';
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
    Avatar,
    Chip,
    Divider,
    Grid,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import RatingDisplay from './RatingDisplay';
import courseReviewService from '../../services/courseReviewService';

const METRIC_KEYS = ['quality', 'difficulty', 'sweetness', 'usefulness'];

// 課程內容為必填一定顯示；其餘三個是選填，只有填寫過才顯示對應區塊
const OPTIONAL_SECTIONS = ['teachingMethod', 'assignmentExamFormat', 'gradingBreakdown'];

const ReviewDetailDialog = ({ open, review, onClose }) => {
    const { t } = useTranslation();
    if (!review) return null;

    const reviewerName = review.reviewer ? review.reviewer.fullName : t('common.unknown');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {review.courseName}（{review.courseCode}）
                <Typography variant="body2" color="text.secondary">
                    {review.professor}
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: 'grey.300', color: 'text.primary' }}>
                        {reviewerName.charAt(0)}
                    </Avatar>
                    <Typography variant="body2">{reviewerName}</Typography>
                    <Chip label={courseReviewService.getAcademicTermLabel(review.year, review.semester)} size="small" variant="outlined" />
                    {review.status && (
                        <Chip
                            label={courseReviewService.getStatusLabel(review.status)}
                            size="small"
                            color={courseReviewService.getStatusColor(review.status)}
                        />
                    )}
                </Stack>

                {review.reviewedByUser && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {t('courseReview.reviewedBy', { name: review.reviewedByUser.fullName })}
                    </Typography>
                )}

                {review.status === 'rejected' && review.rejectReason && (
                    <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mb: 2 }}>
                        <WarningIcon sx={{ fontSize: 16, color: 'error.main', mt: 0.25 }} />
                        <Typography variant="caption" color="error.main">
                            {t('courseReview.rejectReasonLabel', { reason: review.rejectReason })}
                        </Typography>
                    </Stack>
                )}

                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {METRIC_KEYS.map((key) => (
                        <Grid item xs={6} sm={3} key={key}>
                            <Stack spacing={0.25}>
                                <Typography variant="caption" color="text.secondary">
                                    {t(`courseReview.metrics.${key}`)}
                                </Typography>
                                <RatingDisplay value={review[key]} size="small" />
                            </Stack>
                        </Grid>
                    ))}
                </Grid>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            {t('courseReview.form.courseContent')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                            {review.courseContent}
                        </Typography>
                    </Box>

                    {OPTIONAL_SECTIONS.filter((key) => review[key] && review[key].trim()).map((key) => (
                        <Box key={key}>
                            <Typography variant="subtitle2" gutterBottom>
                                {t(`courseReview.form.${key}`)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                {review[key]}
                            </Typography>
                        </Box>
                    ))}

                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            {t('courseReview.form.comment')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                            {review.comment}
                        </Typography>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.close')}</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReviewDetailDialog;
