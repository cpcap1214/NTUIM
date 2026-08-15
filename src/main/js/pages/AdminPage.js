import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Snackbar,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Chip,
  Stack,
  Tooltip,
  InputAdornment,
  Avatar,
  DialogContentText,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RateReviewIcon from '@mui/icons-material/RateReview';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ViewIcon from '@mui/icons-material/Visibility';
import BadgeIcon from '@mui/icons-material/Badge';
import PaidIcon from '@mui/icons-material/Paid';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';
import courseReviewService from '../services/courseReviewService';
import roleService from '../services/roleService';
import moduleService from '../services/moduleService';
import announcementService from '../services/announcementService';
import ReviewCard from '../components/courseReview/ReviewCard';
import { translateApiError } from '../utils';

// 後台各功能對應的權限與分頁編號。持有其中任何一項就能進入管理控制台，
// 實際看得到哪些功能由每張 tile 各自的權限決定。順序即「第一個有權限的功能」判定順序。
const PERMISSION_TO_TAB = {
  'users.manage': 0,
  'roles.manage': 7,
  'modules.manage': 8,
  'exams.manage': 3,
  'cheatSheets.manage': 4,
  'courseReviews.moderate': 5,
  'exams.upload': 1,
  'cheatSheets.upload': 2,
  'courseReviews.payout': 6,
};
const CONSOLE_PERMISSIONS = Object.keys(PERMISSION_TO_TAB);

// 發放狀態列的標籤樣式。filled 與 outlined 兩種變體並排時，outlined 多出的 1px 邊框
// 會讓它看起來比較矮、字也比較細，所以高度與字級都明確指定，兩顆共用同一組值。
const PAYOUT_CHIP_SX = {
  height: 24,
  fontSize: '0.75rem',
  fontWeight: 500,
  '& .MuiChip-label': { px: 1 },
};

// 發放狀態 → 標籤顏色。declined 用中性灰而不是紅色：
// 「不發放」是正常的結案結果（多半只是超出名額），不是錯誤，不該看起來像警報
const PAYOUT_STATUS_COLOR = {
  pending: 'warning',
  paid: 'success',
  declined: 'default',
};

// 投稿/發放時間一律顯示台北時間、24 時制。
// 不指定 timeZone 的話跟著瀏覽器跑，總務在國外對帳就會看到差 8 小時的時間。
const TAIPEI_DATE = { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' };
const TAIPEI_TIME = { timeZone: 'Asia/Taipei', hour12: false, hour: '2-digit', minute: '2-digit' };

const AdminPage = () => {
  const { t, i18n } = useTranslation();
  // isAdmin 一律取自 AuthContext（全前端唯一來源），這個檔案原本自己重複推導了 4 次
  const { user, loading: authLoading, updateUser, isAdmin: hasAdminRole, hasPermission, startPreview } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newPasswordDialog, setNewPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // 上傳相關狀態
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState({ type: '', text: '' });

  // 考古題管理相關狀態
  const [exams, setExams] = useState([]);
  const [examSearchTerm, setExamSearchTerm] = useState('');
  const [examDeleteDialog, setExamDeleteDialog] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  const [examLoading, setExamLoading] = useState(false);

  // 大抄管理相關狀態
  const [cheatSheets, setCheatSheets] = useState([]);
  const [cheatSheetSearchTerm, setCheatSheetSearchTerm] = useState('');
  const [cheatSheetDeleteDialog, setCheatSheetDeleteDialog] = useState(false);
  const [cheatSheetToDelete, setCheatSheetToDelete] = useState(null);
  const [cheatSheetLoading, setCheatSheetLoading] = useState(false);

  // 課程評價管理相關狀態
  const [courseReviews, setCourseReviews] = useState([]);
  const [courseReviewSearchTerm, setCourseReviewSearchTerm] = useState('');
  const [courseReviewFilter, setCourseReviewFilter] = useState('pending');
  const [courseReviewTermFilter, setCourseReviewTermFilter] = useState('all');
  const [courseReviewProfessorFilter, setCourseReviewProfessorFilter] = useState('all');
  const [courseReviewLoading, setCourseReviewLoading] = useState(false);
  const [courseReviewRejectDialog, setCourseReviewRejectDialog] = useState(false);
  const [reviewToReject, setReviewToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [courseReviewDeleteDialog, setCourseReviewDeleteDialog] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  // 身分組與模組管理相關狀態
  const [allRoles, setAllRoles] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleDialog, setRoleDialog] = useState(false);
  const [roleForm, setRoleForm] = useState({ id: null, key: '', name: '', description: '', color: '', priority: 0, permissions: [] });
  const [roleDeleteDialog, setRoleDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [moduleSettings, setModuleSettings] = useState([]);
  const [moduleLoading, setModuleLoading] = useState(false);

  // 公告管理相關狀態。
  // publishAt / expireAt 在表單裡是 datetime-local 需要的「本地牆上時間」格式，
  // 送出前才轉成 UTC ISO；載入既有公告時反向轉回來（見 toLocalInput / toUtcIso）。
  const [announcements, setAnnouncements] = useState([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementDialog, setAnnouncementDialog] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    id: null, title: '', body: '', level: 'info', enabled: true, publishAt: '', expireAt: '',
  });
  const [announcementDeleteDialog, setAnnouncementDeleteDialog] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);

  // 回饋金發放管理相關狀態
  const [payouts, setPayouts] = useState([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutFilter, setPayoutFilter] = useState('pending');
  const [payoutSearchTerm, setPayoutSearchTerm] = useState('');

  // 考古題表單狀態
  const [examForm, setExamForm] = useState({
    courseCode: '',
    courseName: '',
    professor: '',
    year: new Date().getFullYear() - 1911,
    semester: '1',
    examType: 'midterm',
    examAttempt: 1,
    questionFile: null,
    answerFile: null,
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
    
    // 只要持有任何一項後台權限就能進來，實際看得到哪些功能由 adminSections 各自的權限決定
    if (!CONSOLE_PERMISSIONS.some((p) => hasPermission(p))) {
      console.log('User does not have console access, redirecting to home');
      alert(t('admin.noAccess'));
      navigate('/');
      return;
    }

    // 沒有用戶管理權限的人（例如純總務）呼叫會被後端擋下，不必浪費一次請求
    if (hasPermission('users.manage')) {
      fetchUsers();
    }

    // 如果是管理分頁，載入對應資料
    if (activeTab === 3) {
      fetchExams();
    } else if (activeTab === 4) {
      fetchCheatSheets();
    } else if (activeTab === 5) {
      fetchCourseReviews();
    } else if (activeTab === 6) {
      fetchPayouts();
    } else if (activeTab === 7) {
      fetchRoles();
    } else if (activeTab === 8) {
      fetchModuleSettings();
      // 模組白名單的下拉選單需要身分組清單
      if (allRoles.length === 0) fetchRoles();
    } else if (activeTab === 9) {
      fetchAnnouncements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, authLoading, activeTab]);

  // 用戶管理的身分組多選需要身分組清單。
  //
  // 依賴一定要含 user：頁面直接載入時 activeTab 就是 0，但那一刻 user 還沒回來，
  // hasPermission 是 false 所以不抓；之後 user 到了，effect 卻不會因為 activeTab
  // 沒變而重跑，身分組選單就永遠是空的（先切到別的分頁再切回來才會好）。
  useEffect(() => {
    if (activeTab === 0 && hasPermission('roles.manage') && allRoles.length === 0) {
      fetchRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  // 課程評價的篩選條件變更時重新載入
  useEffect(() => {
    if (activeTab === 5) {
      fetchCourseReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseReviewFilter]);

  // 發放清單的篩選條件變更時重新載入
  useEffect(() => {
    if (activeTab === 6) {
      fetchPayouts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutFilter]);

  // 純總務身分（非管理員）預設落在回饋金發放，不要停在他們沒權限的用戶管理分頁
  useEffect(() => {
    if (!user) return;
    // 沒有用戶管理權限的人（例如純總務）不要停在他們看不到的用戶管理分頁，
    // 自動落到第一個他們有權限使用的功能
    if (!hasPermission('users.manage')) {
      const firstAllowed = CONSOLE_PERMISSIONS.find((p) => hasPermission(p));
      if (firstAllowed) setActiveTab(PERMISSION_TO_TAB[firstAllowed]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hasAdminRole]);

  const fetchRoles = async () => {
    try {
      setRoleLoading(true);
      const [roles, catalog] = await Promise.all([
        roleService.getRoles(),
        roleService.getPermissionCatalog().catch(() => []),
      ]);
      setAllRoles(roles);
      setPermissionCatalog(catalog);
    } catch (err) {
      setError(translateApiError(err, t('admin.roles.fetchFailed')));
    } finally {
      setRoleLoading(false);
    }
  };

  const openRoleDialog = (role = null) => {
    setRoleForm(role
      ? { ...role, permissions: role.permissions || [] }
      : { id: null, key: '', name: '', description: '', color: '', priority: 0, permissions: [] });
    setRoleDialog(true);
  };

  const handleSaveRole = async () => {
    try {
      if (roleForm.id) {
        await roleService.updateRole(roleForm.id, roleForm);
      } else {
        await roleService.createRole(roleForm);
      }
      setRoleDialog(false);
      await fetchRoles();
      setSuccess(t('admin.roles.saved'));
    } catch (err) {
      setError(translateApiError(err, t('admin.roles.saveFailed')));
    }
  };

  const handleDeleteRole = async () => {
    try {
      await roleService.deleteRole(roleToDelete.id);
      await fetchRoles();
      setSuccess(t('admin.roles.deleted'));
    } catch (err) {
      setError(translateApiError(err, t('admin.roles.deleteFailed')));
    } finally {
      setRoleDeleteDialog(false);
      setRoleToDelete(null);
    }
  };

  const fetchModuleSettings = async () => {
    try {
      setModuleLoading(true);
      setModuleSettings(await moduleService.getModuleSettings());
    } catch (err) {
      setError(translateApiError(err, t('admin.modules.fetchFailed')));
    } finally {
      setModuleLoading(false);
    }
  };

  const handleUpdateModule = async (key, payload) => {
    try {
      await moduleService.updateModule(key, payload);
      await fetchModuleSettings();
      setSuccess(t('admin.modules.saved'));
    } catch (err) {
      setError(translateApiError(err, t('admin.modules.saveFailed')));
    }
  };

  // --- 公告管理 -------------------------------------------------------------
  //
  // 時區：資料庫存的是 UTC ISO 字串，但 <input type="datetime-local"> 只認
  // 「YYYY-MM-DDTHH:mm」形式的本地牆上時間，而且不帶時區資訊。
  // 兩邊各轉一次，少了任何一次台灣就會整整差 8 小時——而症狀只會是
  // 「公告設好了卻沒跳出來」，完全看不出跟時區有關。

  // UTC ISO → datetime-local 的本地字串
  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    // 減掉時區偏移後取 ISO 的前 16 字元，就是本地牆上時間
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  // datetime-local 的本地字串 → UTC ISO（空字串代表不限制，要送 null）
  const toUtcIso = (localValue) => (localValue ? new Date(localValue).toISOString() : null);

  const fetchAnnouncements = async () => {
    try {
      setAnnouncementLoading(true);
      setAnnouncements(await announcementService.getAll());
    } catch (err) {
      setError(translateApiError(err, t('announcement.admin.fetchFailed')));
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const openAnnouncementDialog = (announcement = null) => {
    setAnnouncementForm(announcement
      ? {
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        level: announcement.level,
        enabled: Boolean(announcement.enabled),
        publishAt: toLocalInput(announcement.publishAt),
        expireAt: toLocalInput(announcement.expireAt),
      }
      : { id: null, title: '', body: '', level: 'info', enabled: true, publishAt: '', expireAt: '' });
    setAnnouncementDialog(true);
  };

  const handleSaveAnnouncement = async () => {
    const payload = {
      title: announcementForm.title,
      body: announcementForm.body,
      level: announcementForm.level,
      enabled: announcementForm.enabled,
      publishAt: toUtcIso(announcementForm.publishAt),
      expireAt: toUtcIso(announcementForm.expireAt),
    };

    try {
      if (announcementForm.id) {
        await announcementService.update(announcementForm.id, payload);
      } else {
        await announcementService.create(payload);
      }
      setAnnouncementDialog(false);
      await fetchAnnouncements();
      setSuccess(t('announcement.admin.saved'));
    } catch (err) {
      setError(translateApiError(err, t('announcement.admin.saveFailed')));
    }
  };

  const handleDeleteAnnouncement = async () => {
    try {
      await announcementService.remove(announcementToDelete.id);
      setAnnouncementDeleteDialog(false);
      setAnnouncementToDelete(null);
      await fetchAnnouncements();
      setSuccess(t('announcement.admin.deleted'));
    } catch (err) {
      setError(translateApiError(err, t('announcement.admin.deleteFailed')));
    }
  };

  // 這則公告「現在」會不會出現在前台。後端有同一套判斷，這裡是給管理員看的即時狀態——
  // 「已啟用但因為排程還沒到所以沒出現」是最容易誤判成故障的情況。
  const announcementState = (a) => {
    if (!a.enabled) return 'disabled';
    const now = new Date();
    if (a.publishAt && new Date(a.publishAt) > now) return 'scheduled';
    if (a.expireAt && new Date(a.expireAt) <= now) return 'expired';
    return 'active';
  };

  const fetchPayouts = async () => {
    try {
      setPayoutLoading(true);
      const statusParam = payoutFilter === 'all' ? undefined : payoutFilter;
      const result = await courseReviewService.getPayouts(statusParam);
      setPayouts(result);
    } catch (err) {
      console.error('取得發放清單錯誤:', err);
      setError(translateApiError(err, t('courseReview.payout.fetchFailed')));
    } finally {
      setPayoutLoading(false);
    }
  };

  // status: 'pending'（未處理）| 'paid'（已發放）| 'declined'（不發放）
  const handleTogglePayout = async (review, status) => {
    try {
      await courseReviewService.setPayoutStatus(review.id, status);
      await fetchPayouts();
      setSuccess(t(`courseReview.payout.mark${status.charAt(0).toUpperCase()}${status.slice(1)}Success`));
    } catch (err) {
      setError(translateApiError(err, t('courseReview.payout.updateFailed')));
    }
  };

  const handleExportPayouts = async () => {
    try {
      await courseReviewService.downloadPayoutCsv();
    } catch (err) {
      setError(translateApiError(err, t('courseReview.payout.exportFailed')));
    }
  };

  const fetchCourseReviews = async () => {
    try {
      setCourseReviewLoading(true);
      const result = await courseReviewService.getAdminReviews(courseReviewFilter === 'all' ? undefined : courseReviewFilter);
      setCourseReviews(result.data || []);
    } catch (err) {
      console.error('取得課程評價錯誤:', err);
      setError(translateApiError(err, t('errors.FETCH_LIST_FAILED')));
    } finally {
      setCourseReviewLoading(false);
    }
  };

  const handleApproveCourseReview = async (review) => {
    try {
      await courseReviewService.reviewStatus(review.id, { status: 'approved' });
      await fetchCourseReviews();
      setSuccess(t('courseReview.admin.approveSuccess'));
    } catch (err) {
      setError(translateApiError(err, t('courseReview.admin.approveFailed')));
    }
  };

  const openRejectDialog = (review) => {
    setReviewToReject(review);
    setRejectReason('');
    setCourseReviewRejectDialog(true);
  };

  const handleRejectCourseReview = async () => {
    if (!rejectReason.trim()) return;
    try {
      await courseReviewService.reviewStatus(reviewToReject.id, {
        status: 'rejected',
        rejectReason: rejectReason.trim(),
      });
      setCourseReviewRejectDialog(false);
      setReviewToReject(null);
      await fetchCourseReviews();
      setSuccess(t('courseReview.admin.rejectSuccess'));
    } catch (err) {
      setError(translateApiError(err, t('courseReview.admin.rejectFailed')));
    }
  };

  const handleDeleteCourseReviewClick = (review) => {
    setReviewToDelete(review);
    setCourseReviewDeleteDialog(true);
  };

  const handleDeleteCourseReviewConfirm = async () => {
    if (!reviewToDelete) return;
    try {
      await courseReviewService.deleteReview(reviewToDelete.id);
      await fetchCourseReviews();
      setSuccess(t('courseReview.admin.deleteSuccess'));
    } catch (err) {
      setError(translateApiError(err, t('courseReview.admin.deleteFailed')));
    } finally {
      setCourseReviewDeleteDialog(false);
      setReviewToDelete(null);
    }
  };

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
        throw new Error(t('admin.users.fetchFailed'));
      }
      
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // 獲取考古題資料
  const fetchExams = async () => {
    try {
      setExamLoading(true);
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
      setExamLoading(false);
    }
  };

  // 獲取大抄資料
  const fetchCheatSheets = async () => {
    try {
      setCheatSheetLoading(true);
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
      setCheatSheetLoading(false);
    }
  };

  // 以某個身分組或某位成員的身分檢視全站。
  // 切換後管理台通常會直接消失（那正是預期結果），所以要先導回首頁——
  // 停在一個自己已經沒有權限的頁面上只會看到錯誤訊息，看不出模組與選單的實際樣貌。
  // 退出的入口在 Layout 最上層的固定橫幅，不在這個頁面裡。
  const handleStartPreview = async (kind, id, label) => {
    try {
      await startPreview(kind, id, label);
      navigate('/');
    } catch (err) {
      setError(translateApiError(err, t('admin.previewSwitchFailed')));
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
      // 刻意不再帶 role：舊欄位的編輯介面已移除，送出去只會讓後端寫入一個
      // 沒有授權作用、又永遠追不上身分組的值。資料庫欄位保留供回滾用。
      // 濾掉自動身分組（「會員」）。它不存在 user_roles，是後端依 has_paid_fee 推導後
      // 補進回應的（admin.js:58），但送回去指派會被 users.js:259 以 400 擋下。
      // 不濾的話，編輯任何「已繳費」使用者都會失敗——即使你只是想多加一個身分組，
      // 送出的陣列仍會夾帶「會員」而讓整筆更新被退回。
      roleIds: (user.roles || []).filter((r) => !r.isAuto).map((r) => r.id)
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
        throw new Error(t('exam.form.updateFailed'));
      }

      await response.json();

      // 身分組是獨立的關聯資料表，走專屬端點（它另外有「不可指派自動身分組」
      // 與「不可移除最後一位管理員」的把關，錯誤要讓使用者看得到）
      if (Array.isArray(editData.roleIds)) {
        await roleService.setUserRoles(userId, editData.roleIds);
      }

      setSuccess(t('admin.users.updated'));
      setEditingId(null);

      // 如果更新的是當前登入用戶，同步更新 AuthContext
      if (user && parseInt(userId) === user.id) {
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
      setError(translateApiError(err, err.message || t('exam.form.updateFailed')));
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword) {
      setError(t('admin.users.enterNewPassword'));
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
        throw new Error(t('admin.users.passwordUpdateFailed'));
      }

      setSuccess(t('admin.users.passwordUpdated'));
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
        throw new Error(t('admin.users.deleteFailed'));
      }

      setSuccess(t('admin.users.deleted', { name: userToDelete.username }));
      setDeleteUserDialog(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
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

  const handleFileSelect = (file, fileType = 'question') => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadMessage({ type: 'error', text: t('admin.upload.pdfOnly') });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadMessage({ type: 'error', text: t('admin.upload.tooLarge') });
      return;
    }

    if (activeTab === 1) {
      if (fileType === 'question') {
        handleExamChange('questionFile', file);
      } else if (fileType === 'answer') {
        handleExamChange('answerFile', file);
      }
    } else if (activeTab === 2) {
      handleCheatSheetChange('file', file);
    }
  };

  const validateExamForm = () => {
    const newErrors = {};
    
    if (!examForm.courseCode) newErrors.courseCode = t('admin.upload.courseCodeRequired');
    if (!examForm.courseName) newErrors.courseName = t('admin.upload.courseNameRequired');
    if (!examForm.professor) newErrors.professor = t('admin.upload.professorRequired');
    if (!examForm.year) newErrors.year = t('admin.upload.yearRequired');
    if (!examForm.questionFile) newErrors.questionFile = t('admin.upload.questionFileRequired');

    setUploadErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCheatSheetForm = () => {
    const newErrors = {};
    
    if (!cheatSheetForm.courseCode) newErrors.courseCode = t('admin.upload.courseCodeRequired');
    if (!cheatSheetForm.courseName) newErrors.courseName = t('admin.upload.courseNameRequired');
    if (!cheatSheetForm.title) newErrors.title = t('admin.upload.titleRequired');
    if (!cheatSheetForm.description) newErrors.description = t('admin.upload.descriptionRequired');
    if (cheatSheetForm.tags.length === 0) newErrors.tags = t('admin.upload.tagRequired');
    if (!cheatSheetForm.file) newErrors.file = t('admin.upload.fileRequired');

    setUploadErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadExam = async () => {
    if (!validateExamForm()) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('questionFile', examForm.questionFile);
    if (examForm.answerFile) {
      formData.append('answerFile', examForm.answerFile);
    }
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
        throw new Error(t('admin.upload.failed'));
      }

      setUploadMessage({ type: 'success', text: t('admin.upload.examSuccess') });

      setExamForm((prev) => ({
        ...prev,
        questionFile: null,
        answerFile: null,
      }));
      
      setUploadProgress(100);
    } catch (error) {
      setUploadMessage({ type: 'error', text: error.message || t('admin.upload.failedRetry') });
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
        throw new Error(t('admin.upload.failed'));
      }

      setUploadMessage({ type: 'success', text: t('admin.upload.cheatSheetSuccess') });
      
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
      setUploadMessage({ type: 'error', text: error.message || t('admin.upload.failedRetry') });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // 考古題處理函數
  const handleExamDeleteClick = (exam) => {
    setExamToDelete(exam);
    setExamDeleteDialog(true);
  };

  const handleExamDeleteConfirm = async () => {
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

      await fetchExams();
      setSuccess(t('manage.examDeleted'));
    } catch (error) {
      console.error('刪除考古題錯誤:', error);
      setError(error.message || t('manage.deleteFailed'));
    } finally {
      setExamDeleteDialog(false);
      setExamToDelete(null);
    }
  };

  const handleExamPreview = (examId, fileType = 'question') => {
    const token = localStorage.getItem('token');
    window.open(`${API_BASE_URL}/exams/${examId}/preview/${fileType}?token=${token}`, '_blank');
  };

  const handleExamDownload = async (examId, filename, fileType = 'question') => {
    try {
      const response = await fetch(`${API_BASE_URL}/exams/${examId}/download/${fileType}`, {
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
      setError(t('cheatSheet.downloadFailedRetry'));
    }
  };

  // 大抄處理函數
  const handleCheatSheetDeleteClick = (cheatSheet) => {
    setCheatSheetToDelete(cheatSheet);
    setCheatSheetDeleteDialog(true);
  };

  const handleCheatSheetDeleteConfirm = async () => {
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

      await fetchCheatSheets();
      setSuccess(t('manage.cheatSheetDeleted'));
    } catch (error) {
      console.error('刪除大抄錯誤:', error);
      setError(error.message || t('manage.deleteFailed'));
    } finally {
      setCheatSheetDeleteDialog(false);
      setCheatSheetToDelete(null);
    }
  };

  const handleCheatSheetPreview = (cheatSheetId) => {
    const token = localStorage.getItem('token');
    window.open(`${API_BASE_URL}/cheat-sheets/${cheatSheetId}/preview?token=${token}`, '_blank');
  };

  const handleCheatSheetDownload = async (cheatSheetId, filename) => {
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
      setError(t('cheatSheet.downloadFailedRetry'));
    }
  };

  // 這些鍵是資料庫裡實際的標籤字串，不是介面文案
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

  // 篩選考古題和大抄
  const filteredExams = exams.filter(exam => 
    exam.courseName.toLowerCase().includes(examSearchTerm.toLowerCase()) ||
    exam.courseCode.toLowerCase().includes(examSearchTerm.toLowerCase()) ||
    (exam.professor && exam.professor.toLowerCase().includes(examSearchTerm.toLowerCase()))
  );

  const pendingCourseReviewCount = courseReviews.filter((r) => r.status === 'pending').length;

  const courseReviewTermRank = { '1': 1, '2': 2, summer: 3 };
  const courseReviewTermOptions = [...new Map(
    courseReviews.map((r) => [`${r.year}-${r.semester}`, {
      value: `${r.year}-${r.semester}`,
      label: courseReviewService.getAcademicTermLabel(r.year, r.semester),
      year: r.year,
      semester: r.semester,
    }])
  ).values()].sort((a, b) => b.year - a.year || courseReviewTermRank[b.semester] - courseReviewTermRank[a.semester]);

  const courseReviewProfessorOptions = [...new Set(courseReviews.map((r) => r.professor).filter(Boolean))].sort();

  const filteredCourseReviews = courseReviews.filter((review) => {
    const keyword = courseReviewSearchTerm.toLowerCase();
    const matchesKeyword =
      review.courseName.toLowerCase().includes(keyword) ||
      review.courseCode.toLowerCase().includes(keyword) ||
      (review.professor && review.professor.toLowerCase().includes(keyword));
    const matchesTerm = courseReviewTermFilter === 'all' || `${review.year}-${review.semester}` === courseReviewTermFilter;
    const matchesProfessor = courseReviewProfessorFilter === 'all' || review.professor === courseReviewProfessorFilter;
    return matchesKeyword && matchesTerm && matchesProfessor;
  });

  const filteredCheatSheets = cheatSheets.filter(sheet =>
    sheet.title.toLowerCase().includes(cheatSheetSearchTerm.toLowerCase()) ||
    sheet.courseName.toLowerCase().includes(cheatSheetSearchTerm.toLowerCase()) ||
    (sheet.description && sheet.description.toLowerCase().includes(cheatSheetSearchTerm.toLowerCase()))
  );

  const filteredUsers = users.filter((managedUser) => {
    const keyword = userSearchTerm.trim().toLowerCase();
    const matchKeyword = !keyword || [
      managedUser.username,
      managedUser.fullName,
      managedUser.email,
      managedUser.studentId
    ].some((value) => (value || '').toLowerCase().includes(keyword));

    // 依身分組篩選，不再看舊的 role 欄位——它不隨身分組更新，篩選結果會和
    // 畫面上顯示的 chip 對不起來（明明標著「管理員」，選「管理員」卻篩不到）
    const userRoles = managedUser.roles || [];
    const matchRole = roleFilter === 'all'
      || (roleFilter === 'none' ? userRoles.length === 0 : userRoles.some((r) => r.key === roleFilter));
    const matchPayment = paymentFilter === 'all'
      || (paymentFilter === 'paid' && managedUser.hasPaidFee)
      || (paymentFilter === 'unpaid' && !managedUser.hasPaidFee);

    return matchKeyword && matchRole && matchPayment;
  });

  const selectedUser = filteredUsers.find((managedUser) => managedUser.id === selectedUserId) || null;
  const activeUser = selectedUser || filteredUsers[0] || null;
  const userStats = {
    total: users.length,
    admins: users.filter((u) => (u.roles || []).some((r) => r.key === 'admin')).length,
    members: users.filter((u) => (u.roles || []).some((r) => r.key === 'member')).length,
    paid: users.filter((managedUser) => managedUser.hasPaidFee).length,
  };

  // 待辦數只算「未處理」。標記為不發放的已經結案了，不該繼續佔著徽章上的數字
  const unpaidPayoutCount = payouts.filter((review) => (review.payoutStatus || 'pending') === 'pending').length;

  const filteredPayouts = payouts.filter((review) => {
    const keyword = payoutSearchTerm.trim().toLowerCase();
    if (!keyword) return true;
    return (
      review.courseName.toLowerCase().includes(keyword) ||
      review.courseCode.toLowerCase().includes(keyword) ||
      (review.professor && review.professor.toLowerCase().includes(keyword)) ||
      (review.reviewer?.fullName && review.reviewer.fullName.toLowerCase().includes(keyword)) ||
      (review.reviewer?.studentId && review.reviewer.studentId.toLowerCase().includes(keyword))
    );
  });

  // 每個功能標示它所需的權限，顯示與否一律以此為準（不再用 adminOnly 布林）。
  //
  // 用二維陣列而不是一維：公告管理要獨佔一列、右邊刻意留白。
  // 一維陣列靠流式排版湊格子的話，任何一個人少一項權限就會整個重排，
  // 留白會被下一張卡填掉。分成列之後，權限不足時只是該列少幾張卡。
  //
  //   用戶管理     身分組管理   模組管理
  //   公告管理      —            —
  //   考古題管理   大抄管理     課程評價管理
  //   上傳考古題   上傳大抄     發放回饋金
  const adminSectionRows = [
    [
      { labelKey: 'nav.adminPanel', descKey: 'admin.sections.users', value: 0, permission: 'users.manage' },
      { labelKey: 'admin.roles.title', descKey: 'admin.sections.roles', value: 7, permission: 'roles.manage' },
      { labelKey: 'admin.modules.title', descKey: 'admin.sections.modules', value: 8, permission: 'modules.manage' },
    ],
    [
      { labelKey: 'announcement.admin.title', descKey: 'announcement.admin.description', value: 9, permission: 'announcements.manage' },
    ],
    [
      { labelKey: 'nav.adminExamManage', descKey: 'admin.sections.examManage', value: 3, permission: 'exams.manage' },
      { labelKey: 'nav.adminCheatSheetManage', descKey: 'admin.sections.cheatSheetManage', value: 4, permission: 'cheatSheets.manage' },
      { labelKey: 'courseReview.admin.title', descKey: 'courseReview.admin.description', value: 5, permission: 'courseReviews.moderate' },
    ],
    [
      { labelKey: 'nav.uploadExam', descKey: 'admin.sections.examUpload', value: 1, permission: 'exams.upload' },
      { labelKey: 'admin.uploadCheatSheet', descKey: 'admin.sections.cheatSheetUpload', value: 2, permission: 'cheatSheets.upload' },
      { labelKey: 'courseReview.payout.title', descKey: 'courseReview.payout.description', value: 6, permission: 'courseReviews.payout' },
    ],
  ]
    .map((row) => row.filter((section) => hasPermission(section.permission)))
    .filter((row) => row.length > 0);

  if (authLoading || loading) return (
    <Container sx={{ mt: 4 }}>
      <Typography>載入中...</Typography>
    </Container>
  );

  // 持有任何一項後台權限即可進入
  const canAccessConsole = CONSOLE_PERMISSIONS.some((p) => hasPermission(p));

  if (!authLoading && !canAccessConsole) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          {t('admin.noAccess')}
          <br />
          {t('admin.debugInfo', { username: user?.username, role: user?.role })}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={3}>
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            {t('admin.consoleTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('admin.consoleSubtitle')}
          </Typography>
          {/* 一列一個 Grid container，外層再疊起來。用單一 container 加隱形佔位格
              也能排出留白，但那些佔位格在手機（xs 全寬堆疊）會變成空白區塊。 */}
          <Stack spacing={2}>
            {adminSectionRows.map((row, rowIndex) => (
              <Grid container spacing={2} key={rowIndex}>
                {row.map((section) => (
                  <Grid item xs={12} sm={6} md={4} key={section.value}>
                    <Paper
                      onClick={() => (section.path ? navigate(section.path) : setActiveTab(section.value))}
                      sx={{
                        p: 2,
                        height: '100%',
                        cursor: 'pointer',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: !section.path && activeTab === section.value ? 'primary.main' : 'divider',
                        bgcolor: !section.path && activeTab === section.value ? 'primary.50' : 'background.paper',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 2,
                        },
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {t(section.labelKey)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(section.descKey)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ))}
          </Stack>
        </Paper>

      {/* 用戶管理分頁 */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <BadgeIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">總用戶數</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{userStats.total}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <AdminPanelSettingsIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">管理員</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{userStats.admins}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <BadgeIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">會員</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{userStats.members}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <PaidIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">已繳費</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{userStats.paid}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ mb: 3 }}
                alignItems={{ xs: 'stretch', md: 'center' }}
              >
                <TextField
                  fullWidth
                  placeholder={t('admin.users.searchPlaceholder')}
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                {/* 選項改由身分組清單動態產生。原本是寫死的三個舊 role 值，
                    自訂身分組（例如「測試員」）永遠篩不到，而「一般用戶」在身分組模型下
                    的正確語意是「沒有任何身分組」，不是某個 role 值。 */}
                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel>身分組</InputLabel>
                  <Select
                    value={roleFilter}
                    label={t('admin.roles.label')}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <MenuItem value="all">全部</MenuItem>
                    <MenuItem value="none">無身分組</MenuItem>
                    {allRoles.map((r) => (
                      <MenuItem key={r.id} value={r.key}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel>繳費</InputLabel>
                  <Select
                    value={paymentFilter}
                    label={t('admin.users.paymentFilter')}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                  >
                    <MenuItem value="all">全部</MenuItem>
                    <MenuItem value="paid">已繳費</MenuItem>
                    <MenuItem value="unpaid">未繳費</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('admin.users.showing', { shown: filteredUsers.length, total: users.length })}
                </Typography>
                {(userSearchTerm || roleFilter !== 'all' || paymentFilter !== 'all') && (
                  <Button
                    size="small"
                    onClick={() => {
                      setUserSearchTerm('');
                      setRoleFilter('all');
                      setPaymentFilter('all');
                    }}
                  >
                    {t('admin.users.clearFilters')}
                  </Button>
                )}
              </Stack>

              <TableContainer sx={{ overflowX: 'visible' }}>
                <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '34%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '18%' }} />
                  </colgroup>
                  <TableHead>
                    <TableRow>
                      <TableCell>用戶</TableCell>
                      <TableCell>聯絡與校內資料</TableCell>
                      <TableCell>身份狀態</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.map((managedUser) => (
                      <TableRow
                        key={managedUser.id}
                        hover
                        selected={activeUser?.id === managedUser.id}
                        onClick={() => setSelectedUserId(managedUser.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          {editingId === managedUser.id ? (
                            <Stack spacing={1} sx={{ minWidth: 220 }}>
                              <TextField
                                size="small"
                                label={t('auth.fullName')}
                                value={editData.fullName}
                                onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                              />
                              <TextField
                                size="small"
                                label={t('auth.username')}
                                value={editData.username}
                                onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                              />
                            </Stack>
                          ) : (
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{ width: 36, height: 36 }}>
                                {(managedUser.fullName || managedUser.username || '?').charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography sx={{ fontWeight: 600 }}>
                                  {managedUser.fullName || managedUser.username}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  @{managedUser.username} · ID {managedUser.id}
                                </Typography>
                              </Box>
                            </Stack>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === managedUser.id ? (
                            <Stack spacing={1}>
                              <TextField
                                size="small"
                                label={t('auth.studentId')}
                                fullWidth
                                value={editData.studentId}
                                onChange={(e) => setEditData({ ...editData, studentId: e.target.value })}
                              />
                              <TextField
                                size="small"
                                label="Email"
                                fullWidth
                                value={editData.email}
                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                              />
                            </Stack>
                          ) : (
                            <Stack spacing={0.5}>
                              <Typography variant="body2">
                                {t('admin.users.studentIdLine', { value: managedUser.studentId || '-' })}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ wordBreak: 'break-word' }}
                              >
                                {managedUser.email || t('admin.users.noEmail')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t('admin.users.registeredLine', { value: managedUser.created_at ? new Date(managedUser.created_at).toLocaleString(i18n.language) : '-' })}
                              </Typography>
                            </Stack>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === managedUser.id ? (
                            <Stack spacing={1}>
                              {/* 這裡原本還有一個「管理員/會員/一般用戶」下拉，對應舊的 users.role 欄位。
                                  該欄位已無授權作用（後端一律看身分組），留著只會和下方的身分組多選
                                  並排出現、看起來像兩個等效的控制項，實際上只有一個有效。已移除。
                                  資料庫欄位本身刻意保留，程式碼回滾時仍需要它。 */}
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Switch
                                  checked={editData.hasPaidFee}
                                  onChange={(e) => setEditData({ ...editData, hasPaidFee: e.target.checked })}
                                />
                                <Typography variant="body2">
                                  {t(editData.hasPaidFee ? 'admin.users.paid' : 'admin.users.unpaid')}
                                </Typography>
                              </Stack>
                              {/* 身分組（可複選）。取代原本的「總務權限」開關——
                                  後端已改用身分組授權，那個布林欄位不再有任何作用。 */}
                              <FormControl fullWidth size="small">
                                <InputLabel>身分組</InputLabel>
                                <Select
                                  multiple
                                  value={editData.roleIds || []}
                                  label={t('admin.roles.label')}
                                  onChange={(e) => setEditData({ ...editData, roleIds: e.target.value })}
                                  renderValue={(selected) => (
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                      {selected.map((id) => {
                                        const r = allRoles.find((x) => x.id === id);
                                        return r ? <Chip key={id} label={r.name} size="small" /> : null;
                                      })}
                                    </Stack>
                                  )}
                                >
                                  {allRoles.filter((r) => !r.isAuto).length === 0 && (
                                    // 空選單一定要說明原因。/api/roles 需要 roles.manage，
                                    // 沒有該權限的人會拿到空清單，看到一個沒東西的下拉選單卻不知為何
                                    <MenuItem disabled value="">
                                      {t(allRoles.length === 0 ? 'admin.roles.loadingOrNoAccess' : 'admin.roles.noneAssignable')}
                                    </MenuItem>
                                  )}
                                  {allRoles.filter((r) => !r.isAuto).map((r) => (
                                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              {allRoles.some((r) => r.isAuto) && (
                                <Typography variant="caption" color="text.secondary">
                                  {t('admin.roles.memberAutoHint')}
                                </Typography>
                              )}
                            </Stack>
                          ) : (
                            // 這裡原本還會先顯示一個由舊 role 欄位推導的 chip，
                            // 結果同一列出現兩個「管理員」（一個來自舊欄位、一個來自身分組），
                            // 而且兩者可能不一致——身分組才是真正生效的那個。只留身分組。
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip
                                size="small"
                                label={t(managedUser.hasPaidFee ? 'admin.users.paid' : 'admin.users.unpaid')}
                                color={managedUser.hasPaidFee ? 'success' : 'default'}
                                variant={managedUser.hasPaidFee ? 'filled' : 'outlined'}
                              />
                              {(managedUser.roles || []).map((r) => (
                                <Chip
                                  key={r.id}
                                  size="small"
                                  label={r.name}
                                  sx={r.color ? { bgcolor: r.color, color: '#fff' } : undefined}
                                />
                              ))}
                              {(managedUser.roles || []).length === 0 && (
                                <Chip size="small" label={t('admin.roles.none')} variant="outlined" />
                              )}
                            </Stack>
                          )}
                        </TableCell>
                        <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                          {editingId === managedUser.id ? (
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <IconButton color="primary" onClick={() => handleSave(managedUser.id)} title={t('common.save')}>
                                <SaveIcon />
                              </IconButton>
                              <IconButton color="secondary" onClick={handleCancel} title={t('common.cancel')}>
                                <CancelIcon />
                              </IconButton>
                            </Stack>
                          ) : (
                            // 四個操作鍵排成 2×2 並靠右。排成一列時在窄欄位裡會擠成一團，
                            // 誤觸「刪除用戶」的代價又特別高。
                            <Box
                              sx={{
                                display: 'inline-grid',
                                gridTemplateColumns: 'repeat(2, auto)',
                                justifyContent: 'end',
                                gap: 0.25,
                              }}
                            >
                              <IconButton
                                size="small"
                                color="warning"
                                title={
                                  managedUser.id === user?.id
                                    ? t('admin.preview.selfHint')
                                    : t('admin.preview.asUser', { name: managedUser.username })
                                }
                                disabled={managedUser.id === user?.id}
                                onClick={() =>
                                  handleStartPreview('user', managedUser.id, `使用者「${managedUser.username}」`)
                                }
                              >
                                <ViewIcon />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleEdit(managedUser)} title={t('common.edit')}>
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => openPasswordDialog(managedUser.id)}
                                color="info"
                                title={t('admin.users.resetPassword')}
                              >
                                <LockResetIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setUserToDelete(managedUser);
                                  setDeleteUserDialog(true);
                                }}
                                color="error"
                                title={t(managedUser.id === user?.id ? 'admin.users.cannotDeleteSelf' : 'admin.users.deleteUser')}
                                disabled={managedUser.id === user?.id}
                              >
                                <PersonRemoveIcon />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredUsers.length === 0 && (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>沒有符合條件的用戶</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.users.adjustFilters')}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, borderRadius: 3, position: 'sticky', top: 24 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                {t('admin.users.detailTitle')}
              </Typography>

              {activeUser ? (
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ width: 56, height: 56, fontSize: 24 }}>
                      {(activeUser.fullName || activeUser.username || '?').charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {activeUser.fullName || activeUser.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        @{activeUser.username}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* 同列表：顯示實際生效的身分組，不再由舊 role 欄位推導 */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={t(activeUser.hasPaidFee ? 'admin.users.paid' : 'admin.users.unpaid')}
                      color={activeUser.hasPaidFee ? 'success' : 'default'}
                      variant={activeUser.hasPaidFee ? 'filled' : 'outlined'}
                    />
                    {(activeUser.roles || []).map((r) => (
                      <Chip
                        key={r.id}
                        label={r.name}
                        sx={r.color ? { bgcolor: r.color, color: '#fff' } : undefined}
                      />
                    ))}
                    {(activeUser.roles || []).length === 0 && (
                      <Chip label={t('admin.roles.none')} variant="outlined" />
                    )}
                  </Stack>

                  <Divider />

                  <Box>
                    <Typography variant="body2" color="text.secondary">學號</Typography>
                    <Typography>{activeUser.studentId || t('admin.users.notProvided')}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography sx={{ wordBreak: 'break-word' }}>{activeUser.email || t('admin.users.notProvided')}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">註冊時間</Typography>
                    <Typography>{activeUser.created_at ? new Date(activeUser.created_at).toLocaleString(i18n.language) : t('common.unknown')}</Typography>
                  </Box>

                  <Divider />

                  <Stack spacing={1.5}>
                    <Button
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={() => handleEdit(activeUser)}
                      disabled={editingId === activeUser.id}
                    >
                      {t('admin.users.editThisUser')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="info"
                      startIcon={<LockResetIcon />}
                      onClick={() => openPasswordDialog(activeUser.id)}
                    >
                      {t('admin.users.resetPassword')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<PersonRemoveIcon />}
                      title={activeUser.id === user?.id ? t('admin.users.cannotDeleteSelf') : undefined}
                      disabled={activeUser.id === user?.id}
                      onClick={() => {
                        setUserToDelete(activeUser);
                        setDeleteUserDialog(true);
                      }}
                    >
                      {t('admin.users.deleteThisUser')}
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('admin.users.empty')}
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 考古題上傳分頁 */}
      {activeTab === 1 && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            {t('nav.uploadExam')}
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('courseReview.form.courseCode')}
                placeholder={t('admin.upload.courseCodeExample')}
                value={examForm.courseCode}
                onChange={(e) => handleExamChange('courseCode', e.target.value)}
                error={!!uploadErrors.courseCode}
                helperText={uploadErrors.courseCode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('courseReview.form.courseName')}
                placeholder={t('admin.upload.courseNameExample')}
                value={examForm.courseName}
                onChange={(e) => handleExamChange('courseName', e.target.value)}
                error={!!uploadErrors.courseName}
                helperText={uploadErrors.courseName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('admin.upload.professorLabel')}
                placeholder={t('admin.upload.professorExample')}
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
                label={t('admin.upload.yearRocLabel')}
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
                  label={t('courseReview.detailField.academicTerm')}
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
                  label={t('exam.form.examType')}
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
                label={t('exam.form.examAttempt')}
                value={examForm.examAttempt}
                onChange={(e) => handleExamChange('examAttempt', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            {/* 題目檔案上傳 */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                {t('admin.upload.questionFileLabel')} <span style={{ color: 'red' }}>*</span>
              </Typography>
              <Box sx={{ border: '1px dashed #ccc', p: 2, textAlign: 'center' }}>
                <input
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  id="exam-question-file-upload"
                  type="file"
                  onChange={(e) => handleFileSelect(e.target.files[0], 'question')}
                />
                <label htmlFor="exam-question-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 1 }}
                  >
                    {t('admin.upload.pickQuestionPdf')}
                  </Button>
                </label>
                {examForm.questionFile && (
                  <Typography variant="body2" color="success.main">
                    {t('admin.upload.selected', { name: examForm.questionFile.name })}
                  </Typography>
                )}
                {uploadErrors.questionFile && (
                  <Typography variant="body2" color="error">
                    {uploadErrors.questionFile}
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* 答案檔案上傳 */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                {t('admin.upload.answerFileLabel')} <span style={{ color: 'gray' }}>{t('admin.upload.optionalTag')}</span>
              </Typography>
              <Box sx={{ border: '1px dashed #ccc', p: 2, textAlign: 'center' }}>
                <input
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  id="exam-answer-file-upload"
                  type="file"
                  onChange={(e) => handleFileSelect(e.target.files[0], 'answer')}
                />
                <label htmlFor="exam-answer-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 1 }}
                    color="secondary"
                  >
                    {t('admin.upload.pickAnswerPdf')}
                  </Button>
                </label>
                {examForm.answerFile && (
                  <Typography variant="body2" color="success.main">
                    {t('admin.upload.selected', { name: examForm.answerFile.name })}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {t('admin.upload.answerOptionalHint')}
                </Typography>
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
              {t(uploading ? 'admin.upload.uploading' : 'nav.uploadExam')}
            </Button>
          </Box>
        </Paper>
      )}

      {/* 大抄上傳分頁 */}
      {activeTab === 2 && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            {t('admin.uploadCheatSheet')}
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('courseReview.form.courseCode')}
                placeholder={t('admin.upload.courseCodeExample')}
                value={cheatSheetForm.courseCode}
                onChange={(e) => handleCheatSheetChange('courseCode', e.target.value)}
                error={!!uploadErrors.courseCode}
                helperText={uploadErrors.courseCode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('courseReview.form.courseName')}
                placeholder={t('admin.upload.courseNameExample')}
                value={cheatSheetForm.courseName}
                onChange={(e) => handleCheatSheetChange('courseName', e.target.value)}
                error={!!uploadErrors.courseName}
                helperText={uploadErrors.courseName}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('admin.upload.cheatSheetTitleLabel')}
                placeholder={t('admin.upload.cheatSheetTitleExample')}
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
                label={t('cheatSheet.form.description')}
                placeholder={t('admin.upload.cheatSheetDescExample')}
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
                  label={t('cheatSheet.form.tags')}
                  placeholder={t('admin.upload.tagPlaceholder')}
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
                    {t('admin.upload.pickPdf')}
                  </Button>
                </label>
                {cheatSheetForm.file && (
                  <Typography variant="body2" color="success.main">
                    {t('admin.upload.selected', { name: cheatSheetForm.file.name })}
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
              {t(uploading ? 'admin.upload.uploading' : 'admin.uploadCheatSheet')}
            </Button>
          </Box>
        </Paper>
      )}

      {/* 考古題管理分頁 */}
      {activeTab === 3 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            {t('nav.adminExamManage')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('manage.examDescription')}
          </Typography>

          {/* 搜尋欄 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder={t('courseReview.admin.searchPlaceholder')}
              value={examSearchTerm}
              onChange={(e) => setExamSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>

          {/* 載入中 */}
          {examLoading && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                {t('exam.loadingList')}
              </Typography>
            </Box>
          )}

          {/* 考古題列表 */}
          {!examLoading && (
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
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <PictureAsPdfIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            <Box>
                              <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>
                                {t('admin.manage.questionLine', { name: exam.questionFileName })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {(exam.questionFileSize / 1024 / 1024).toFixed(2)} MB
                              </Typography>
                            </Box>
                          </Box>
                          {exam.answerFileName && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PictureAsPdfIcon sx={{ fontSize: 16, color: 'success.main' }} />
                              <Box>
                                <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>
                                  {t('admin.manage.answerLine', { name: exam.answerFileName })}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {(exam.answerFileSize / 1024 / 1024).toFixed(2)} MB
                                </Typography>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{exam.uploader?.fullName || t('common.unknown')}</TableCell>
                      <TableCell>
                        {exam.created_at ? new Date(exam.created_at).toLocaleDateString(i18n.language) : t('common.unknown')}
                      </TableCell>
                      <TableCell align="right">{exam.downloadCount || 0}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                          {/* 題目操作 */}
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title={t('exam.previewQuestions')}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleExamPreview(exam.id, 'question')}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('exam.downloadQuestions')}>
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => handleExamDownload(exam.id, exam.questionFileName, 'question')}
                              >
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          
                          {/* 答案操作（如果有答案） */}
                          {exam.answerFileName && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title={t('exam.previewAnswers')}>
                                <IconButton 
                                  size="small" 
                                  color="success"
                                  onClick={() => handleExamPreview(exam.id, 'answer')}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('exam.downloadAnswers')}>
                                <IconButton 
                                  size="small" 
                                  color="success"
                                  onClick={() => handleExamDownload(exam.id, exam.answerFileName, 'answer')}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                          
                          {/* 刪除操作 */}
                          <Tooltip title={t('common.delete')}>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleExamDeleteClick(exam)}
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
          {!examLoading && filteredExams.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t(exams.length === 0 ? 'exam.empty' : 'exam.noMatch')}
              </Typography>
              <Typography variant="body2" color="text.disabled">
                {t(exams.length === 0 ? 'manage.uploadExamFirst' : 'manage.adjustSearch')}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* 大抄管理分頁 */}
      {activeTab === 4 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            {t('nav.adminCheatSheetManage')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('manage.cheatSheetDescription')}
          </Typography>

          {/* 搜尋欄 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder={t('cheatSheet.searchPlaceholder')}
              value={cheatSheetSearchTerm}
              onChange={(e) => setCheatSheetSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>

          {/* 載入中 */}
          {cheatSheetLoading && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                {t('cheatSheet.loadingList')}
              </Typography>
            </Box>
          )}

          {/* 大抄列表 */}
          {!cheatSheetLoading && (
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
                              onClick={() => handleCheatSheetPreview(sheet.id)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('exam.download')}>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleCheatSheetDownload(sheet.id, sheet.fileName)}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.delete')}>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleCheatSheetDeleteClick(sheet)}
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
          {!cheatSheetLoading && filteredCheatSheets.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t(cheatSheets.length === 0 ? 'cheatSheet.empty' : 'cheatSheet.noMatch')}
              </Typography>
              <Typography variant="body2" color="text.disabled">
                {t(cheatSheets.length === 0 ? 'manage.uploadCheatSheetFirst' : 'manage.adjustSearch')}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* 課程評價管理分頁 */}
      {activeTab === 5 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            {t('courseReview.admin.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('courseReview.admin.description')}
          </Typography>

          {/* 搜尋欄與篩選 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder={t('courseReview.admin.searchPlaceholder')}
                  value={courseReviewSearchTerm}
                  onChange={(e) => setCourseReviewSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('courseReview.form.academicTerm')}</InputLabel>
                  <Select
                    value={courseReviewTermFilter}
                    label={t('courseReview.form.academicTerm')}
                    onChange={(e) => setCourseReviewTermFilter(e.target.value)}
                  >
                    <MenuItem value="all">{t('common.all')}</MenuItem>
                    {courseReviewTermOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('courseReview.professorFilterLabel')}</InputLabel>
                  <Select
                    value={courseReviewProfessorFilter}
                    label={t('courseReview.professorFilterLabel')}
                    onChange={(e) => setCourseReviewProfessorFilter(e.target.value)}
                  >
                    <MenuItem value="all">{t('common.all')}</MenuItem>
                    {courseReviewProfessorOptions.map((professor) => (
                      <MenuItem key={professor} value={professor}>
                        {professor}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          <ToggleButtonGroup
            value={courseReviewFilter}
            exclusive
            size="small"
            onChange={(_, v) => v && setCourseReviewFilter(v)}
            sx={{ mb: 3 }}
          >
            <ToggleButton value="all">{t('common.all')}</ToggleButton>
            <ToggleButton value="pending">
              {t('courseReview.status.pending')}
              {pendingCourseReviewCount > 0 && (
                <Chip label={pendingCourseReviewCount} size="small" color="warning" sx={{ ml: 1 }} />
              )}
            </ToggleButton>
            <ToggleButton value="approved">{t('courseReview.status.approved')}</ToggleButton>
            <ToggleButton value="rejected">{t('courseReview.status.rejected')}</ToggleButton>
          </ToggleButtonGroup>

          {courseReviewLoading && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                {t('common.loading')}
              </Typography>
            </Box>
          )}

          {!courseReviewLoading && filteredCourseReviews.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <RateReviewIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {courseReviews.length === 0 ? t('courseReview.admin.noMatchingReviews') : t('courseReview.admin.noMatchingSearchReviews')}
              </Typography>
            </Box>
          )}

          {!courseReviewLoading && filteredCourseReviews.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('courseReview.admin.countLabel', { count: filteredCourseReviews.length })}
              </Typography>
              <Grid container spacing={2}>
                {filteredCourseReviews.map((review) => (
                  <Grid item xs={12} md={6} key={review.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <ReviewCard
                        review={review}
                        showStatus
                        hideReviewedBy
                        currentUserId={null}
                        onEdit={() => {}}
                        onDelete={() => {}}
                      />
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        flexWrap="wrap"
                        sx={{ mt: 1, rowGap: 1 }}
                      >
                        <Stack spacing={0.25}>
                          <Typography variant="caption" color="text.secondary">
                            {t('courseReview.admin.submittedAt', { time: review.created_at ? new Date(review.created_at).toLocaleString('zh-TW') : t('common.unknown') })}
                          </Typography>
                          {review.reviewedByUser && (
                            <Typography variant="caption" color="text.secondary">
                              {t('courseReview.reviewedBy', { name: review.reviewedByUser.fullName })}
                            </Typography>
                          )}
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1 }}>
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteCourseReviewClick(review)}
                          >
                            {t('common.delete')}
                          </Button>
                          {review.status === 'pending' && (
                            <>
                              <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<CancelIcon />}
                                onClick={() => openRejectDialog(review)}
                              >
                                {t('common.reject')}
                              </Button>
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleApproveCourseReview(review)}
                              >
                                {t('common.approve')}
                              </Button>
                            </>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Paper>
      )}

      {/* 回饋金發放管理分頁 */}
      {activeTab === 6 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            {t('courseReview.payout.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('courseReview.payout.description')}
          </Typography>

          {/* 搜尋與匯出 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  placeholder={t('courseReview.payout.searchPlaceholder')}
                  value={payoutSearchTerm}
                  onChange={(e) => setPayoutSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportPayouts}
                >
                  {t('courseReview.payout.exportCsv')}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <ToggleButtonGroup
            value={payoutFilter}
            exclusive
            size="small"
            onChange={(_, v) => v && setPayoutFilter(v)}
            sx={{ mb: 3 }}
          >
            <ToggleButton value="pending">
              {t('courseReview.payout.pending')}
              {unpaidPayoutCount > 0 && (
                <Chip label={unpaidPayoutCount} size="small" color="warning" sx={{ ml: 1 }} />
              )}
            </ToggleButton>
            <ToggleButton value="paid">{t('courseReview.payout.paid')}</ToggleButton>
            <ToggleButton value="declined">{t('courseReview.payout.declined')}</ToggleButton>
            <ToggleButton value="all">{t('common.all')}</ToggleButton>
          </ToggleButtonGroup>

          {payoutLoading && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                {t('common.loading')}
              </Typography>
            </Box>
          )}

          {!payoutLoading && filteredPayouts.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <PaidIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {t('courseReview.payout.empty')}
              </Typography>
            </Box>
          )}

          {!payoutLoading && filteredPayouts.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('courseReview.payout.recipient')}</TableCell>
                    <TableCell>{t('courseReview.payout.studentId')}</TableCell>
                    <TableCell>{t('courseReview.payout.course')}</TableCell>
                    <TableCell>{t('courseReview.form.academicTerm')}</TableCell>
                    <TableCell>{t('courseReview.payout.submittedAt')}</TableCell>
                    <TableCell>{t('courseReview.payout.status')}</TableCell>
                    <TableCell>{t('courseReview.payout.paidBy')}</TableCell>
                    <TableCell align="center">{t('courseReview.payout.action')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPayouts.map((review) => (
                    <TableRow key={review.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Typography variant="body2">{review.reviewer?.fullName || t('common.unknown')}</Typography>
                          {review.isAnonymous && (
                            <Tooltip title={t('courseReview.payout.anonymousHint')}>
                              <Chip label={t('courseReview.payout.anonymousTag')} size="small" variant="outlined" />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{review.reviewer?.studentId || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{review.courseName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {review.professor} · {review.courseCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {courseReviewService.getAcademicTermLabel(review.year, review.semester)}
                      </TableCell>
                      <TableCell>
                        {review.created_at ? (
                          <>
                            {new Date(review.created_at).toLocaleDateString('zh-TW', TAIPEI_DATE)}
                            <Typography variant="caption" color="text.secondary" display="block">
                              {new Date(review.created_at).toLocaleTimeString('zh-TW', TAIPEI_TIME)}
                            </Typography>
                          </>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {/* 兩個標籤並排。共用同一組 sx 讓高度與字級一致——outlined 變體多了
                            1px 邊框，不明確指定的話跟 filled 排在一起會看起來一高一低 */}
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Chip
                            label={t(`courseReview.payout.${review.payoutStatus || 'pending'}`)}
                            size="small"
                            color={PAYOUT_STATUS_COLOR[review.payoutStatus] || 'warning'}
                            sx={PAYOUT_CHIP_SX}
                          />
                          {/* 超出回饋金名額的評價按下去會被後端擋，先標出來省得白按。
                              比對 === false 而不是 !review.payoutEligible：後端若還沒
                              部署到帶名額的版本，這個欄位會是 undefined，那時什麼都不該顯示 */}
                          {review.payoutEligible === false && (
                            <Tooltip title={t('courseReview.quota.overQuotaHint')}>
                              <Chip
                                label={t('courseReview.quota.overQuota')}
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={PAYOUT_CHIP_SX}
                              />
                            </Tooltip>
                          )}
                        </Stack>
                        {review.isPaid && review.paidAt && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {new Date(review.paidAt).toLocaleDateString('zh-TW', TAIPEI_DATE)}
                            {' '}
                            {new Date(review.paidAt).toLocaleTimeString('zh-TW', TAIPEI_TIME)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {review.isPaid
                          ? (review.paidByUser?.fullName || t('common.unknown'))
                          : '-'}
                      </TableCell>
                      <TableCell align="center">
                        {/* 取消發放永遠可以按：已發放的評價一定在名額內（is_paid 會把它固定住），
                            而且不能讓任何一列卡在「無法操作」的狀態。
                            只有「標記已發放」需要看名額——超出名額時後端會回 PAYOUT_OVER_QUOTA，
                            按了必定失敗，所以整個不顯示，不是 disabled：
                            一顆按不動的按鈕只會讓人反覆嘗試。理由已經寫在左邊的「超出名額」標籤上。 */}
                        {review.payoutStatus === 'paid' || review.payoutStatus === 'declined' ? (
                          <Button size="small" color="inherit" onClick={() => handleTogglePayout(review, 'pending')}>
                            {t('courseReview.payout.markPending')}
                          </Button>
                        ) : review.payoutEligible === false ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            onClick={() => handleTogglePayout(review, 'declined')}
                          >
                            {t('courseReview.payout.markDeclined')}
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<PaidIcon />}
                            onClick={() => handleTogglePayout(review, 'paid')}
                          >
                            {t('courseReview.payout.markPaid')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* 身分組管理分頁 */}
      {activeTab === 7 && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                {t('admin.roles.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t('admin.roles.description')}
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openRoleDialog()}>
              {t('admin.roles.create')}
            </Button>
          </Stack>

          {roleLoading && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">載入中...</Typography>
            </Box>
          )}

          {!roleLoading && (
            <Grid container spacing={2}>
              {allRoles.map((role) => (
                <Grid item xs={12} md={6} key={role.id}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip
                          label={role.name}
                          size="small"
                          sx={role.color ? { bgcolor: role.color, color: '#fff', fontWeight: 600 } : { fontWeight: 600 }}
                        />
                        <Typography variant="caption" color="text.secondary">{role.key}</Typography>
                        {role.isSystem && <Chip label={t('admin.roles.builtin')} size="small" variant="outlined" />}
                        {role.isAuto && <Chip label={t('admin.roles.auto')} size="small" color="info" variant="outlined" />}
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          color="warning"
                          title={`以「${role.name}」的身分檢視全站（唯讀）`}
                          onClick={() => handleStartPreview('role', role.id, `身分組「${role.name}」`)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => openRoleDialog(role)} title={t('common.edit')}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={role.isSystem}
                          title={t(role.isSystem ? 'admin.roles.builtinNotDeletable' : 'common.delete')}
                          onClick={() => { setRoleToDelete(role); setRoleDeleteDialog(true); }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    {role.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {role.description}
                      </Typography>
                    )}

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      {t('admin.roles.memberCount', { count: role.memberCount })}{role.isAuto ? t('admin.roles.autoComputed') : ''}
                    </Typography>

                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {role.permissions.includes('*')
                        ? <Chip label={t('admin.roles.allPermissions')} size="small" color="error" />
                        : role.permissions.map((p) => (
                            <Chip
                              key={p}
                              label={permissionCatalog.find((c) => c.key === p)?.label || p}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                      {role.permissions.length === 0 && (
                        <Typography variant="caption" color="text.disabled">未設定任何權限</Typography>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {/* 模組管理分頁 */}
      {activeTab === 8 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            {t('admin.modules.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('admin.modules.description')}
          </Typography>

          {moduleLoading && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">載入中...</Typography>
            </Box>
          )}

          {!moduleLoading && (
            <Stack spacing={2}>
              {moduleSettings.map((module) => (
                <Paper key={module.key} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{module.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{module.key}</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>開放狀態</InputLabel>
                        <Select
                          value={module.visibility}
                          label={t('admin.modules.visibilityLabel')}
                          onChange={(e) => handleUpdateModule(module.key, { visibility: e.target.value })}
                        >
                          <MenuItem value="public">公開（所有人）</MenuItem>
                          <MenuItem value="restricted">限定（白名單）</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth size="small" disabled={module.visibility === 'public'}>
                        <InputLabel>可使用的身分組</InputLabel>
                        <Select
                          multiple
                          value={(module.allowedRoles || []).map((r) => r.id)}
                          label={t('admin.modules.allowedRoles')}
                          onChange={(e) => handleUpdateModule(module.key, { roleIds: e.target.value })}
                          renderValue={(selected) => (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {selected.map((id) => {
                                const r = allRoles.find((x) => x.id === id);
                                return r ? <Chip key={id} label={r.name} size="small" /> : null;
                              })}
                            </Stack>
                          )}
                        >
                          {allRoles.map((r) => (
                            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Switch
                          checked={!!module.showWhenRestricted}
                          disabled={module.visibility === 'public'}
                          onChange={(e) => handleUpdateModule(module.key, { showWhenRestricted: e.target.checked })}
                        />
                        <Typography variant="caption">
                          {t(module.showWhenRestricted ? 'admin.modules.showComingSoon' : 'admin.modules.hideCompletely')}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      )}

      {/* 公告管理分頁 */}
      {activeTab === 9 && (
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t('announcement.admin.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('announcement.admin.description')}
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => openAnnouncementDialog()}>
              {t('announcement.admin.create')}
            </Button>
          </Stack>

          {announcementLoading && <LinearProgress sx={{ mb: 2 }} />}

          {announcements.length === 0 && !announcementLoading ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              {t('announcement.admin.empty')}
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('announcement.admin.colTitle')}</TableCell>
                    <TableCell>{t('announcement.admin.colState')}</TableCell>
                    <TableCell>{t('announcement.admin.colWindow')}</TableCell>
                    <TableCell align="right">{t('announcement.admin.colActions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {announcements.map((a) => {
                    const state = announcementState(a);
                    return (
                      <TableRow key={a.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {a.title}
                            </Typography>
                            {a.level === 'important' && (
                              <Chip label={t('announcement.important')} color="error" size="small" />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t(`announcement.admin.state.${state}`)}
                            color={state === 'active' ? 'success' : 'default'}
                            variant={state === 'active' ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {a.publishAt ? new Date(a.publishAt).toLocaleString(i18n.language) : t('announcement.admin.noLimit')}
                            {' → '}
                            {a.expireAt ? new Date(a.expireAt).toLocaleString(i18n.language) : t('announcement.admin.noLimit')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openAnnouncementDialog(a)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => { setAnnouncementToDelete(a); setAnnouncementDeleteDialog(true); }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* 公告編輯對話框 */}
      <Dialog open={announcementDialog} onClose={() => setAnnouncementDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t(announcementForm.id ? 'announcement.admin.editTitle' : 'announcement.admin.create')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('announcement.admin.fieldTitle')}
              value={announcementForm.title}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t('announcement.admin.fieldBody')}
              value={announcementForm.body}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, body: e.target.value })}
              fullWidth
              required
              multiline
              minRows={4}
              helperText={t('announcement.admin.bodyHelper')}
            />
            <FormControl fullWidth>
              <InputLabel>{t('announcement.admin.fieldLevel')}</InputLabel>
              <Select
                value={announcementForm.level}
                label={t('announcement.admin.fieldLevel')}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, level: e.target.value })}
              >
                <MenuItem value="info">{t('announcement.levelInfo')}</MenuItem>
                <MenuItem value="important">{t('announcement.important')}</MenuItem>
              </Select>
            </FormControl>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('announcement.admin.fieldPublishAt')}
                type="datetime-local"
                value={announcementForm.publishAt}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, publishAt: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label={t('announcement.admin.fieldExpireAt')}
                type="datetime-local"
                value={announcementForm.expireAt}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, expireAt: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {t('announcement.admin.windowHelper')}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={announcementForm.enabled}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, enabled: e.target.checked })}
                />
              }
              label={t('announcement.admin.fieldEnabled')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnouncementDialog(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSaveAnnouncement}
            disabled={!announcementForm.title.trim() || !announcementForm.body.trim()}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 公告刪除確認 */}
      <Dialog open={announcementDeleteDialog} onClose={() => setAnnouncementDeleteDialog(false)}>
        <DialogTitle>{t('announcement.admin.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('announcement.admin.confirmDelete', { title: announcementToDelete?.title })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnouncementDeleteDialog(false)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDeleteAnnouncement}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 身分組編輯對話框 */}
      <Dialog open={roleDialog} onClose={() => setRoleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t(roleForm.id ? 'admin.roles.editTitle' : 'admin.roles.create')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('admin.roles.keyLabel')}
              value={roleForm.key}
              onChange={(e) => setRoleForm({ ...roleForm, key: e.target.value })}
              disabled={!!roleForm.id}
              helperText={t(roleForm.id ? 'admin.roles.keyLocked' : 'admin.roles.keyHelper')}
              fullWidth
            />
            <TextField
              label={t('admin.roles.nameLabel')}
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('admin.roles.descLabel')}
              value={roleForm.description || ''}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label={t('admin.roles.colorLabel')}
                type="color"
                value={roleForm.color || '#1976d2'}
                onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                sx={{ width: 120 }}
              />
              <TextField
                label={t('admin.roles.priorityLabel')}
                type="number"
                value={roleForm.priority}
                onChange={(e) => setRoleForm({ ...roleForm, priority: parseInt(e.target.value, 10) || 0 })}
                helperText={t('admin.roles.priorityHelper')}
              />
            </Stack>

            <Divider />
            <Typography variant="subtitle2">權限</Typography>
            {roleForm.permissions.includes('*') ? (
              <Alert severity="info">此身分組擁有所有權限，無法逐項調整</Alert>
            ) : (
              Object.entries(
                permissionCatalog.reduce((acc, p) => {
                  (acc[p.group] = acc[p.group] || []).push(p);
                  return acc;
                }, {})
              ).map(([group, items]) => (
                <Box key={group}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{group}</Typography>
                  <Stack>
                    {items.map((p) => (
                      <FormControlLabel
                        key={p.key}
                        control={
                          <Checkbox
                            size="small"
                            checked={roleForm.permissions.includes(p.key)}
                            onChange={(e) => setRoleForm({
                              ...roleForm,
                              permissions: e.target.checked
                                ? [...roleForm.permissions, p.key]
                                : roleForm.permissions.filter((x) => x !== p.key)
                            })}
                          />
                        }
                        label={<Typography variant="body2">{p.label}<Typography component="span" variant="caption" color="text.secondary"> — {p.description}</Typography></Typography>}
                      />
                    ))}
                  </Stack>
                </Box>
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveRole}>儲存</Button>
        </DialogActions>
      </Dialog>

      {/* 刪除身分組確認 */}
      <Dialog open={roleDeleteDialog} onClose={() => setRoleDeleteDialog(false)}>
        <DialogTitle>刪除身分組？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('admin.roles.deleteWarning', { name: roleToDelete?.name, count: roleToDelete?.memberCount })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDeleteDialog(false)}>取消</Button>
          <Button color="error" variant="contained" onClick={handleDeleteRole}>確認刪除</Button>
        </DialogActions>
      </Dialog>

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
            label={t('admin.users.newPassword')}
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
            {t('common.cancel')}
          </Button>
          <Button onClick={handlePasswordChange} variant="contained">
            {t('admin.users.confirmChange')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 刪除用戶對話框 */}
      <Dialog open={deleteUserDialog} onClose={() => setDeleteUserDialog(false)}>
        <DialogTitle>確認刪除用戶</DialogTitle>
        <DialogContent>
          <Typography>
            {t('admin.users.confirmDelete', { name: userToDelete?.username })}
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            {t('admin.users.deleteIrreversible')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteUserDialog(false);
            setUserToDelete(null);
          }}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            {t('courseReview.admin.confirmDelete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 考古題刪除確認對話框 */}
      <Dialog
        open={examDeleteDialog}
        onClose={() => setExamDeleteDialog(false)}
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
          <Button onClick={() => setExamDeleteDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleExamDeleteConfirm} color="error" variant="contained">
            {t('courseReview.admin.confirmDelete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 大抄刪除確認對話框 */}
      <Dialog
        open={cheatSheetDeleteDialog}
        onClose={() => setCheatSheetDeleteDialog(false)}
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
          <Button onClick={() => setCheatSheetDeleteDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCheatSheetDeleteConfirm} color="error" variant="contained">
            {t('courseReview.admin.confirmDelete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 拒絕課程評價對話框 */}
      <Dialog open={courseReviewRejectDialog} onClose={() => setCourseReviewRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('courseReview.admin.rejectDialogTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            autoFocus
            label={t('courseReview.admin.rejectReasonInput')}
            required
            sx={{ mt: 1 }}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            helperText={t('courseReview.admin.rejectReasonHelper')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCourseReviewRejectDialog(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectCourseReview}
            disabled={!rejectReason.trim()}
          >
            {t('courseReview.admin.confirmReject')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 刪除課程評價對話框 */}
      <Dialog open={courseReviewDeleteDialog} onClose={() => setCourseReviewDeleteDialog(false)}>
        <DialogTitle>{t('courseReview.admin.deleteDialogTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('courseReview.admin.deleteDialogBody')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCourseReviewDeleteDialog(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDeleteCourseReviewConfirm} color="error" variant="contained">
            {t('courseReview.admin.confirmDelete')}
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
      </Stack>
    </Container>
  );
};

export default AdminPage;
