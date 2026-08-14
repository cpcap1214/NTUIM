import { useTranslation } from 'react-i18next';
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
import { API_BASE_URL } from '../services/api';
import examService from '../services/examService';
import EditExamDialog from '../components/EditExamDialog';

const ExamManagePage = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
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
    // fetchExams 現在引用 t（i18n 訊息），linter 不再視它為穩定值；
    // 加進依賴會無限重抓，照專案既有做法關掉這條規則
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      // 不設限制，獲取所有考古題
      const response = await fetch(`${API_BASE_URL}/exams?limit=1000`);
      
      if (!response.ok) {
        throw new Error(t('exam.fetchFailed'));
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
        throw new Error(t('manage.deleteFailed'));
      }

      // 重新獲取資料
      await fetchExams();
      
      setSnackbar({
        open: true,
        message: t('manage.examDeleted'),
        severity: 'success'
      });
    } catch (error) {
      console.error('刪除考古題錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message || t('manage.deleteFailed'),
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
        message: t('manage.examInfoUpdated'),
        severity: 'success'
      });
    } catch (error) {
      console.error('更新考古題錯誤:', error);
      throw new Error(error.error || t('exam.form.updateFailed'));
    }
  };

  const handleFileUpdate = async (examId, formData) => {
    try {
      await examService.updateExamFiles(examId, formData);
      await fetchExams(); // 重新載入資料
      setSnackbar({
        open: true,
        message: t('manage.examFileUpdated'),
        severity: 'success'
      });
    } catch (error) {
      console.error('更新考古題檔案錯誤:', error);
      throw new Error(error.error || t('exam.form.fileUpdateFailed'));
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setExamToEdit(null);
  };

  const handlePreview = (examId) => {
    // 原本指向 /uploads/exams/{id}/preview，那是磁碟上不存在的路徑（一直是 404）。
    // 改用有認證的 API 端點，跟 ExamArchivePage 一致；token 走 query string 是因為
    // window.open 沒辦法帶 Authorization 標頭。
    const token = localStorage.getItem('token');
    window.open(`${API_BASE_URL}/exams/${examId}/preview/question?token=${token}`, '_blank');
  };

  const handleDownload = async (examId, filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/exams/${examId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(t('cheatSheet.downloadFailed'));
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
        message: t('cheatSheet.downloadFailedRetry'),
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
  if (!user || !isAdmin) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error">
            {t('guard.noPermissionTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('guard.adminRequiredBody')}
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
            {t('nav.adminExamManage')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('manage.examDescription')}
          </Typography>
        </Box>

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder={t('courseReview.admin.searchPlaceholder')}
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
              {t('exam.loadingList')}
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
                    <TableCell>{exam.uploader?.fullName || t('common.unknown')}</TableCell>
                    <TableCell>
                      {exam.created_at ? new Date(exam.created_at).toLocaleDateString(i18n.language) : t('common.unknown')}
                    </TableCell>
                    <TableCell align="right">{exam.downloadCount || 0}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={t('exam.preview')}>
                          <IconButton 
                            size="small" 
                            onClick={() => handlePreview(exam.id)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('exam.download')}>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleDownload(exam.id, exam.fileName)}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.edit')}>
                          <IconButton 
                            size="small" 
                            color="info"
                            onClick={() => handleEditClick(exam)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
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
              {t(exams.length === 0 ? 'exam.empty' : 'exam.noMatch')}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {t(exams.length === 0 ? 'manage.uploadExamFirst' : 'manage.adjustSearch')}
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
              {t('manage.confirmDeleteExam', { name: `${examToDelete?.courseName} - ${examToDelete?.examType}` })}
              <br />
              {t('manage.deleteIrreversible')}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              {t('courseReview.admin.confirmDelete')}
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
