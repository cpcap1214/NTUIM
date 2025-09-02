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
import { API_BASE_URL, UPLOAD_BASE_URL } from '../services/api';
import cheatSheetService from '../services/cheatSheetService';
import EditCheatSheetDialog from '../components/EditCheatSheetDialog';

const CheatSheetManagePage = () => {
  const { user } = useAuth();
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
  }, []);

  const fetchCheatSheets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/cheat-sheets`);
      
      if (!response.ok) {
        throw new Error('獲取大抄失敗');
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
        throw new Error('刪除失敗');
      }

      // 重新獲取資料
      await fetchCheatSheets();
      
      setSnackbar({
        open: true,
        message: '大抄已成功刪除',
        severity: 'success'
      });
    } catch (error) {
      console.error('刪除大抄錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message || '刪除失敗',
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
        message: '大抄資訊已更新',
        severity: 'success'
      });
    } catch (error) {
      console.error('更新大抄錯誤:', error);
      throw new Error(error.error || '更新失敗');
    }
  };

  const handleFileUpdate = async (cheatSheetId, formData) => {
    try {
      await cheatSheetService.updateCheatSheetFile(cheatSheetId, formData);
      await fetchCheatSheets(); // 重新載入資料
      setSnackbar({
        open: true,
        message: '大抄檔案已更新',
        severity: 'success'
      });
    } catch (error) {
      console.error('更新大抄檔案錯誤:', error);
      throw new Error(error.error || '檔案更新失敗');
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setCheatSheetToEdit(null);
  };

  const handlePreview = (cheatSheetId) => {
    window.open(`${UPLOAD_BASE_URL}/uploads/cheat_sheets/${cheatSheetId}/preview`, '_blank');
  };

  const handleDownload = async (cheatSheetId, filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cheat-sheets/${cheatSheetId}/download`, {
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
            大抄管理
          </Typography>
          <Typography variant="body1" color="text.secondary">
            管理系統中的所有學習大抄，可檢視、下載和刪除
          </Typography>
        </Box>

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="搜尋標題、課程或內容..."
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
              載入大抄中...
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
                            無標籤
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
                          {sheet.uploader?.fullName || '未知'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {sheet.created_at ? new Date(sheet.created_at).toLocaleDateString('zh-TW') : '未知'}
                    </TableCell>
                    <TableCell align="right">{sheet.downloadCount || 0}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="預覽">
                          <IconButton 
                            size="small" 
                            onClick={() => handlePreview(sheet.id)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="下載">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleDownload(sheet.id, sheet.fileName)}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="編輯">
                          <IconButton 
                            size="small" 
                            color="info"
                            onClick={() => handleEditClick(sheet)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="刪除">
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
              {cheatSheets.length === 0 ? '目前沒有大抄' : '沒有找到符合條件的大抄'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {cheatSheets.length === 0 ? '請先上傳大抄' : '請嘗試調整搜尋條件'}
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
              確定要刪除「{cheatSheetToDelete?.title}」嗎？
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