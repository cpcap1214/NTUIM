import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Button,
  Switch,
  Box,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Snackbar,
  Tabs,
  Tab,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Chip,
  Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
  const { user, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState({});
  const [newPasswordDialog, setNewPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // 上傳相關狀態
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState({ type: '', text: '' });
  
  // 考古題表單狀態
  const [examForm, setExamForm] = useState({
    courseCode: '',
    courseName: '',
    professor: '',
    year: new Date().getFullYear() - 1911,
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

  // 上傳表單錯誤狀態
  const [uploadErrors, setUploadErrors] = useState({});

  useEffect(() => {
    // 等待認證載入完成
    if (authLoading) {
      console.log('Auth is still loading...');
      return;
    }

    // 檢查權限
    console.log('Admin Page - Current user:', user);
    console.log('Admin Page - Username:', user?.username);
    
    if (!user) {
      console.log('No user logged in, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (user.username !== 'cpcap') {
      console.log('User is not cpcap, redirecting to home');
      alert('您沒有權限訪問此頁面，只有 cpcap 用戶可以訪問');
      navigate('/');
      return;
    }
    
    console.log('User is cpcap, fetching users...');
    fetchUsers();
  }, [user, navigate, authLoading]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('AdminPage - fetchUsers token:', token ? '存在' : '不存在');
      console.log('AdminPage - API URL:', `${API_BASE_URL}/admin/users`);
      
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('無法獲取用戶資料');
      }
      
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setEditData({
      username: user.username,
      email: user.email,
      studentId: user.studentId,
      fullName: user.fullName,
      hasPaidFee: user.hasPaidFee,
      role: user.role
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSave = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editData)
      });

      if (!response.ok) {
        throw new Error('更新失敗');
      }

      await response.json();
      
      setSuccess('用戶資料已更新');
      setEditingId(null);
      
      // 如果更新的是當前登入用戶，同步更新 AuthContext
      if (user && parseInt(userId) === user.id) {
        console.log('正在更新當前用戶的 AuthContext 資料');
        updateUser({
          username: editData.username,
          email: editData.email,
          fullName: editData.fullName,
          hasPaidFee: editData.hasPaidFee,
          role: editData.role
        });
      }
      
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword) {
      setError('請輸入新密碼');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${selectedUserId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (!response.ok) {
        throw new Error('密碼更新失敗');
      }

      setSuccess('密碼已更新');
      setNewPasswordDialog(false);
      setNewPassword('');
      setSelectedUserId(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('刪除用戶失敗');
      }

      setSuccess(`用戶 ${userToDelete.username} 已刪除`);
      setDeleteUserDialog(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const togglePasswordVisibility = (userId) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const openPasswordDialog = (userId) => {
    setSelectedUserId(userId);
    setNewPasswordDialog(true);
  };

  // 上傳相關處理函數
  const handleExamChange = (field, value) => {
    setExamForm(prev => ({ ...prev, [field]: value }));
    setUploadErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleCheatSheetChange = (field, value) => {
    setCheatSheetForm(prev => ({ ...prev, [field]: value }));
    setUploadErrors(prev => ({ ...prev, [field]: '' }));
  };

  const addTag = () => {
    if (cheatSheetForm.currentTag && !cheatSheetForm.tags.includes(cheatSheetForm.currentTag)) {
      setCheatSheetForm(prev => ({
        ...prev,
        tags: [...prev.tags, prev.currentTag],
        currentTag: '',
      }));
    }
  };

  const removeTag = (tagToRemove) => {
    setCheatSheetForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadMessage({ type: 'error', text: '只能上傳 PDF 檔案' });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadMessage({ type: 'error', text: '檔案大小不能超過 50MB' });
      return;
    }

    if (activeTab === 1) {
      handleExamChange('file', file);
    } else if (activeTab === 2) {
      handleCheatSheetChange('file', file);
    }
  };

  const validateExamForm = () => {
    const newErrors = {};
    
    if (!examForm.courseCode) newErrors.courseCode = '請輸入課程代碼';
    if (!examForm.courseName) newErrors.courseName = '請輸入課程名稱';
    if (!examForm.professor) newErrors.professor = '請輸入教授姓名';
    if (!examForm.year) newErrors.year = '請選擇年份';
    if (!examForm.file) newErrors.file = '請選擇要上傳的 PDF 檔案';

    setUploadErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCheatSheetForm = () => {
    const newErrors = {};
    
    if (!cheatSheetForm.courseCode) newErrors.courseCode = '請輸入課程代碼';
    if (!cheatSheetForm.courseName) newErrors.courseName = '請輸入課程名稱';
    if (!cheatSheetForm.title) newErrors.title = '請輸入標題';
    if (!cheatSheetForm.description) newErrors.description = '請輸入描述';
    if (cheatSheetForm.tags.length === 0) newErrors.tags = '請至少新增一個標籤';
    if (!cheatSheetForm.file) newErrors.file = '請選擇要上傳的 PDF 檔案';

    setUploadErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadExam = async () => {
    if (!validateExamForm()) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', examForm.file);
    formData.append('courseCode', examForm.courseCode);
    formData.append('courseName', examForm.courseName);
    formData.append('professor', examForm.professor);
    formData.append('year', examForm.year + 1911);
    formData.append('semester', examForm.semester);
    formData.append('examType', examForm.examType);
    formData.append('examAttempt', examForm.examAttempt);

    try {
      const response = await fetch(`${API_BASE_URL}/exams/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上傳失敗');
      }

      setUploadMessage({ type: 'success', text: '考古題上傳成功！' });
      
      setExamForm({
        courseCode: '',
        courseName: '',
        professor: '',
        year: new Date().getFullYear() - 1911,
        semester: '1',
        examType: 'midterm',
        examAttempt: 1,
        file: null,
      });
      
      setUploadProgress(100);
    } catch (error) {
      setUploadMessage({ type: 'error', text: error.message || '上傳失敗，請稍後再試' });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

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
      const response = await fetch(`${API_BASE_URL}/cheat-sheets/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上傳失敗');
      }

      setUploadMessage({ type: 'success', text: '大抄上傳成功！' });
      
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
      setUploadMessage({ type: 'error', text: error.message || '上傳失敗，請稍後再試' });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  if (authLoading || loading) return (
    <Container sx={{ mt: 4 }}>
      <Typography>載入中...</Typography>
    </Container>
  );

  // 檢查管理員權限 - 允許 cpcap 用戶名或 admin 角色
  const isAdmin = user && (user.username === 'cpcap' || user.role === 'admin');
  
  if (!authLoading && !isAdmin) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          您沒有權限訪問此頁面
          <br />
          調試資訊：用戶名={user?.username}，角色={user?.role}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        管理員控制台
      </Typography>
      
      {/* Tab 切換 */}
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="用戶管理" />
        <Tab label="上傳考古題" />
        <Tab label="上傳大抄" />
      </Tabs>

      {/* 用戶管理分頁 */}
      {activeTab === 0 && (
        <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          總共 {users.length} 個用戶
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>用戶名</TableCell>
                <TableCell>密碼</TableCell>
                <TableCell>學號</TableCell>
                <TableCell>姓名</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>繳費狀態</TableCell>
                <TableCell>註冊時間</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>
                    {editingId === user.id ? (
                      <TextField
                        size="small"
                        value={editData.username}
                        onChange={(e) => setEditData({...editData, username: e.target.value})}
                      />
                    ) : (
                      user.username
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {showPasswords[user.id] ? (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {user.passwordDisplay || '••••••••'}
                        </Typography>
                      ) : (
                        '••••••••'
                      )}
                      <IconButton 
                        size="small" 
                        onClick={() => togglePasswordVisibility(user.id)}
                        sx={{ ml: 1 }}
                      >
                        {showPasswords[user.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                      {editingId === user.id && (
                        <Button 
                          size="small" 
                          onClick={() => openPasswordDialog(user.id)}
                          sx={{ ml: 1 }}
                        >
                          更改密碼
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {editingId === user.id ? (
                      <TextField
                        size="small"
                        value={editData.studentId}
                        onChange={(e) => setEditData({...editData, studentId: e.target.value})}
                      />
                    ) : (
                      user.studentId
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === user.id ? (
                      <TextField
                        size="small"
                        value={editData.fullName}
                        onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                      />
                    ) : (
                      user.fullName
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === user.id ? (
                      <TextField
                        size="small"
                        value={editData.email}
                        onChange={(e) => setEditData({...editData, email: e.target.value})}
                      />
                    ) : (
                      user.email
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === user.id ? (
                      <TextField
                        size="small"
                        select
                        SelectProps={{ native: true }}
                        value={editData.role}
                        onChange={(e) => setEditData({...editData, role: e.target.value})}
                      >
                        <option value="admin">管理員</option>
                        <option value="member">會員</option>
                        <option value="user">一般用戶</option>
                      </TextField>
                    ) : (
                      user.role === 'admin' ? '管理員' : 
                      user.role === 'member' ? '會員' : '一般用戶'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === user.id ? (
                      <Switch
                        checked={editData.hasPaidFee}
                        onChange={(e) => setEditData({...editData, hasPaidFee: e.target.checked})}
                      />
                    ) : (
                      <Typography color={user.hasPaidFee ? 'success.main' : 'text.secondary'}>
                        {user.hasPaidFee ? '已繳費' : '未繳費'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.created_at ? new Date(user.created_at).toLocaleString('zh-TW') : '-'}
                  </TableCell>
                  <TableCell>
                    {editingId === user.id ? (
                      <>
                        <IconButton color="primary" onClick={() => handleSave(user.id)}>
                          <SaveIcon />
                        </IconButton>
                        <IconButton color="secondary" onClick={handleCancel}>
                          <CancelIcon />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton onClick={() => handleEdit(user)} title="編輯">
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          onClick={() => openPasswordDialog(user.id)}
                          color="info"
                          title="更改密碼"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton 
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteUserDialog(true);
                          }}
                          color="error"
                          title="刪除用戶"
                          disabled={user.username === 'cpcap'}
                        >
                          <PersonRemoveIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </Paper>
      )}

      {/* 考古題上傳分頁 */}
      {activeTab === 1 && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            上傳考古題
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="課程代碼"
                placeholder="例如：IM1001"
                value={examForm.courseCode}
                onChange={(e) => handleExamChange('courseCode', e.target.value)}
                error={!!uploadErrors.courseCode}
                helperText={uploadErrors.courseCode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="課程名稱"
                placeholder="例如：資訊管理導論"
                value={examForm.courseName}
                onChange={(e) => handleExamChange('courseName', e.target.value)}
                error={!!uploadErrors.courseName}
                helperText={uploadErrors.courseName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="教授姓名"
                placeholder="例如：王教授"
                value={examForm.professor}
                onChange={(e) => handleExamChange('professor', e.target.value)}
                error={!!uploadErrors.professor}
                helperText={uploadErrors.professor}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="年份（民國）"
                value={examForm.year}
                onChange={(e) => handleExamChange('year', parseInt(e.target.value))}
                error={!!uploadErrors.year}
                helperText={uploadErrors.year}
                inputProps={{ min: 100, max: 150 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="第幾次考試"
                value={examForm.examAttempt}
                onChange={(e) => handleExamChange('examAttempt', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ border: '1px dashed #ccc', p: 2, textAlign: 'center' }}>
                <input
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  id="exam-file-upload"
                  type="file"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
                <label htmlFor="exam-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 1 }}
                  >
                    選擇 PDF 檔案
                  </Button>
                </label>
                {examForm.file && (
                  <Typography variant="body2" color="success.main">
                    已選擇：{examForm.file.name}
                  </Typography>
                )}
                {uploadErrors.file && (
                  <Typography variant="body2" color="error">
                    {uploadErrors.file}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* 進度條 */}
          {uploading && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          {/* 上傳按鈕 */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={uploadExam}
              disabled={uploading}
              startIcon={<CloudUploadIcon />}
            >
              {uploading ? '上傳中...' : '上傳考古題'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* 大抄上傳分頁 */}
      {activeTab === 2 && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            上傳學習大抄
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="課程代碼"
                placeholder="例如：IM1001"
                value={cheatSheetForm.courseCode}
                onChange={(e) => handleCheatSheetChange('courseCode', e.target.value)}
                error={!!uploadErrors.courseCode}
                helperText={uploadErrors.courseCode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="課程名稱"
                placeholder="例如：資訊管理導論"
                value={cheatSheetForm.courseName}
                onChange={(e) => handleCheatSheetChange('courseName', e.target.value)}
                error={!!uploadErrors.courseName}
                helperText={uploadErrors.courseName}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="大抄標題"
                placeholder="例如：期末考重點整理"
                value={cheatSheetForm.title}
                onChange={(e) => handleCheatSheetChange('title', e.target.value)}
                error={!!uploadErrors.title}
                helperText={uploadErrors.title}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="描述"
                placeholder="簡述大抄內容..."
                value={cheatSheetForm.description}
                onChange={(e) => handleCheatSheetChange('description', e.target.value)}
                error={!!uploadErrors.description}
                helperText={uploadErrors.description}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="標籤"
                  placeholder="輸入標籤後按 Enter 或點擊新增"
                  value={cheatSheetForm.currentTag}
                  onChange={(e) => handleCheatSheetChange('currentTag', e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={addTag} disabled={!cheatSheetForm.currentTag}>
                        <AddIcon />
                      </IconButton>
                    )
                  }}
                />
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {cheatSheetForm.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => removeTag(tag)}
                    deleteIcon={<DeleteIcon />}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
              {uploadErrors.tags && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {uploadErrors.tags}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ border: '1px dashed #ccc', p: 2, textAlign: 'center' }}>
                <input
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  id="cheatsheet-file-upload"
                  type="file"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
                <label htmlFor="cheatsheet-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 1 }}
                  >
                    選擇 PDF 檔案
                  </Button>
                </label>
                {cheatSheetForm.file && (
                  <Typography variant="body2" color="success.main">
                    已選擇：{cheatSheetForm.file.name}
                  </Typography>
                )}
                {uploadErrors.file && (
                  <Typography variant="body2" color="error">
                    {uploadErrors.file}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* 進度條 */}
          {uploading && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          {/* 上傳按鈕 */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={uploadCheatSheet}
              disabled={uploading}
              startIcon={<CloudUploadIcon />}
            >
              {uploading ? '上傳中...' : '上傳大抄'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* 上傳訊息 */}
      {uploadMessage.text && (
        <Alert 
          severity={uploadMessage.type} 
          sx={{ mt: 3 }}
          onClose={() => setUploadMessage({ type: '', text: '' })}
        >
          {uploadMessage.text}
        </Alert>
      )}

      {/* 更改密碼對話框 */}
      <Dialog open={newPasswordDialog} onClose={() => setNewPasswordDialog(false)}>
        <DialogTitle>更改密碼</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="新密碼"
            type="password"
            fullWidth
            variant="outlined"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setNewPasswordDialog(false);
            setNewPassword('');
          }}>
            取消
          </Button>
          <Button onClick={handlePasswordChange} variant="contained">
            確認更改
          </Button>
        </DialogActions>
      </Dialog>

      {/* 刪除用戶對話框 */}
      <Dialog open={deleteUserDialog} onClose={() => setDeleteUserDialog(false)}>
        <DialogTitle>確認刪除用戶</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除用戶「{userToDelete?.username}」嗎？
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            此操作無法復原，用戶的所有資料將被永久刪除。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteUserDialog(false);
            setUserToDelete(null);
          }}>
            取消
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            確認刪除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 錯誤和成功訊息 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminPage;