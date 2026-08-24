import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Container, Grid, Paper, Snackbar, Stack, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import FeedbackAdminPanel from '../components/admin/FeedbackAdminPanel';
import AnnouncementAdminPanel from '../components/admin/AnnouncementAdminPanel';
import ModuleAdminPanel from '../components/admin/ModuleAdminPanel';
import LineAdminPanel from '../components/admin/LineAdminPanel';
import PayoutAdminPanel from '../components/admin/PayoutAdminPanel';
import CourseReviewAdminPanel from '../components/admin/CourseReviewAdminPanel';
import ExamManagePanel from '../components/admin/ExamManagePanel';
import CheatSheetManagePanel from '../components/admin/CheatSheetManagePanel';
import ExamUploadPanel from '../components/admin/ExamUploadPanel';
import CheatSheetUploadPanel from '../components/admin/CheatSheetUploadPanel';
import RoleAdminPanel from '../components/admin/RoleAdminPanel';
import UserAdminPanel from '../components/admin/UserAdminPanel';
import { useNavigate } from 'react-router-dom';
import roleService from '../services/roleService';
import { translateApiError } from '../utils';

// 後台各功能對應的權限與分頁編號。持有其中任何一項就能進入管理控制台，
// 實際看得到哪些功能由每張 tile 各自的權限決定。順序即「第一個有權限的功能」判定順序。
// 後台權限 → 該權限對應的分頁編號。
//
// 這張表有兩個用途，漏一筆就會有人被鎖在門外：
//   1. CONSOLE_PERMISSIONS（下一行）＝ 控制台的門禁清單。不在表裡的權限，
//      就算 adminSectionRows 為它列了功能卡片，持有者一進來仍會被
//      alert + navigate('/') 踢出去。
//   2. 沒有 users.manage 的人預設要落在哪個分頁（見「純總務身分」那個 effect）。
//
// announcements.manage 與 feedback.manage 原本就漏在這裡：公告管理與回饋管理
// 兩張卡片都寫好了，但只有這兩種權限的幹部根本進不了控制台。
// 新增分頁時務必回來補這一筆。
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
    'announcements.manage': 9,
    'feedback.manage': 10,
};
const CONSOLE_PERMISSIONS = Object.keys(PERMISSION_TO_TAB);

const AdminPage = () => {
    const { t } = useTranslation();
    // isAdmin 一律取自 AuthContext（全前端唯一來源），這個檔案原本自己重複推導了 4 次
    const {
        user,
        loading: authLoading,
        updateUser,
        isAdmin: hasAdminRole,
        hasPermission,
        startPreview,
    } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // 共用面板（考古題／大抄管理）的提示接到控制台這組 Snackbar。
    // 面板自己也有一組，但只在沒人接手時才顯示——同一個畫面兩組提示會互相蓋掉。
    const notifyFromPanel = useCallback((message, severity) => {
        if (severity === 'error') setError(message);
        else setSuccess(message);
    }, []);

    // 上傳相關狀態

    // 考古題管理相關狀態

    // 大抄管理相關狀態

    // 課程評價管理相關狀態

    // 身分組與模組管理相關狀態
    const [allRoles, setAllRoles] = useState([]);
    const [permissionCatalog, setPermissionCatalog] = useState([]);
    const [roleLoading, setRoleLoading] = useState(false);

    // 公告管理相關狀態。
    // publishAt / expireAt 在表單裡是 datetime-local 需要的「本地牆上時間」格式，
    // 送出前才轉成 UTC ISO；載入既有公告時反向轉回來（見 toLocalInput / toUtcIso）。

    // 回饋管理相關狀態。
    // 這些資料裡沒有任何送出者的資訊——feedback 資料表刻意沒有 user_id 欄位。

    // LINE 通知綁定狀態。null = 還在載入（此時顯示進度條而不是「未綁定」，
    // 否則畫面會先閃一下錯的狀態）。
    // 已綁定的成員名單（需 users.manage）

    // 回饋金發放管理相關狀態

    // 上傳表單錯誤狀態

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

        // 如果是管理分頁，載入對應資料
        if (activeTab === 7) {
            fetchRoles();
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

    // --- LINE 通知綁定 ---------------------------------------------------------

    // --- 回饋管理 -------------------------------------------------------------

    // status: 'pending'（未處理）| 'paid'（已發放）| 'declined'（不發放）
    // 獲取考古題資料
    // 獲取大抄資料
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
            {
                labelKey: 'nav.adminPanel',
                descKey: 'admin.sections.users',
                value: 0,
                permission: 'users.manage',
            },
            {
                labelKey: 'admin.roles.title',
                descKey: 'admin.sections.roles',
                value: 7,
                permission: 'roles.manage',
            },
            {
                labelKey: 'admin.modules.title',
                descKey: 'admin.sections.modules',
                value: 8,
                permission: 'modules.manage',
            },
        ],
        [
            {
                labelKey: 'announcement.admin.title',
                descKey: 'announcement.admin.description',
                value: 9,
                permission: 'announcements.manage',
            },
            {
                labelKey: 'feedback.admin.title',
                descKey: 'feedback.admin.description',
                value: 10,
                permission: 'feedback.manage',
            },
            // 刻意沒有 permission：綁定 LINE 是個人設定，不是管理功能。
            // 鎖在 users.manage 後面的話，只有審核權限的幹部就綁不了自己的帳號——
            // 而他們正是最需要收到待審通知的人。分頁內部的「已綁定成員」清單才鎖權限。
            { labelKey: 'line.title', descKey: 'line.description', value: 11 },
        ],
        [
            {
                labelKey: 'nav.adminExamManage',
                descKey: 'admin.sections.examManage',
                value: 3,
                permission: 'exams.manage',
            },
            {
                labelKey: 'nav.adminCheatSheetManage',
                descKey: 'admin.sections.cheatSheetManage',
                value: 4,
                permission: 'cheatSheets.manage',
            },
            {
                labelKey: 'courseReview.admin.title',
                descKey: 'courseReview.admin.description',
                value: 5,
                permission: 'courseReviews.moderate',
            },
        ],
        [
            {
                labelKey: 'nav.uploadExam',
                descKey: 'admin.sections.examUpload',
                value: 1,
                permission: 'exams.upload',
            },
            {
                labelKey: 'admin.uploadCheatSheet',
                descKey: 'admin.sections.cheatSheetUpload',
                value: 2,
                permission: 'cheatSheets.upload',
            },
            {
                labelKey: 'courseReview.payout.title',
                descKey: 'courseReview.payout.description',
                value: 6,
                permission: 'courseReviews.payout',
            },
        ],
    ]
        // 沒有 permission 的項目一律顯示。hasPermission(undefined) 會回 false
        // （AuthContext 的 default 分支是 permissions.includes(undefined)），
        // 所以必須明確跳過，否則無權限限制的卡片永遠不會出現。
        .map((row) =>
            row.filter((section) => !section.permission || hasPermission(section.permission)),
        )
        .filter((row) => row.length > 0);

    // 只等認證，不等資料——各分頁的資料由各自的元件負責。
    // （原本這裡是 authLoading || loading，而 loading 只有 fetchUsers 會放下來，
    //   沒有 users.manage 權限的人就永遠停在這個畫面。）
    if (authLoading)
        return (
            <Container sx={{ mt: 4 }}>
                <Typography>{t('common.loading')}</Typography>
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
                                            onClick={() =>
                                                section.path
                                                    ? navigate(section.path)
                                                    : setActiveTab(section.value)
                                            }
                                            sx={{
                                                p: 2,
                                                height: '100%',
                                                cursor: 'pointer',
                                                borderRadius: 3,
                                                border: '1px solid',
                                                borderColor:
                                                    !section.path && activeTab === section.value
                                                        ? 'primary.main'
                                                        : 'divider',
                                                bgcolor:
                                                    !section.path && activeTab === section.value
                                                        ? 'primary.50'
                                                        : 'background.paper',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    boxShadow: 2,
                                                },
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle1"
                                                sx={{ fontWeight: 700, mb: 0.5 }}
                                            >
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

                {/* LINE 通知分頁 */}
                {/* LINE 通知綁定分頁。整段已搬到 components/admin/LineAdminPanel.js */}
                {activeTab === 11 && (
                    <LineAdminPanel
                        canManageUsers={hasPermission('users.manage')}
                        onError={setError}
                        onSuccess={setSuccess}
                    />
                )}

                {/* 用戶管理分頁 */}
                {/* 使用者管理分頁。整段已搬到 components/admin/UserAdminPanel.js */}
                {activeTab === 0 && (
                    <UserAdminPanel
                        roles={allRoles}
                        currentUser={user}
                        onUpdateSelf={updateUser}
                        onStartPreview={handleStartPreview}
                        onError={setError}
                        onSuccess={setSuccess}
                    />
                )}

                {/* 考古題上傳分頁 */}
                {/* 上傳考古題分頁。整段已搬到 components/admin/ExamUploadPanel.js */}
                {activeTab === 1 && <ExamUploadPanel onNotify={notifyFromPanel} />}

                {/* 大抄上傳分頁 */}
                {/* 上傳大抄分頁。整段已搬到 components/admin/CheatSheetUploadPanel.js */}
                {activeTab === 2 && <CheatSheetUploadPanel onNotify={notifyFromPanel} />}

                {/* 考古題管理分頁。與獨立頁面 /admin/exam-manage 共用同一個元件，
                    功能只有一份（原本後台這裡是隔天複製過來的第二份實作）。

                    標題與卡片由這裡提供而不是由元件自己長：獨立頁面要的是
                    頁面標題（h1）+ 內容放在底色上，後台要的是區塊標題 + 卡片，
                    跟其他十個分頁一致。 */}
                {activeTab === 3 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                            {t('nav.adminExamManage')}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                            {t('manage.examDescription')}
                        </Typography>
                        <ExamManagePanel onNotify={notifyFromPanel} />
                    </Paper>
                )}

                {/* 大抄管理分頁。與獨立頁面 /admin/cheatsheet-manage 共用同一個元件，
                    外框的理由同上。 */}
                {activeTab === 4 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                            {t('nav.adminCheatSheetManage')}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                            {t('manage.cheatSheetDescription')}
                        </Typography>
                        <CheatSheetManagePanel onNotify={notifyFromPanel} />
                    </Paper>
                )}

                {/* 課程評價管理分頁 */}
                {/* 課程評價審核分頁。整段已搬到 components/admin/CourseReviewAdminPanel.js */}
                {activeTab === 5 && (
                    <CourseReviewAdminPanel onError={setError} onSuccess={setSuccess} />
                )}

                {/* 回饋金發放管理分頁 */}
                {/* 回饋金撥款分頁。整段已搬到 components/admin/PayoutAdminPanel.js */}
                {activeTab === 6 && <PayoutAdminPanel onError={setError} onSuccess={setSuccess} />}

                {/* 身分組管理分頁 */}
                {/* 身分組分頁。整段已搬到 components/admin/RoleAdminPanel.js */}
                {activeTab === 7 && (
                    <RoleAdminPanel
                        roles={allRoles}
                        permissionCatalog={permissionCatalog}
                        loading={roleLoading}
                        onRefresh={fetchRoles}
                        onStartPreview={handleStartPreview}
                        onError={setError}
                        onSuccess={setSuccess}
                    />
                )}

                {/* 模組管理分頁 */}
                {/* 模組管理分頁。整段已搬到 components/admin/ModuleAdminPanel.js */}
                {activeTab === 8 && (
                    <ModuleAdminPanel
                        roles={allRoles}
                        onEnsureRoles={fetchRoles}
                        onError={setError}
                        onSuccess={setSuccess}
                    />
                )}

                {/* 公告管理分頁 */}
                {/* 公告管理分頁。整段已搬到 components/admin/AnnouncementAdminPanel.js */}
                {activeTab === 9 && (
                    <AnnouncementAdminPanel onError={setError} onSuccess={setSuccess} />
                )}

                {/* 回饋管理分頁 */}
                {/* 意見回饋分頁。整段（含它的 8 個 state 與 5 個處理函式）已搬到
                    components/admin/FeedbackAdminPanel.js。只在被選中時掛載，
                    所以資料由它自己在 mount 時抓，不必再回到上面那條 if/else if 鏈加分支。 */}
                {activeTab === 10 && (
                    <FeedbackAdminPanel onError={setError} onSuccess={setSuccess} />
                )}

                {/* 錯誤和成功訊息 */}
                <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
                    <Alert severity="error" onClose={() => setError('')}>
                        {error}
                    </Alert>
                </Snackbar>

                <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
                    <Alert severity="success" onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                </Snackbar>
            </Stack>
        </Container>
    );
};

export default AdminPage;
