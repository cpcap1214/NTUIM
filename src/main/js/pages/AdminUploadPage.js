import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Grid,
  Chip,
  Stack,
  IconButton,
  FormHelperText,
  Snackbar,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminUploadPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 考古題表單狀態
  const [examForm, setExamForm] = useState({
    courseCode: '',
    courseName: '',
    professor: '',
    year: new Date().getFullYear() - 1911, // 民國紀年
    semester: '1',
    examType: 'midterm',
    examAttempt: 1,
    file: null,
  });

  // 大抄表單狀態
  const [cheatSheetForm, setCheatSheetForm] = useState({
    courseCode: '',
    courseName: '',
    title: '',
    description: '',
    tags: [],
    currentTag: '',
    file: null,
  });

  // 表單錯誤狀態
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // 除錯資訊
    console.log('AdminUploadPage - Current user:', user);
    console.log('AdminUploadPage - isAdmin:', isAdmin);
    console.log('AdminUploadPage - user?.role:', user?.role);
    console.log('AdminUploadPage - authLoading:', authLoading);
    console.log('AdminUploadPage - localStorage token:', localStorage.getItem('token') ? '存在' : '不存在');
    console.log('AdminUploadPage - localStorage user:', localStorage.getItem('user'));
    
    // 等待認證載入完成
    if (authLoading) {
      console.log('等待認證載入...');
      return;
    }
    
    // 檢查是否為管理員
    if (!isAdmin) {
      console.log('權限不足，重導向到首頁');
      alert('只有管理員可以訪問此頁面');
      navigate('/');
    }
  }, [isAdmin, navigate, user, authLoading]);

  // 處理考古題表單變更
  const handleExamChange = (field, value) => {
    setExamForm(prev => ({ ...prev, [field]: value }));
    // 清除該欄位的錯誤
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // 處理大抄表單變更
  const handleCheatSheetChange = (field, value) => {
    setCheatSheetForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // 新增標籤
  const addTag = () => {
    if (cheatSheetForm.currentTag && !cheatSheetForm.tags.includes(cheatSheetForm.currentTag)) {
      setCheatSheetForm(prev => ({
        ...prev,
        tags: [...prev.tags, prev.currentTag],
        currentTag: '',
      }));
    }
  };

  // 刪除標籤
  const removeTag = (tagToRemove) => {
    setCheatSheetForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  // 處理檔案選擇
  const handleFileSelect = (file) => {
    if (!file) return;

    // 檢查檔案類型
    if (file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: '只能上傳 PDF 檔案' });
      return;
    }

    // 檢查檔案大小（限制 10MB）
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: '檔案大小不能超過 10MB' });
      return;
    }

    if (activeTab === 0) {
      handleExamChange('file', file);
    } else {
      handleCheatSheetChange('file', file);
    }
  };

  // 驗證考古題表單
  const validateExamForm = () => {
    const newErrors = {};
    
    if (!examForm.courseCode) newErrors.courseCode = '請輸入課程代碼';
    if (!examForm.courseName) newErrors.courseName = '請輸入課程名稱';
    if (!examForm.professor) newErrors.professor = '請輸入教授姓名';
    if (!examForm.year) newErrors.year = '請選擇年份';
    if (!examForm.file) newErrors.file = '請選擇要上傳的 PDF 檔案';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 驗證大抄表單
  const validateCheatSheetForm = () => {
    const newErrors = {};
    
    if (!cheatSheetForm.courseCode) newErrors.courseCode = '請輸入課程代碼';
    if (!cheatSheetForm.courseName) newErrors.courseName = '請輸入課程名稱';
    if (!cheatSheetForm.title) newErrors.title = '請輸入標題';
    if (!cheatSheetForm.description) newErrors.description = '請輸入描述';
    if (cheatSheetForm.tags.length === 0) newErrors.tags = '請至少新增一個標籤';
    if (!cheatSheetForm.file) newErrors.file = '請選擇要上傳的 PDF 檔案';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 上傳考古題
  const uploadExam = async () => {
    if (!validateExamForm()) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', examForm.file);
    formData.append('courseCode', examForm.courseCode);
    formData.append('courseName', examForm.courseName);
    formData.append('professor', examForm.professor);
    formData.append('year', examForm.year + 1911); // 轉換為西元
    formData.append('semester', examForm.semester);
    formData.append('examType', examForm.examType);
    formData.append('examAttempt', examForm.examAttempt);

    try {
      const response = await fetch('http://localhost:5001/api/exams/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上傳失敗');
      }

      setMessage({ type: 'success', text: '考古題上傳成功！' });
      
      // 重置表單
      setExamForm({
        courseCode: '',
        courseName: '',
        professor: '',
        year: new Date().getFullYear(),
        semester: '1',
        examType: 'midterm',
        file: null,
      });
      
      // 模擬進度
      setUploadProgress(100);
    } catch (error) {
      console.error('上傳錯誤:', error);
      setMessage({ type: 'error', text: error.message || '上傳失敗，請稍後再試' });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // 上傳大抄
  const uploadCheatSheet = async () => {
    if (!validateCheatSheetForm()) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', cheatSheetForm.file);
    formData.append('courseCode', cheatSheetForm.courseCode);
    formData.append('courseName', cheatSheetForm.courseName);
    formData.append('title', cheatSheetForm.title);
    formData.append('description', cheatSheetForm.description);
    formData.append('tags', JSON.stringify(cheatSheetForm.tags));

    try {
      const response = await fetch('http://localhost:5001/api/cheat-sheets/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上傳失敗');
      }

      setMessage({ type: 'success', text: '大抄上傳成功！' });
      
      // 重置表單
      setCheatSheetForm({
        courseCode: '',
        courseName: '',
        title: '',
        description: '',
        tags: [],
        currentTag: '',
        file: null,
      });
      
      setUploadProgress(100);
    } catch (error) {
      console.error('上傳錯誤:', error);
      setMessage({ type: 'error', text: error.message || '上傳失敗，請稍後再試' });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // 如果不是管理員，不顯示內容
  if (!isAdmin) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* 標題 */}
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          管理員上傳中心
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          上傳考古題和大抄資源供學生下載
        </Typography>

        {/* Tab 切換 */}
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="上傳考古題" />
          <Tab label="上傳大抄" />
        </Tabs>

        {/* 考古題上傳表單 */}
        {activeTab === 0 && (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="課程代碼"
                  placeholder="例如：IM1001"
                  value={examForm.courseCode}
                  onChange={(e) => handleExamChange('courseCode', e.target.value)}
                  error={!!errors.courseCode}
                  helperText={errors.courseCode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="課程名稱"
                  placeholder="例如：資訊管理導論"
                  value={examForm.courseName}
                  onChange={(e) => handleExamChange('courseName', e.target.value)}
                  error={!!errors.courseName}
                  helperText={errors.courseName}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="教授姓名"
                  placeholder="例如：王大明"
                  value={examForm.professor}
                  onChange={(e) => handleExamChange('professor', e.target.value)}
                  error={!!errors.professor}
                  helperText={errors.professor}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="學年度 (民國)"
                  value={examForm.year}
                  onChange={(e) => handleExamChange('year', parseInt(e.target.value))}
                  error={!!errors.year}
                  helperText={errors.year || `例如：${new Date().getFullYear() - 1911} 學年度`}
                  inputProps={{ min: 80, max: 200 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>學期</InputLabel>
                  <Select
                    value={examForm.semester}
                    label="學期"
                    onChange={(e) => handleExamChange('semester', e.target.value)}
                  >
                    <MenuItem value="1">上學期</MenuItem>
                    <MenuItem value="2">下學期</MenuItem>
                    <MenuItem value="summer">暑期</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>考試類型</InputLabel>
                  <Select
                    value={examForm.examType}
                    label="考試類型"
                    onChange={(e) => handleExamChange('examType', e.target.value)}
                  >
                    <MenuItem value="midterm">期中考</MenuItem>
                    <MenuItem value="final">期末考</MenuItem>
                    <MenuItem value="quiz">小考</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth>
                  <InputLabel>考試次數</InputLabel>
                  <Select
                    value={examForm.examAttempt}
                    label="考試次數"
                    onChange={(e) => handleExamChange('examAttempt', e.target.value)}
                  >
                    <MenuItem value={1}>第一次</MenuItem>
                    <MenuItem value={2}>第二次</MenuItem>
                    <MenuItem value={3}>第三次</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <input
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    id="exam-file-input"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                  <label htmlFor="exam-file-input">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<UploadIcon />}
                      size="large"
                    >
                      選擇 PDF 檔案
                    </Button>
                  </label>
                  {examForm.file && (
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        icon={<PdfIcon />}
                        label={examForm.file.name}
                        onDelete={() => handleExamChange('file', null)}
                        color="primary"
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        檔案大小: {(examForm.file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                  )}
                  {errors.file && (
                    <FormHelperText error sx={{ mt: 1 }}>
                      {errors.file}
                    </FormHelperText>
                  )}
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="large"
                onClick={uploadExam}
                disabled={uploading}
                startIcon={uploading ? null : <UploadIcon />}
              >
                {uploading ? '上傳中...' : '上傳考古題'}
              </Button>
            </Box>
          </Box>
        )}

        {/* 大抄上傳表單 */}
        {activeTab === 1 && (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="課程代碼"
                  placeholder="例如：IM2001"
                  value={cheatSheetForm.courseCode}
                  onChange={(e) => handleCheatSheetChange('courseCode', e.target.value)}
                  error={!!errors.courseCode}
                  helperText={errors.courseCode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="課程名稱"
                  placeholder="例如：資料結構"
                  value={cheatSheetForm.courseName}
                  onChange={(e) => handleCheatSheetChange('courseName', e.target.value)}
                  error={!!errors.courseName}
                  helperText={errors.courseName}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="標題"
                  placeholder="例如：資料結構期末總整理"
                  value={cheatSheetForm.title}
                  onChange={(e) => handleCheatSheetChange('title', e.target.value)}
                  error={!!errors.title}
                  helperText={errors.title}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="描述"
                  placeholder="簡單描述這份大抄的內容..."
                  value={cheatSheetForm.description}
                  onChange={(e) => handleCheatSheetChange('description', e.target.value)}
                  error={!!errors.description}
                  helperText={errors.description}
                />
              </Grid>
              <Grid item xs={12}>
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size="small"
                      label="新增標籤"
                      placeholder="例如：演算法"
                      value={cheatSheetForm.currentTag}
                      onChange={(e) => handleCheatSheetChange('currentTag', e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button
                      variant="outlined"
                      onClick={addTag}
                      startIcon={<AddIcon />}
                    >
                      新增
                    </Button>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {cheatSheetForm.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        onDelete={() => removeTag(tag)}
                        color="primary"
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                  {errors.tags && (
                    <FormHelperText error>
                      {errors.tags}
                    </FormHelperText>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <input
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    id="cheatsheet-file-input"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                  <label htmlFor="cheatsheet-file-input">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<UploadIcon />}
                      size="large"
                    >
                      選擇 PDF 檔案
                    </Button>
                  </label>
                  {cheatSheetForm.file && (
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        icon={<PdfIcon />}
                        label={cheatSheetForm.file.name}
                        onDelete={() => handleCheatSheetChange('file', null)}
                        color="primary"
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        檔案大小: {(cheatSheetForm.file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                  )}
                  {errors.file && (
                    <FormHelperText error sx={{ mt: 1 }}>
                      {errors.file}
                    </FormHelperText>
                  )}
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="large"
                onClick={uploadCheatSheet}
                disabled={uploading}
                startIcon={uploading ? null : <UploadIcon />}
              >
                {uploading ? '上傳中...' : '上傳大抄'}
              </Button>
            </Box>
          </Box>
        )}

        {/* 上傳進度 */}
        {uploadProgress > 0 && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              上傳進度: {uploadProgress}%
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 訊息提示 */}
      <Snackbar
        open={!!message.text}
        autoHideDuration={6000}
        onClose={() => setMessage({ type: '', text: '' })}
      >
        <Alert
          severity={message.type}
          onClose={() => setMessage({ type: '', text: '' })}
          icon={message.type === 'success' ? <SuccessIcon /> : <ErrorIcon />}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminUploadPage;