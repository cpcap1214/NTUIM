import React, { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import api from '../../services/api';
import { sponsorSlides } from '../SponsorCarousel';

export default function SponsorStatsPanel() {
    const [from, setFrom] = useState('2026-09-07');
    const [to, setTo] = useState(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date()),
    );
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const load = async () => {
        setLoading(true);
        setError('');
        setData(null);
        try {
            const result = await api.get('/sponsors/stats', { params: { from, to } });
            setData(result.data);
        } catch {
            setError('無法載入廣告統計，請確認日期範圍或稍後重試。');
        } finally {
            setLoading(false);
        }
    };
    // Initial report only; later date edits are applied by the query button.
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
                <Typography variant="h5">贊助廣告統計</Typography>
                <Typography variant="body2" color="text.secondary">
                    台北時間。曝光需圖片載入、版位至少 50% 可見並持續 1
                    秒；每次首頁瀏覽，每張曝光及點開各計一次。訪客以匿名瀏覽器識別碼去重，跨裝置可能重複；活動總訪客不會將三張人數相加。只記錄功能上線後的資料。
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        label="開始日期"
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="結束日期"
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <Button variant="contained" onClick={load} disabled={loading}>
                        {loading ? '載入中…' : '查詢'}
                    </Button>
                </Stack>
                {error && <Alert severity="error">{error}</Alert>}
                {data && (
                    <TableContainer>
                        <Table aria-label="贊助廣告成效">
                            <TableHead>
                                <TableRow>
                                    {['圖片', '曝光次數', '不重複訪客', '點開次數'].map((label) => (
                                        <TableCell key={label}>{label}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[...data.creatives, { id: 'total', ...data.total }].map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            {row.id === 'total'
                                                ? '整個活動（訪客去重）'
                                                : sponsorSlides.find((slide) => slide.id === row.id)
                                                      ?.title || row.id}
                                        </TableCell>
                                        <TableCell>{row.impressions}</TableCell>
                                        <TableCell>{row.visitors}</TableCell>
                                        <TableCell>{row.opens}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Stack>
        </Paper>
    );
}
