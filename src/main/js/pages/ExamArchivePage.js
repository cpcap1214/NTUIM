import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
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
} from '@mui/icons-material';
import { examFiles } from '../../resources/data/mockData';
import { useAuth } from '../contexts/AuthContext';
import PaymentWall from '../components/PaymentWall';

const ExamArchivePage = () => {
  const { user, hasPaidFee } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  const filteredExams = examFiles
    .filter(exam => {
      const matchesSearch = exam.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           exam.professor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = examTypeFilter === 'all' || exam.examType === examTypeFilter;
      const matchesYear = yearFilter === 'all' || exam.year === yearFilter;
      return matchesSearch && matchesType && matchesYear;
    })
    .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

  const availableYears = [...new Set(examFiles.map(exam => exam.year))].sort((a, b) => b - a);
  const examTypes = [...new Set(examFiles.map(exam => exam.examType))];

  const handleDownload = (fileUrl, filename) => {
    if (!hasPaidFee) {
      alert('請先繳交系學會費才能下載考古題');
      return;
    }
    // 模擬下載功能
    console.log(`Downloading: ${filename} from ${fileUrl}`);
  };

  const handlePreview = (fileUrl) => {
    if (!hasPaidFee) {
      alert('請先繳交系學會費才能預覽考古題');
      return;
    }
    // 模擬預覽功能
    console.log(`Previewing: ${fileUrl}`);
  };

  // 如果沒有繳費，顯示付費牆
  if (!hasPaidFee) {
    return <PaymentWall feature="考古題庫" />;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            考古題庫
          </Typography>
        </Box>

        {/* Search and Filter Bar */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                placeholder="搜尋課程名稱或教授..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>考試類型</InputLabel>
                <Select
                  value={examTypeFilter}
                  label="考試類型"
                  onChange={(e) => setExamTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  {examTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>年份</InputLabel>
                <Select
                  value={yearFilter}
                  label="年份"
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  {availableYears.map(year => (
                    <MenuItem key={year} value={year}>{year}學年</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={viewMode === 'card' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setViewMode('card')}
                  sx={{ minWidth: 80 }}
                >
                  卡片
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setViewMode('table')}
                  sx={{ minWidth: 80 }}
                >
                  列表
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Statistics */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {examFiles.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  份考古題
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {examFiles.reduce((sum, exam) => sum + exam.downloads, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  總下載次數
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {availableYears.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  個學年度
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Content Display */}
        {viewMode === 'card' ? (
          // Card View
          <Grid container spacing={3}>
            {filteredExams.map((exam) => (
              <Grid item xs={12} md={6} lg={4} key={exam.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Course Header */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <PdfIcon sx={{ fontSize: 40, color: 'error.main', mr: 2, mt: 0.5 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                          {exam.courseName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {exam.professor}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Exam Info */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip 
                          label={exam.examType} 
                          color="primary"
                          size="small"
                        />
                        <Chip 
                          label={`${exam.year}-${exam.semester}`} 
                          color="secondary"
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <DateIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          上傳日期: {exam.uploadDate}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <DownloadIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          下載次數: {exam.downloads}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<ViewIcon />}
                        onClick={() => handlePreview(exam.fileUrl)}
                        sx={{ flex: 1 }}
                      >
                        預覽
                      </Button>
                      <Button 
                        variant="contained" 
                        size="small" 
                        startIcon={<GetAppIcon />}
                        onClick={() => handleDownload(exam.fileUrl, `${exam.courseName}_${exam.examType}_${exam.year}-${exam.semester}.pdf`)}
                        sx={{ flex: 1 }}
                      >
                        下載
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          // Table View
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>課程名稱</TableCell>
                  <TableCell>教授</TableCell>
                  <TableCell>考試類型</TableCell>
                  <TableCell>學年學期</TableCell>
                  <TableCell>上傳日期</TableCell>
                  <TableCell align="right">下載次數</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExams.map((exam) => (
                  <TableRow key={exam.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PdfIcon sx={{ fontSize: 20, color: 'error.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {exam.courseName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{exam.professor}</TableCell>
                    <TableCell>
                      <Chip label={exam.examType} color="primary" size="small" />
                    </TableCell>
                    <TableCell>{exam.year}-{exam.semester}</TableCell>
                    <TableCell>{exam.uploadDate}</TableCell>
                    <TableCell align="right">{exam.downloads}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="預覽">
                          <IconButton 
                            size="small" 
                            onClick={() => handlePreview(exam.fileUrl)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="下載">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleDownload(exam.fileUrl, `${exam.courseName}_${exam.examType}_${exam.year}-${exam.semester}.pdf`)}
                          >
                            <GetAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* No Results */}
        {filteredExams.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              沒有找到符合條件的考古題
            </Typography>
            <Typography variant="body2" color="text.disabled">
              請嘗試調整搜尋條件或篩選器
            </Typography>
          </Box>
        )}

        {/* Upload CTA */}
        <Paper sx={{ p: 4, mt: 4, backgroundColor: 'success.light', textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
            分享考古題
          </Typography>
          <Typography variant="body1" color="success.dark" sx={{ mb: 3 }}>
            將你的考古題分享給學弟妹，建立互助學習的社群環境
          </Typography>
          <Button variant="contained" size="large" color="success">
            上傳考古題
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default ExamArchivePage;