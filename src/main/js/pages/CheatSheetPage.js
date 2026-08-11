import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  Divider,
  Stack,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Description as DescriptionIcon,
  Visibility as ViewIcon,
  GetApp as GetAppIcon,
  DateRange as DateIcon,
  Download as DownloadIcon,
  Tag as TagIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';

const CheatSheetPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [cheatSheets, setCheatSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 只在掛載時抓一次。fetchCheatSheets 現在會引用 t（i18n 的錯誤訊息），
  // linter 因此不再視它為穩定值；把它加進依賴會造成無限重抓，
  // 所以照專案既有做法明確關掉這條規則。
  useEffect(() => {
    fetchCheatSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCheatSheets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/cheat-sheets`);
      if (!response.ok) throw new Error(t('cheatSheet.fetchFailed'));
      const result = await response.json();
      setCheatSheets(result.data || []);
    } catch (err) {
      console.error('獲取大抄錯誤:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const allCourses = [...new Set(cheatSheets.map((sheet) => sheet.courseName))];
  const allTags = [...new Set(cheatSheets.flatMap((sheet) => sheet.tags || []))];

  const filteredSheets = cheatSheets
    .filter((sheet) => {
      const matchesSearch =
        sheet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sheet.description && sheet.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCourse = courseFilter === 'all' || sheet.courseName === courseFilter;
      const matchesTag = tagFilter === 'all' || (sheet.tags && sheet.tags.includes(tagFilter));
      return matchesSearch && matchesCourse && matchesTag;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'downloads':
          return (b.downloadCount || 0) - (a.downloadCount || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const handleDownload = async (cheatSheetId, filename) => {
    if (!user) {
      alert(t('cheatSheet.loginToDownload'));
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/cheat-sheets/${cheatSheetId}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error(t('cheatSheet.downloadFailed'));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('下載錯誤:', e);
      alert(t('cheatSheet.downloadFailedRetry'));
    }
  };

  const handlePreview = (cheatSheetId) => {
    if (!user) {
      alert(t('cheatSheet.loginToPreview'));
      return;
    }
    const token = localStorage.getItem('token');
    window.open(`${API_BASE_URL}/cheat-sheets/${cheatSheetId}/preview?token=${token}`, '_blank');
  };

  // 這些鍵是資料庫裡實際的標籤字串，不是介面文案——抽到語言檔會讓配色在英文介面下失效
  const getTagColor = (tag) => {
    const colors = {
      資料庫: 'primary',
      React: 'info',
      JavaScript: 'warning',
      前端: 'success',
      機器學習: 'secondary',
      AI: 'error',
      演算法: 'primary',
      理論: 'info',
    };
    return colors[tag] || 'default';
  };

  if (!user) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <DescriptionIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
        <Typography variant="h5" color="text.secondary" gutterBottom>
          {t('cheatSheet.loginRequired')}
        </Typography>
        <Typography variant="body2" color="text.disabled">
          {t('cheatSheet.loginRequiredBody')}
        </Typography>
      </Box>
    );
  }

  const totalDownloads = cheatSheets.reduce((sum, sheet) => sum + (sheet.downloadCount || 0), 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t('home.quickLinks.cheatSheetsTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {loading
            ? t('common.loading')
            : t('cheatSheet.stats', { count: cheatSheets.length, downloads: totalDownloads, courses: allCourses.length })}
        </Typography>
      </Box>

      {/* Filter Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderColor: 'divider' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder={t('cheatSheet.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('cheatSheet.courseFilter')}</InputLabel>
              <Select value={courseFilter} label={t('cheatSheet.courseFilter')} onChange={(e) => setCourseFilter(e.target.value)}>
                <MenuItem value="all">{t('common.all')}</MenuItem>
                {allCourses.map((course) => (
                  <MenuItem key={course} value={course}>
                    {course}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('cheatSheet.form.tags')}</InputLabel>
              <Select value={tagFilter} label={t('cheatSheet.form.tags')} onChange={(e) => setTagFilter(e.target.value)}>
                <MenuItem value="all">{t('common.all')}</MenuItem>
                {allTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('common.sort')}</InputLabel>
              <Select value={sortBy} label={t('common.sort')} onChange={(e) => setSortBy(e.target.value)}>
                <MenuItem value="latest">{t('exam.sort.latest')}</MenuItem>
                <MenuItem value="downloads">{t('exam.sort.downloads')}</MenuItem>
                <MenuItem value="title">{t('cheatSheet.form.title')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
            <TagIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t('cheatSheet.popularTags')}
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {allTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                color={getTagColor(tag)}
                variant={tagFilter === tag ? 'filled' : 'outlined'}
                onClick={() => setTagFilter(tagFilter === tag ? 'all' : tag)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body2" color="text.secondary">
            {t('cheatSheet.loadingList')}
          </Typography>
        </Box>
      )}

      {/* Cheat Sheets Grid */}
      {!loading && (
        <Grid container spacing={2.5}>
          {filteredSheets.map((sheet) => (
            <Grid item xs={12} md={6} key={sheet.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Header */}
                  <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(5, 150, 105, 0.1)',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <DescriptionIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
                        {sheet.title}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <SchoolIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {sheet.courseName}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>

                  {/* Description */}
                  {sheet.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {sheet.description}
                    </Typography>
                  )}

                  {/* Tags */}
                  {sheet.tags && sheet.tags.length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {sheet.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" color={getTagColor(tag)} variant="outlined" />
                      ))}
                    </Stack>
                  )}

                  <Box sx={{ flex: 1 }} />
                  <Divider sx={{ my: 1.5 }} />

                  {/* Author + meta */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                      <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: 'grey.300', color: 'text.primary' }}>
                        {sheet.uploader ? sheet.uploader.fullName.charAt(0) : '?'}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {sheet.uploader ? sheet.uploader.fullName : t('common.unknown')}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <DateIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled">
                          {sheet.created_at ? new Date(sheet.created_at).toLocaleDateString(i18n.language) : '—'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <DownloadIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled">
                          {sheet.downloadCount || 0}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>

                  {/* Actions */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => handlePreview(sheet.id)}
                      sx={{ flex: 1 }}
                    >
                      {t('exam.preview')}
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<GetAppIcon />}
                      onClick={() => handleDownload(sheet.id, sheet.fileName || `${sheet.title}.pdf`)}
                      sx={{ flex: 1 }}
                    >
                      {t('exam.download')}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty */}
      {!loading && filteredSheets.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <TagIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {t(cheatSheets.length === 0 ? 'cheatSheet.empty' : 'cheatSheet.noMatch')}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {t(cheatSheets.length === 0 ? 'cheatSheet.emptyHint' : 'cheatSheet.noMatchHint')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CheatSheetPage;
