import React from 'react';
import { Stack, Typography, Rating } from '@mui/material';
import courseReviewService from '../../services/courseReviewService';

const RatingDisplay = ({ value, size = 'small', showNumber = true, precision = 0.5 }) => {
    const numericValue = parseFloat(value) || 0;

    return (
        <Stack direction="row" spacing={0.5} alignItems="center">
            <Rating value={numericValue} precision={precision} readOnly size={size} />
            {showNumber && (
                <Typography
                    variant="caption"
                    sx={{ color: courseReviewService.getRatingColor(numericValue), fontWeight: 600 }}
                >
                    {courseReviewService.formatRating(numericValue)}
                </Typography>
            )}
        </Stack>
    );
};

export default RatingDisplay;
