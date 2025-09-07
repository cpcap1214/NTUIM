import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Chip,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL, UPLOAD_BASE_URL } from '../services/api';
import examService from '../services/examService';
import EditExamDialog from '../components/EditExamDialog';

const ExamManagePage = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');

  // 從 API 獲取考古題資料
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      // 不設限制，獲取所有考古題
      const response = await fetch(`${API_BASE_URL}/exams?limit=9999`);
      
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

  const handleDeleteClick = (exam) => {
    setExamToDelete(exam);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!examToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/exams/${examToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('刪除失敗');
      }

      // 重新獲取資料
      await fetchExams();
      
      setSnackbar({
        open: true,
        message: '考古題已成功刪除',
        severity: 'success'
      });
    } catch (error) {
      console.error('刪除考古題錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message || '刪除失敗',
        severity: 'error'
      });
    } finally {
      setDeleteDialogOpen(false);
      setExamToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setExamToDelete(null);
  };

  const handleEditClick = (exam) => {
    setExamToEdit(exam);
    setEditDialogOpen(true);
  };

  const handleEditSave = async (examId, examData) => {
    try {
      await examService.updateExam(examId, examData);
      await fetchExams(); // 重新載入資料
      setSnackbar({
        open: true,
        message: '考古題資訊已更新',
        severity: 'success'
      });
    } catch (error) {
      console.error('更新考古題錯誤:', error);
      throw new Error(error.error || '更新失敗');
    }
  };

  const handleFileUpdate = async (examId, formData) => {
    try {
      await examService.updateExamFiles(examId, formData);
      await fetchExams(); // 重新載入資料
      setSnackbar({
        open: true,
        message: '考古題檔案已更新',
        severity: 'success'
      });
    } catch (error) {
      console.error('更新考古題檔案錯誤:', error);
      throw new Error(error.error || '檔案更新失敗');
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setExamToEdit(null);
  };

  const handlePreview = (examId) => {
    window.open(`${UPLOAD_BASE_URL}/uploads/exams/${examId}/preview`, '_blank');
  };

  const handleDownload = async (examId, filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/exams/${examId}/download`, {
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
      setSnackbar({
        open: true,
        message: '下載失敗，請稍後再試',
        severity: 'error'
      });
    }
  };

  const filteredExams = exams.filter(exam => 
    exam.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exam.professor && exam.professor.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 檢查是否為管理員
  if (!user || user.role !== 'admin') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error">
            權限不足
          </Typography>
          <Typography variant="body1" color="text.secondary">
            只有管理員可以存取此頁面
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            考古題管理
          </Typography>
          <Typography variant="body1" color="text.secondary">
            管理系統中的所有考古題，可檢視、下載和刪除
          </Typography>
        </Box>

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="搜尋課程名稱、代碼或教授..."
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
        </Paper>

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

        {/* 考古題列表 */}
        {!loading && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>課程資訊</TableCell>
                  <TableCell>教授</TableCell>
                  <TableCell>考試資訊</TableCell>
                  <TableCell>檔案資訊</TableCell>
                  <TableCell>上傳者</TableCell>
                  <TableCell>上傳日期</TableCell>
                  <TableCell align="right">下載次數</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExams.map((exam) => (
                  <TableRow key={exam.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {exam.courseName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {exam.courseCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{exam.professor || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PdfIcon sx={{ fontSize: 16, color: 'error.main' }} />
                        <Box>
                          <Typography variant="caption" display="block">
                            {exam.fileName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(exam.fileSize / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{exam.uploader?.fullName || '未知'}</TableCell>
                    <TableCell>
                      {exam.created_at ? new Date(exam.created_at).toLocaleDateString('zh-TW') : '未知'}
                    </TableCell>
                    <TableCell align="right">{exam.downloadCount || 0}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="預覽">
                          <IconButton 
                            size="small" 
                            onClick={() => handlePreview(exam.id)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="下載">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleDownload(exam.id, exam.fileName)}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="編輯">
                          <IconButton 
                            size="small" 
                            color="info"
                            onClick={() => handleEditClick(exam)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="刪除">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteClick(exam)}
                          >
                            <DeleteIcon fontSize="small" />
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

        {/* 沒有結果 */}
        {!loading && filteredExams.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {exams.length === 0 ? '目前沒有考古題' : '沒有找到符合條件的考古題'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {exams.length === 0 ? '請先上傳考古題' : '請嘗試調整搜尋條件'}
            </Typography>
          </Box>
        )}

        {/* 刪除確認對話框 */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
        >
          <DialogTitle>確認刪除考古題</DialogTitle>
          <DialogContent>
            <DialogContentText>
              確定要刪除「{examToDelete?.courseName} - {examToDelete?.examType}」嗎？
              <br />
              此操作無法復原，檔案將永久刪除。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>
              取消
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              確認刪除
            </Button>
          </DialogActions>
        </Dialog>

        {/* 編輯考古題對話框 */}
        <EditExamDialog
          open={editDialogOpen}
          onClose={handleEditClose}
          exam={examToEdit}
          onSave={handleEditSave}
          onFileUpdate={handleFileUpdate}
        />

        {/* Snackbar 通知 */}
        <Snackbar 
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default ExamManagePage;