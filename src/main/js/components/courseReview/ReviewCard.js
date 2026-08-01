import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    Button,
    Grid,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import RatingDisplay from './RatingDisplay';
import ReviewDetailDialog from './ReviewDetailDialog';
import courseReviewService from '../../services/courseReviewService';

const METRIC_KEYS = ['quality', 'difficulty', 'sweetness', 'usefulness'];
const OPTIONAL_SECTIONS = ['teachingMethod', 'assignmentExamFormat', 'gradingBreakdown'];

// 卡片內文字截斷成固定行數，超出的部分用「...」省略，完整內容要點卡片才看得到
const clampSx = (lines) => ({
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
});

// 課程評價以「課程」為主體：卡片標題是課程名稱＋代碼，評論者只是次要資訊，
// 跟以往「先看到是誰寫的」的排法相反。
const ReviewCard = ({ review, showStatus = false, hideReviewedBy = false, currentUserId, onEdit, onDelete }) => {
    const { t } = useTranslation();
    const [detailOpen, setDetailOpen] = useState(false);
    const isOwner = currentUserId && review.userId === currentUserId;
    const reviewerName = review.reviewer ? review.reviewer.fullName : t('common.unknown');

    const filledOptionalSections = OPTIONAL_SECTIONS.filter((key) => review[key] && review[key].trim());

    const handleDelete = (e) => {
        e.stopPropagation();
        if (window.confirm(t('courseReview.confirmDeleteReview'))) {
            onDelete(review.id);
        }
    };

    return (
        <>
            <Card
                variant="outlined"
                sx={{ borderColor: 'divider', height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                onClick={() => setDetailOpen(true)}
            >
                <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                                {review.courseName}（{review.courseCode}）
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                                {review.professor}
                            </Typography>
                        </Box>
                        {isOwner && (
                            <Stack direction="row" spacing={0.75} alignItems="center" onClick={(e) => e.stopPropagation()}>
                                {review.status === 'rejected' ? (
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        size="small"
                                        startIcon={<EditIcon fontSize="small" />}
                                        onClick={() => onEdit(review)}
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        {t('courseReview.reviseAndResubmit')}
                                    </Button>
                                ) : (
                                    <IconButton size="small" onClick={() => onEdit(review)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                )}
                                <IconButton size="small" color="error" onClick={handleDelete}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        )}
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1.5, rowGap: 0.5 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: 'grey.300', color: 'text.primary' }}>
                            {reviewerName.charAt(0)}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">
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

                    {showStatus && !hideReviewedBy && review.reviewedByUser && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            {t('courseReview.reviewedBy', { name: review.reviewedByUser.fullName })}
                        </Typography>
                    )}

                    {showStatus && review.status === 'rejected' && review.rejectReason && (
                        <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mb: 1.5 }}>
                            <WarningIcon sx={{ fontSize: 16, color: 'error.main', mt: 0.25 }} />
                            <Typography variant="caption" color="error.main">
                                {t('courseReview.rejectReasonLabel', { reason: review.rejectReason })}
                            </Typography>
                        </Stack>
                    )}

                    <Divider sx={{ mb: 1.5 }} />

                    <Grid container spacing={1} sx={{ mb: 1.5 }}>
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

                    {review.courseContent && (
                        <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {t('courseReview.form.courseContent')}
                            </Typography>
                            <Typography variant="body2" sx={clampSx(2)}>
                                {review.courseContent}
                            </Typography>
                        </Box>
                    )}

                    {review.comment && (
                        <Box sx={{ mb: filledOptionalSections.length > 0 ? 1 : 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {t('courseReview.form.comment')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={clampSx(3)}>
                                {review.comment}
                            </Typography>
                        </Box>
                    )}

                    {filledOptionalSections.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ rowGap: 0.5 }}>
                            {filledOptionalSections.map((key) => (
                                <Chip key={key} label={t(`courseReview.form.${key}`)} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            ))}
                        </Stack>
                    )}

                    <Box sx={{ flex: 1 }} />

                    <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                        {t('courseReview.clickForDetail')}
                    </Typography>
                </CardContent>
            </Card>

            <ReviewDetailDialog open={detailOpen} review={review} onClose={() => setDetailOpen(false)} />
        </>
    );
};

export default ReviewCard;
