import React, { useState, useEffect } from 'react';
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
  Alert,
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
import { useAuth } from '../contexts/AuthContext';
import PaymentWall from '../components/PaymentWall';
import { API_BASE_URL, UPLOAD_BASE_URL } from '../services/api';

const ExamArchivePage = () => {
  const { user, hasPaidFee } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 從 API 獲取考古題資料
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      // 不設限制，獲取所有考古題
      const response = await fetch(`${API_BASE_URL}/exams?limit=1000`);
      
      if (!response.ok) {
        throw new Error('獲取考古題失敗');
      }
      
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
    .filter(exam => {
      const matchesSearch = exam.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (exam.professor && exam.professor.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = examTypeFilter === 'all' || exam.examType === examTypeFilter;
      const matchesYear = yearFilter === 'all' || exam.year === parseInt(yearFilter);
      return matchesSearch && matchesType && matchesYear;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const availableYears = [...new Set(exams.map(exam => exam.year))].sort((a, b) => b - a);
  const examTypes = [...new Set(exams.map(exam => exam.examType))];

  const handleDownload = async (examId, filename, fileType = 'question') => {
    if (!hasPaidFee) {
      alert('請先繳交系學會費才能下載考古題');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/exams/${examId}/download/${fileType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('下載失敗');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下載錯誤:', error);
      alert('下載失敗，請稍後再試');
    }
  };

  const handlePreview = (examId, fileType = 'question') => {
    if (!hasPaidFee) {
      alert('請先繳交系學會費才能預覽考古題');
      return;
    }
    // 帶 token 開啟預覽
    const token = localStorage.getItem('token');
    window.open(`${API_BASE_URL}/exams/${examId}/preview/${fileType}?token=${token}`, '_blank');
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
                  {loading ? '...' : exams.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  份考古題
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {loading ? '...' : exams.reduce((sum, exam) => sum + (exam.downloadCount || 0), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  總下載次數
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {loading ? '...' : availableYears.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  個學年度
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* 錯誤提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* 載入中 */}
        {loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              載入考古題中...
            </Typography>
          </Box>
        )}

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
                          label={`${exam.year - 1911}-${exam.semester}`} 
                          color="secondary"
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <DateIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          上傳日期: {exam.created_at ? new Date(exam.created_at).toLocaleDateString('zh-TW') : '未知'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <DownloadIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          下載次數: {exam.downloadCount || 0}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {/* 題目操作 */}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          startIcon={<ViewIcon />}
                          onClick={() => handlePreview(exam.id, 'question')}
                          sx={{ flex: 1 }}
                        >
                          預覽題目
                        </Button>
                        <Button 
                          variant="contained" 
                          size="small" 
                          startIcon={<GetAppIcon />}
                          onClick={() => handleDownload(exam.id, exam.questionFileName || `${exam.courseName}_${exam.examType}_題目_${exam.year - 1911}-${exam.semester}.pdf`, 'question')}
                          sx={{ flex: 1 }}
                        >
                          下載題目
                        </Button>
                      </Box>
                      
                      {/* 答案操作（如果有答案） */}
                      {exam.answerFileName && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<ViewIcon />}
                            onClick={() => handlePreview(exam.id, 'answer')}
                            sx={{ flex: 1 }}
                            color="success"
                          >
                            預覽答案
                          </Button>
                          <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<GetAppIcon />}
                            onClick={() => handleDownload(exam.id, exam.answerFileName || `${exam.courseName}_${exam.examType}_答案_${exam.year - 1911}-${exam.semester}.pdf`, 'answer')}
                            sx={{ flex: 1 }}
                            color="success"
                          >
                            下載答案
                          </Button>
                        </Box>
                      )}
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
                    <TableCell>{exam.year - 1911}-{exam.semester}</TableCell>
                    <TableCell>{exam.created_at ? new Date(exam.created_at).toLocaleDateString('zh-TW') : '未知'}</TableCell>
                    <TableCell align="right">{exam.downloadCount || 0}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                        {/* 題目操作 */}
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="預覽題目">
                            <IconButton 
                              size="small" 
                              onClick={() => handlePreview(exam.id, 'question')}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="下載題目">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleDownload(exam.id, exam.questionFileName || `${exam.courseName}_${exam.examType}_題目_${exam.year - 1911}-${exam.semester}.pdf`, 'question')}
                            >
                              <GetAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        
                        {/* 答案操作（如果有答案） */}
                        {exam.answerFileName && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="預覽答案">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handlePreview(exam.id, 'answer')}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="下載答案">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handleDownload(exam.id, exam.answerFileName || `${exam.courseName}_${exam.examType}_答案_${exam.year - 1911}-${exam.semester}.pdf`, 'answer')}
                              >
                                <GetAppIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* No Results */}
        {!loading && filteredExams.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {exams.length === 0 ? '目前沒有考古題' : '沒有找到符合條件的考古題'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {exams.length === 0 ? '請聯繫管理員上傳考古題' : '請嘗試調整搜尋條件或篩選器'}
            </Typography>
          </Box>
        )}

      </Box>
    </Container>
  );
};

export default ExamArchivePage;