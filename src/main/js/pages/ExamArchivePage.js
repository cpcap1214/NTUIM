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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Visibility as ViewIcon,
  GetApp as GetAppIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  DateRange as DateIcon,
  ViewModule as CardViewIcon,
  ViewList as ListViewIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import PaymentWall from '../components/PaymentWall';
import { API_BASE_URL } from '../services/api';

const ExamArchivePage = () => {
  const { t, i18n } = useTranslation();
  const { hasPaidFee } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState('card');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 只在掛載時抓一次。fetchExams 現在會引用 t（i18n 的錯誤訊息），
  // linter 因此不再視它為穩定值；把它加進依賴會造成無限重抓，
  // 所以照專案既有做法明確關掉這條規則。
  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/exams?limit=1000`);
      if (!response.ok) throw new Error(t('exam.fetchFailed'));
      const result = await response.json();
      setExams(result.data || []);
    } catch (err) {
      console.error('獲取考古題錯誤:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams
    .filter((exam) => {
      const matchesSearch =
        exam.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exam.professor && exam.professor.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = examTypeFilter === 'all' || exam.examType === examTypeFilter;
      const matchesYear = yearFilter === 'all' || exam.year === parseInt(yearFilter);
      return matchesSearch && matchesType && matchesYear;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'downloads':
          return (b.downloadCount || 0) - (a.downloadCount || 0);
        case 'course':
          return a.courseName.localeCompare(b.courseName);
        default:
          return 0;
      }
    });

  const availableYears = [...new Set(exams.map((exam) => exam.year))].sort((a, b) => b - a);
  const examTypes = [...new Set(exams.map((exam) => exam.examType))];

  const handleDownload = async (examId, filename, fileType = 'question') => {
    if (!hasPaidFee) {
      alert(t('exam.payToDownload'));
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/exams/${examId}/download/${fileType}`, {
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

  const handlePreview = (examId, fileType = 'question') => {
    if (!hasPaidFee) {
      alert(t('exam.payToPreview'));
      return;
    }
    const token = localStorage.getItem('token');
    window.open(`${API_BASE_URL}/exams/${examId}/preview/${fileType}?token=${token}`, '_blank');
  };

  if (!hasPaidFee) {
    return <PaymentWall feature={t('home.quickLinks.examArchiveTitle')} />;
  }

  const totalDownloads = exams.reduce((sum, exam) => sum + (exam.downloadCount || 0), 0);

  return (
    <Box>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ md: 'flex-end' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('home.quickLinks.examArchiveTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loading ? t('common.loading') : t('exam.stats', { count: exams.length, downloads: totalDownloads, years: availableYears.length })}
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '& .MuiToggleButton-root': {
              border: 0,
              px: 1.5,
              color: 'text.secondary',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            },
          }}
        >
          <ToggleButton value="card"><CardViewIcon fontSize="small" sx={{ mr: 0.5 }} />卡片</ToggleButton>
          <ToggleButton value="table"><ListViewIcon fontSize="small" sx={{ mr: 0.5 }} />列表</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Filter Bar */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 3, borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder={t('exam.searchPlaceholder')}
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
              <InputLabel>{t('exam.form.examType')}</InputLabel>
              <Select
                value={examTypeFilter}
                label={t('exam.form.examType')}
                onChange={(e) => setExamTypeFilter(e.target.value)}
              >
                <MenuItem value="all">{t('common.all')}</MenuItem>
                {examTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('exam.form.year')}</InputLabel>
              <Select value={yearFilter} label={t('exam.form.year')} onChange={(e) => setYearFilter(e.target.value)}>
                <MenuItem value="all">{t('common.all')}</MenuItem>
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {t('exam.academicYear', { year: year - 1911 })}
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
                <MenuItem value="course">{t('courseReview.form.courseName')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body2" color="text.secondary">
            {t('exam.loadingList')}
          </Typography>
        </Box>
      )}

      {/* Card View */}
      {!loading && viewMode === 'card' && (
        <Grid container spacing={2.5}>
          {filteredExams.map((exam) => (
            <Grid item xs={12} sm={6} lg={4} key={exam.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Header */}
                  <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(220, 38, 38, 0.08)',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <PdfIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }} noWrap title={exam.courseName}>
                        {exam.courseName}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {exam.professor || t('exam.unknownProfessor')}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>

                  {/* Tags */}
                  <Stack direction="row" spacing={0.75} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.75 }}>
                    <Chip label={exam.examType} color="primary" size="small" />
                    <Chip label={`${exam.year - 1911}-${exam.semester}`} variant="outlined" size="small" />
                  </Stack>

                  {/* Meta */}
                  <Stack spacing={0.5} sx={{ mb: 2, flex: 1 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <DateIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">
                        {exam.created_at ? new Date(exam.created_at).toLocaleDateString(i18n.language) : t('exam.unknownDate')}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <DownloadIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">
                        {exam.downloadCount || 0} 次下載
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Actions */}
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handlePreview(exam.id, 'question')}
                        sx={{ flex: 1 }}
                      >
                        {t('exam.previewQuestions')}
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<GetAppIcon />}
                        onClick={() =>
                          handleDownload(
                            exam.id,
                            exam.questionFileName ||
                              `${exam.courseName}_${exam.examType}_題目_${exam.year - 1911}-${exam.semester}.pdf`,
                            'question'
                          )
                        }
                        sx={{ flex: 1 }}
                      >
                        {t('exam.downloadQuestions')}
                      </Button>
                    </Stack>

                    {exam.answerFileName && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          color="success"
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => handlePreview(exam.id, 'answer')}
                          sx={{ flex: 1 }}
                        >
                          {t('exam.previewAnswers')}
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<GetAppIcon />}
                          onClick={() =>
                            handleDownload(
                              exam.id,
                              exam.answerFileName ||
                                `${exam.courseName}_${exam.examType}_答案_${exam.year - 1911}-${exam.semester}.pdf`,
                              'answer'
                            )
                          }
                          sx={{ flex: 1 }}
                        >
                          {t('exam.downloadAnswers')}
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Table View */}
      {!loading && viewMode === 'table' && (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ borderColor: 'divider' }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>課程名稱</TableCell>
                <TableCell>教授</TableCell>
                <TableCell>類型</TableCell>
                <TableCell>學期</TableCell>
                <TableCell>上傳</TableCell>
                <TableCell align="right">下載</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExams.map((exam) => (
                <TableRow key={exam.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PdfIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {exam.courseName}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {exam.professor || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={exam.examType} color="primary" size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {exam.year - 1911}-{exam.semester}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {exam.created_at ? new Date(exam.created_at).toLocaleDateString(i18n.language) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {exam.downloadCount || 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.25} justifyContent="center" alignItems="center" divider={<Divider orientation="vertical" flexItem />}>
                      <Stack direction="row" spacing={0.25}>
                        <Tooltip title={t('exam.previewQuestions')}>
                          <IconButton size="small" onClick={() => handlePreview(exam.id, 'question')}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('exam.downloadQuestions')}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() =>
                              handleDownload(
                                exam.id,
                                exam.questionFileName ||
                                  `${exam.courseName}_${exam.examType}_題目_${exam.year - 1911}-${exam.semester}.pdf`,
                                'question'
                              )
                            }
                          >
                            <GetAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      {exam.answerFileName && (
                        <Stack direction="row" spacing={0.25}>
                          <Tooltip title={t('exam.previewAnswers')}>
                            <IconButton size="small" color="success" onClick={() => handlePreview(exam.id, 'answer')}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('exam.downloadAnswers')}>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                handleDownload(
                                  exam.id,
                                  exam.answerFileName ||
                                    `${exam.courseName}_${exam.examType}_答案_${exam.year - 1911}-${exam.semester}.pdf`,
                                  'answer'
                                )
                              }
                            >
                              <GetAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Empty */}
      {!loading && filteredExams.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SchoolIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {t(exams.length === 0 ? 'exam.empty' : 'exam.noMatch')}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {t(exams.length === 0 ? 'exam.emptyHint' : 'exam.noMatchHint')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ExamArchivePage;
