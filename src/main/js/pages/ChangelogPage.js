import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper, Stack, Chip, Divider } from '@mui/material';
import { APP_CONFIG } from '../../resources/config/constants';
import CHANGELOG from '../../resources/data/changelog';

// 這些鍵對應下方 CHANGELOG 裡的分類名稱（資料本身就是中文），不是介面文案。
// 歷史更新內容依決策保持原文不翻譯，所以這裡也維持中文鍵。
const CATEGORY_META = {
    新功能: { color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
    優化: { color: '#0891b2', bg: 'rgba(8, 145, 178, 0.1)' },
    修復: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.08)' },
    變更: { color: '#475569', bg: 'rgba(71, 85, 105, 0.08)' },
};

const ChangelogPage = () => {
    const { t } = useTranslation();
    const totalReleases = CHANGELOG.length;
    const firstDate = CHANGELOG[CHANGELOG.length - 1].date;
    const latestDate = CHANGELOG[0].date;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {t('nav.changelog')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('changelog.summary', {
                        count: totalReleases,
                        from: firstDate,
                        to: latestDate,
                    })}
                </Typography>
            </Box>

            {/* Timeline */}
            <Box sx={{ position: 'relative' }}>
                {/* Vertical line */}
                <Box
                    sx={{
                        position: 'absolute',
                        left: { xs: 7, sm: 11 },
                        top: 8,
                        bottom: 8,
                        width: 2,
                        bgcolor: 'divider',
                        display: { xs: 'none', sm: 'block' },
                    }}
                />

                <Stack spacing={3}>
                    {CHANGELOG.map((release, idx) => {
                        const isLatest = idx === 0;
                        return (
                            <Box
                                key={release.version}
                                sx={{ position: 'relative', pl: { xs: 0, sm: 5 } }}
                            >
                                {/* Timeline dot */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 18,
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        border: '3px solid',
                                        borderColor: isLatest
                                            ? 'primary.main'
                                            : 'background.default',
                                        bgcolor: isLatest ? 'primary.main' : 'grey.300',
                                        boxShadow: isLatest
                                            ? '0 0 0 4px rgba(25, 118, 210, 0.15)'
                                            : 'none',
                                        display: { xs: 'none', sm: 'block' },
                                    }}
                                />

                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: { xs: 2.5, md: 3 },
                                        borderColor: isLatest ? 'primary.light' : 'divider',
                                        borderWidth: isLatest ? '1.5px' : '1px',
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    {/* Version header */}
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        alignItems={{ sm: 'center' }}
                                        spacing={1.5}
                                        sx={{ mb: 1.5 }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography
                                                variant="h4"
                                                component="h2"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: isLatest
                                                        ? 'primary.main'
                                                        : 'text.primary',
                                                }}
                                            >
                                                v{release.version}
                                            </Typography>
                                            {isLatest && (
                                                <Chip
                                                    label={t('changelog.latest')}
                                                    size="small"
                                                    color="primary"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            )}
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            {release.date}
                                        </Typography>
                                        <Box sx={{ flex: 1 }} />
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 500, color: 'text.secondary' }}
                                        >
                                            {release.title}
                                        </Typography>
                                    </Stack>

                                    {/* Highlights */}
                                    {release.highlights && release.highlights.length > 0 && (
                                        <Box
                                            sx={{
                                                mb: 2,
                                                p: 1.5,
                                                bgcolor: 'grey.50',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 1.5,
                                            }}
                                        >
                                            <Stack spacing={0.5}>
                                                {release.highlights.map((h, i) => (
                                                    <Typography
                                                        key={i}
                                                        variant="body2"
                                                        sx={{ lineHeight: 1.6 }}
                                                    >
                                                        <Box
                                                            component="span"
                                                            sx={{ color: 'primary.main', mr: 1 }}
                                                        >
                                                            ▸
                                                        </Box>
                                                        {h}
                                                    </Typography>
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}

                                    {/* Categorized changes */}
                                    <Stack
                                        spacing={1.5}
                                        divider={<Divider flexItem sx={{ my: 0.5 }} />}
                                    >
                                        {Object.entries(release.changes).map(
                                            ([category, items]) => {
                                                const meta =
                                                    CATEGORY_META[category] || CATEGORY_META.變更;
                                                return (
                                                    <Box key={category}>
                                                        <Stack
                                                            direction="row"
                                                            alignItems="center"
                                                            spacing={1}
                                                            sx={{ mb: 0.75 }}
                                                        >
                                                            <Chip
                                                                label={category}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: meta.bg,
                                                                    color: meta.color,
                                                                    fontWeight: 600,
                                                                    height: 20,
                                                                    fontSize: '0.7rem',
                                                                    border: 'none',
                                                                }}
                                                            />
                                                            <Typography
                                                                variant="caption"
                                                                color="text.disabled"
                                                            >
                                                                {items.length} 項
                                                            </Typography>
                                                        </Stack>
                                                        <Stack spacing={0.5} sx={{ pl: 0.5 }}>
                                                            {items.map((item, i) => (
                                                                <Stack
                                                                    key={i}
                                                                    direction="row"
                                                                    spacing={1}
                                                                    alignItems="baseline"
                                                                >
                                                                    <Box
                                                                        component="span"
                                                                        sx={{
                                                                            color: 'text.disabled',
                                                                            fontSize: '0.75rem',
                                                                            lineHeight: 1.5,
                                                                            flexShrink: 0,
                                                                        }}
                                                                    >
                                                                        ·
                                                                    </Box>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{ lineHeight: 1.55 }}
                                                                    >
                                                                        {item.text}
                                                                    </Typography>
                                                                </Stack>
                                                            ))}
                                                        </Stack>
                                                    </Box>
                                                );
                                            },
                                        )}
                                    </Stack>
                                </Paper>
                            </Box>
                        );
                    })}
                </Stack>
            </Box>

            {/* Footer note */}
            <Box
                sx={{
                    mt: 5,
                    py: 3,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                }}
            >
                <Typography variant="caption" color="text.disabled">
                    {t('changelog.currentVersion', { version: APP_CONFIG.version })}
                </Typography>
            </Box>
        </Box>
    );
};

export default ChangelogPage;
