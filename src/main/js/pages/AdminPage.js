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
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
  const { user, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
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
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

      const result = await response.json();
      
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

  if (authLoading || loading) return (
    <Container sx={{ mt: 4 }}>
      <Typography>載入中...</Typography>
    </Container>
  );

  if (!authLoading && (!user || user.username !== 'cpcap')) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">您沒有權限訪問此頁面</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        用戶管理系統
      </Typography>
      
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
                      <IconButton onClick={() => handleEdit(user)}>
                        <EditIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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