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
  Avatar,
  Stack,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  Tag as TagIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';
import cheatSheetService from '../services/cheatSheetService';
import EditCheatSheetDialog from '../components/EditCheatSheetDialog';

const CheatSheetManagePage = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [cheatSheets, setCheatSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cheatSheetToDelete, setCheatSheetToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cheatSheetToEdit, setCheatSheetToEdit] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');

  // 從 API 獲取大抄資料
  useEffect(() => {
    fetchCheatSheets();
    // fetchCheatSheets 現在引用 t（i18n 訊息），linter 不再視它為穩定值；
    // 加進依賴會無限重抓，照專案既有做法關掉這條規則
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCheatSheets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/cheat-sheets`);
      
      if (!response.ok) {
        throw new Error(t('cheatSheet.fetchFailed'));
      }
      
      const result = await response.json();
      setCheatSheets(result.data || []);
    } catch (err) {
      console.error('獲取大抄錯誤:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (cheatSheet) => {
    setCheatSheetToDelete(cheatSheet);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cheatSheetToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/cheat-sheets/${cheatSheetToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(t('manage.deleteFailed'));
      }

      // 重新獲取資料
      await fetchCheatSheets();
      
      setSnackbar({
        open: true,
        message: t('manage.cheatSheetDeleted'),
        severity: 'success'
      });
    } catch (error) {
      console.error('刪除大抄錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message || t('manage.deleteFailed'),
        severity: 'error'
      });
    } finally {
      setDeleteDialogOpen(false);
      setCheatSheetToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCheatSheetToDelete(null);
  };

  const handleEditClick = (cheatSheet) => {
    setCheatSheetToEdit(cheatSheet);
    setEditDialogOpen(true);
  };

  const handleEditSave = async (cheatSheetId, cheatSheetData) => {
    try {
      await cheatSheetService.updateCheatSheet(cheatSheetId, cheatSheetData);
      await fetchCheatSheets(); // 重新載入資料
      setSnackbar({
        open: true,
        message: t('manage.cheatSheetInfoUpdated'),
        severity: 'success'
      });
    } catch (error) {
      console.error('更新大抄錯誤:', error);
      throw new Error(error.error || t('exam.form.updateFailed'));
    }
  };

  const handleFileUpdate = async (cheatSheetId, formData) => {
    try {
      await cheatSheetService.updateCheatSheetFile(cheatSheetId, formData);
      await fetchCheatSheets(); // 重新載入資料
      setSnackbar({
        open: true,
        message: t('manage.cheatSheetFileUpdated'),
        severity: 'success'
      });
    } catch (error) {
      console.error('更新大抄檔案錯誤:', error);
      throw new Error(error.error || t('exam.form.fileUpdateFailed'));
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setCheatSheetToEdit(null);
  };

  const handlePreview = (cheatSheetId) => {
    // 原本指向 /uploads/cheat_sheets/{id}/preview，那是磁碟上不存在的路徑（一直是 404）。
    // 改用有認證的 API 端點，跟 CheatSheetPage 一致。
    const token = localStorage.getItem('token');
    window.open(`${API_BASE_URL}/cheat-sheets/${cheatSheetId}/preview?token=${token}`, '_blank');
  };

  const handleDownload = async (cheatSheetId, filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cheat-sheets/${cheatSheetId}/download`, {
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

  // 這些鍵是資料庫裡實際的標籤字串，不是介面文案——抽到語言檔會讓配色在英文介面下失效
  const getTagColor = (tag) => {
    const colors = {
      '資料庫': 'primary',
      'React': 'info',
      'JavaScript': 'warning',
      '前端': 'success',
      '機器學習': 'secondary',
      'AI': 'error',
      '演算法': 'primary',
      '理論': 'info',
    };
    return colors[tag] || 'default';
  };

  const filteredCheatSheets = cheatSheets.filter(sheet => 
    sheet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sheet.description && sheet.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
            {t('nav.adminCheatSheetManage')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('manage.cheatSheetDescription')}
          </Typography>
        </Box>

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder={t('cheatSheet.searchPlaceholder')}
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
              {t('cheatSheet.loadingList')}
            </Typography>
          </Box>
        )}

        {/* 大抄列表 */}
        {!loading && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>標題</TableCell>
                  <TableCell>課程資訊</TableCell>
                  <TableCell>描述</TableCell>
                  <TableCell>標籤</TableCell>
                  <TableCell>檔案資訊</TableCell>
                  <TableCell>上傳者</TableCell>
                  <TableCell>上傳日期</TableCell>
                  <TableCell align="right">下載次數</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCheatSheets.map((sheet) => (
                  <TableRow key={sheet.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DescriptionIcon sx={{ fontSize: 20, color: 'success.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {sheet.title}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {sheet.courseName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sheet.courseCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {sheet.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 150 }}>
                        {sheet.tags && sheet.tags.length > 0 ? (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {sheet.tags.slice(0, 2).map(tag => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                color={getTagColor(tag)}
                                variant="outlined"
                              />
                            ))}
                            {sheet.tags.length > 2 && (
                              <Chip 
                                label={`+${sheet.tags.length - 2}`} 
                                size="small" 
                                variant="outlined" 
                              />
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            {t('manage.noTags')}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="caption" display="block">
                          {sheet.fileName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(sheet.fileSize / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                          {sheet.uploader ? sheet.uploader.fullName.charAt(0) : '?'}
                        </Avatar>
                        <Typography variant="body2">
                          {sheet.uploader?.fullName || t('common.unknown')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {sheet.created_at ? new Date(sheet.created_at).toLocaleDateString(i18n.language) : t('common.unknown')}
                    </TableCell>
                    <TableCell align="right">{sheet.downloadCount || 0}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={t('exam.preview')}>
                          <IconButton 
                            size="small" 
                            onClick={() => handlePreview(sheet.id)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('exam.download')}>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleDownload(sheet.id, sheet.fileName)}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.edit')}>
                          <IconButton 
                            size="small" 
                            color="info"
                            onClick={() => handleEditClick(sheet)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteClick(sheet)}
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
        {!loading && filteredCheatSheets.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <TagIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t(cheatSheets.length === 0 ? 'cheatSheet.empty' : 'cheatSheet.noMatch')}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {t(cheatSheets.length === 0 ? 'manage.uploadCheatSheetFirst' : 'manage.adjustSearch')}
            </Typography>
          </Box>
        )}

        {/* 刪除確認對話框 */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
        >
          <DialogTitle>確認刪除大抄</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('manage.confirmDeleteCheatSheet', { name: cheatSheetToDelete?.title })}
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

        {/* 編輯大抄對話框 */}
        <EditCheatSheetDialog
          open={editDialogOpen}
          onClose={handleEditClose}
          cheatSheet={cheatSheetToEdit}
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

export default CheatSheetManagePage;
