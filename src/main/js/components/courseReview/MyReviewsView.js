import React from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import { RateReview as RateReviewIcon } from '@mui/icons-material';
import ReviewCard from './ReviewCard';

const MyReviewsView = ({ myReviews, currentUser, onEdit, onDelete, onWriteReview }) => {
    // getMyReviews() 沒有 include reviewer，這裡自己補上目前使用者的資料才能正確顯示名字
    const enrichedReviews = myReviews.map((review) => ({
        ...review,
        reviewer: { username: currentUser.username, fullName: currentUser.fullName },
    }));

    if (myReviews.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <RateReviewIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    你還沒有寫過課程評價
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                    分享你的修課心得，幫助其他同學選課
                </Typography>
                <Button variant="contained" onClick={() => onWriteReview()}>
                    寫下第一篇評價
                </Button>
            </Box>
        );
    }

    return (
        <Stack spacing={2}>
            {enrichedReviews.map((review) => (
                <ReviewCard
                    key={review.id}
                    review={review}
                    showCourse
                    showStatus
                    currentUserId={currentUser.id}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </Stack>
    );
};

export default MyReviewsView;
