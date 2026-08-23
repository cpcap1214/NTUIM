import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    Chip,
    Grid,
    InputAdornment,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PaidIcon from '@mui/icons-material/Paid';
import SearchIcon from '@mui/icons-material/Search';
import courseReviewService from '../../services/courseReviewService';
import { translateApiError } from '../../utils';
import { TAIPEI_DATE, TAIPEI_TIME } from './adminFormat';

// 發放狀態列的標籤樣式。filled 與 outlined 兩種變體並排時，outlined 多出的 1px 邊框
// 會讓它看起來比較矮、字也比較細，所以高度與字級都明確指定，兩顆共用同一組值。
const PAYOUT_CHIP_SX = {
    height: 24,
    fontSize: '0.75rem',
    fontWeight: 500,
    '& .MuiChip-label': { px: 1 },
};

// 發放狀態 → 標籤顏色。declined 用中性灰而不是紅色：
// 「不發放」是正常的結案結果（多半只是超出名額），不是錯誤，不該看起來像警報
const PAYOUT_STATUS_COLOR = {
    pending: 'warning',
    paid: 'success',
    declined: 'default',
};

// 後台的「回饋金撥款」分頁。原本是 AdminPage.js 裡的一段 activeTab === 6。
//
// 篩選（pending / paid / declined / all）會回後端重抓，搜尋則是在前端過濾——
// 這個分頁的資料量是一學期的合格評價數，不值得為搜尋多打一次 API。
const PayoutAdminPanel = ({ onError, onSuccess }) => {
    const { t } = useTranslation();
    const [payouts, setPayouts] = useState([]);
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [payoutFilter, setPayoutFilter] = useState('pending');
    const [payoutSearchTerm, setPayoutSearchTerm] = useState('');

    const reportRef = useRef({ onError, onSuccess });
    reportRef.current = { onError, onSuccess };

    const fetchPayouts = useCallback(
        async (filter) => {
            try {
                setPayoutLoading(true);
                const statusParam = filter === 'all' ? undefined : filter;
                setPayouts(await courseReviewService.getPayouts(statusParam));
            } catch (err) {
                console.error('取得發放清單錯誤:', err);
                reportRef.current.onError(
                    translateApiError(err, t('courseReview.payout.fetchFailed')),
                );
            } finally {
                setPayoutLoading(false);
            }
        },
        [t],
    );

    // 篩選條件變更就重抓（含首次掛載）
    useEffect(() => {
        fetchPayouts(payoutFilter);
    }, [fetchPayouts, payoutFilter]);

    // status: 'pending'（未處理）| 'paid'（已發放）| 'declined'（不發放）
    const handleTogglePayout = async (review, status) => {
        try {
            await courseReviewService.setPayoutStatus(review.id, status);
            await fetchPayouts(payoutFilter);
            onSuccess(
                t(
                    `courseReview.payout.mark${status.charAt(0).toUpperCase()}${status.slice(1)}Success`,
                ),
            );
        } catch (err) {
            onError(translateApiError(err, t('courseReview.payout.updateFailed')));
        }
    };

    const handleExportPayouts = async () => {
        try {
            await courseReviewService.downloadPayoutCsv();
        } catch (err) {
            onError(translateApiError(err, t('courseReview.payout.exportFailed')));
        }
    };

    // 未處理的筆數，顯示在篩選鈕上的徽章
    const unpaidPayoutCount = payouts.filter(
        (review) => (review.payoutStatus || 'pending') === 'pending',
    ).length;

    const filteredPayouts = payouts.filter((review) => {
        const keyword = payoutSearchTerm.trim().toLowerCase();
        if (!keyword) return true;
        return (
            review.courseName.toLowerCase().includes(keyword) ||
            review.courseCode.toLowerCase().includes(keyword) ||
            (review.professor && review.professor.toLowerCase().includes(keyword)) ||
            (review.reviewer?.fullName &&
                review.reviewer.fullName.toLowerCase().includes(keyword)) ||
            (review.reviewer?.studentId &&
                review.reviewer.studentId.toLowerCase().includes(keyword))
        );
    });

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                {t('courseReview.payout.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {t('courseReview.payout.description')}
            </Typography>

            {/* 搜尋與匯出 */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                        <TextField
                            fullWidth
                            placeholder={t('courseReview.payout.searchPlaceholder')}
                            value={payoutSearchTerm}
                            onChange={(e) => setPayoutSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportPayouts}
                        >
                            {t('courseReview.payout.exportCsv')}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            <ToggleButtonGroup
                value={payoutFilter}
                exclusive
                size="small"
                onChange={(_, v) => v && setPayoutFilter(v)}
                sx={{ mb: 3 }}
            >
                <ToggleButton value="pending">
                    {t('courseReview.payout.pending')}
                    {unpaidPayoutCount > 0 && (
                        <Chip
                            label={unpaidPayoutCount}
                            size="small"
                            color="warning"
                            sx={{ ml: 1 }}
                        />
                    )}
                </ToggleButton>
                <ToggleButton value="paid">{t('courseReview.payout.paid')}</ToggleButton>
                <ToggleButton value="declined">{t('courseReview.payout.declined')}</ToggleButton>
                <ToggleButton value="all">{t('common.all')}</ToggleButton>
            </ToggleButtonGroup>

            {payoutLoading && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary">
                        {t('common.loading')}
                    </Typography>
                </Box>
            )}

            {!payoutLoading && filteredPayouts.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <PaidIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        {t('courseReview.payout.empty')}
                    </Typography>
                </Box>
            )}

            {!payoutLoading && filteredPayouts.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                    {/* 低於 minWidth 就在 TableContainer 內橫向捲動（它預設 overflow-x: auto），
                            不加的話欄位會被擠到字疊在一起 */}
                    <Table size="small" sx={{ minWidth: 880 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('courseReview.payout.recipient')}</TableCell>
                                <TableCell>{t('courseReview.payout.studentId')}</TableCell>
                                <TableCell>{t('courseReview.payout.course')}</TableCell>
                                <TableCell>{t('courseReview.form.academicTerm')}</TableCell>
                                <TableCell>{t('courseReview.payout.submittedAt')}</TableCell>
                                <TableCell>{t('courseReview.payout.status')}</TableCell>
                                <TableCell>{t('courseReview.payout.paidBy')}</TableCell>
                                <TableCell align="center">
                                    {t('courseReview.payout.action')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPayouts.map((review) => (
                                <TableRow key={review.id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                            <Typography variant="body2">
                                                {review.reviewer?.fullName || t('common.unknown')}
                                            </Typography>
                                            {review.isAnonymous && (
                                                <Tooltip
                                                    title={t('courseReview.payout.anonymousHint')}
                                                >
                                                    <Chip
                                                        label={t(
                                                            'courseReview.payout.anonymousTag',
                                                        )}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{review.reviewer?.studentId || '-'}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{review.courseName}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {review.professor} · {review.courseCode}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {courseReviewService.getAcademicTermLabel(
                                            review.year,
                                            review.semester,
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {review.created_at ? (
                                            <>
                                                {new Date(review.created_at).toLocaleDateString(
                                                    'zh-TW',
                                                    TAIPEI_DATE,
                                                )}
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    display="block"
                                                >
                                                    {new Date(review.created_at).toLocaleTimeString(
                                                        'zh-TW',
                                                        TAIPEI_TIME,
                                                    )}
                                                </Typography>
                                            </>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {/* 兩個標籤並排。共用同一組 sx 讓高度與字級一致——outlined 變體多了
                    1px 邊框，不明確指定的話跟 filled 排在一起會看起來一高一低 */}
                                        <Stack
                                            direction="row"
                                            spacing={0.75}
                                            alignItems="center"
                                            flexWrap="wrap"
                                            useFlexGap
                                        >
                                            <Chip
                                                label={t(
                                                    `courseReview.payout.${review.payoutStatus || 'pending'}`,
                                                )}
                                                size="small"
                                                color={
                                                    PAYOUT_STATUS_COLOR[review.payoutStatus] ||
                                                    'warning'
                                                }
                                                sx={PAYOUT_CHIP_SX}
                                            />
                                            {/* 超出回饋金名額的評價按下去會被後端擋，先標出來省得白按。
                      比對 === false 而不是 !review.payoutEligible：後端若還沒
                      部署到帶名額的版本，這個欄位會是 undefined，那時什麼都不該顯示 */}
                                            {review.payoutEligible === false && (
                                                <Tooltip
                                                    title={t('courseReview.quota.overQuotaHint')}
                                                >
                                                    <Chip
                                                        label={t('courseReview.quota.overQuota')}
                                                        size="small"
                                                        color="error"
                                                        variant="outlined"
                                                        sx={PAYOUT_CHIP_SX}
                                                    />
                                                </Tooltip>
                                            )}
                                        </Stack>
                                        {review.isPaid && review.paidAt && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                                sx={{ mt: 0.5 }}
                                            >
                                                {new Date(review.paidAt).toLocaleDateString(
                                                    'zh-TW',
                                                    TAIPEI_DATE,
                                                )}{' '}
                                                {new Date(review.paidAt).toLocaleTimeString(
                                                    'zh-TW',
                                                    TAIPEI_TIME,
                                                )}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {review.isPaid
                                            ? review.paidByUser?.fullName || t('common.unknown')
                                            : '-'}
                                    </TableCell>
                                    <TableCell align="center">
                                        {/* 取消發放永遠可以按：已發放的評價一定在名額內（is_paid 會把它固定住），
                    而且不能讓任何一列卡在「無法操作」的狀態。
                    只有「標記已發放」需要看名額——超出名額時後端會回 PAYOUT_OVER_QUOTA，
                    按了必定失敗，所以整個不顯示，不是 disabled：
                    一顆按不動的按鈕只會讓人反覆嘗試。理由已經寫在左邊的「超出名額」標籤上。 */}
                                        {review.payoutStatus === 'paid' ||
                                        review.payoutStatus === 'declined' ? (
                                            <Button
                                                size="small"
                                                color="inherit"
                                                onClick={() =>
                                                    handleTogglePayout(review, 'pending')
                                                }
                                            >
                                                {t('courseReview.payout.markPending')}
                                            </Button>
                                        ) : review.payoutEligible === false ? (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="inherit"
                                                onClick={() =>
                                                    handleTogglePayout(review, 'declined')
                                                }
                                            >
                                                {t('courseReview.payout.markDeclined')}
                                            </Button>
                                        ) : (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="success"
                                                startIcon={<PaidIcon />}
                                                onClick={() => handleTogglePayout(review, 'paid')}
                                            >
                                                {t('courseReview.payout.markPaid')}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

export default PayoutAdminPanel;
