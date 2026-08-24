// 後台控制台的冒煙測試網。
//
// AdminPage.js 有 5276 行、74 個 useState、59 個 <Dialog>，而且一條測試都沒有。
// 接下來要把它按分頁拆成獨立元件，那是大範圍搬動程式碼——沒有這張網等於盲目施工。
//
// 這裡不測每個分頁的細部行為（那屬於各分頁拆出來之後自己的測試），
// 只釘住三件拆解過程最容易弄壞的事：
//   1. 誰進得來、誰進不來
//   2. 每張功能卡片會不會依權限出現／消失
//   3. 切到某個分頁時，該分頁的資料載入有沒有被觸發
//
// 第 3 點是拆解時最容易掉的東西：那些 fetch 目前全擠在同一個 useEffect 的
// if/else if 鏈裡（AdminPage.js:290 起），搬動時很容易漏掉一條而毫無徵兆。

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'zh-TW' } }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

// 權限由每個測試自己設定；hasPermission 照 AuthContext 的語意，
// 未列出的權限一律 false
let grantedPermissions = [];
const mockAuth = {
    user: { id: 1, username: 'admin', role: 'admin' },
    // AdminPage 取的是 useAuth().loading，在那裡改名叫 authLoading
    loading: false,
    updateUser: jest.fn(),
    isAdmin: true,
    hasPermission: (p) => grantedPermissions.includes(p),
    startPreview: jest.fn(),
};
jest.mock('../../../main/js/contexts/AuthContext', () => ({
    useAuth: () => mockAuth,
}));

// 每個 service 都要給明確 factory：自動 mock 仍會載入真實模組，
// 而它們經 api.js 拉進 axios（ESM，CRA 的 jest 不轉譯 node_modules）
jest.mock('../../../main/js/services/announcementService', () => ({
    __esModule: true,
    default: {
        getAll: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    },
}));
jest.mock('../../../main/js/services/courseReviewService', () => ({
    __esModule: true,
    default: {
        getAdminReviews: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
        getPayouts: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
        getFilterOptions: jest.fn().mockResolvedValue({}),
        reviewStatus: jest.fn(),
        setPayoutStatus: jest.fn(),
        downloadPayoutCsv: jest.fn(),
        getStatusLabel: jest.fn(() => ''),
        getStatusColor: jest.fn(() => 'default'),
        getAcademicTermLabel: jest.fn(() => ''),
        getSemesterOptions: jest.fn(() => []),
        formatRating: jest.fn(() => ''),
        getRatingColor: jest.fn(() => 'default'),
        getQualityText: jest.fn(() => ''),
        getDifficultyText: jest.fn(() => ''),
        getSweetnessText: jest.fn(() => ''),
        getUsefulnessText: jest.fn(() => ''),
    },
}));
jest.mock('../../../main/js/services/feedbackService', () => ({
    __esModule: true,
    default: {
        getAll: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        remove: jest.fn(),
    },
}));
jest.mock('../../../main/js/services/lineService', () => ({
    __esModule: true,
    default: {
        getBinding: jest.fn().mockResolvedValue({ bound: false }),
        createBindingCode: jest.fn(),
        unbind: jest.fn(),
        getBindings: jest.fn().mockResolvedValue([]),
        unbindUser: jest.fn(),
    },
}));
jest.mock('../../../main/js/services/moduleService', () => ({
    __esModule: true,
    default: {
        getModules: jest.fn().mockResolvedValue({}),
        getModuleSettings: jest.fn().mockResolvedValue([]),
        updateModule: jest.fn(),
    },
}));
jest.mock('../../../main/js/services/roleService', () => ({
    __esModule: true,
    default: {
        getRoles: jest.fn().mockResolvedValue([]),
        getPermissionCatalog: jest.fn().mockResolvedValue([]),
        createRole: jest.fn(),
        updateRole: jest.fn(),
        deleteRole: jest.fn(),
        getMembers: jest.fn().mockResolvedValue([]),
        setUserRoles: jest.fn(),
    },
}));
jest.mock('../../../main/js/services/api', () => ({
    __esModule: true,
    API_BASE_URL: '/api',
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../../main/js/utils', () => ({
    translateApiError: (err, fallback) => fallback || 'error',
}));
jest.mock('../../../main/js/components/courseReview/ReviewCard', () => ({
    __esModule: true,
    default: () => null,
}));

import AdminPage from '../../../main/js/pages/AdminPage';
import announcementService from '../../../main/js/services/announcementService';
import courseReviewService from '../../../main/js/services/courseReviewService';
import feedbackService from '../../../main/js/services/feedbackService';
import moduleService from '../../../main/js/services/moduleService';
import roleService from '../../../main/js/services/roleService';

// 控制台的 12 個分頁。cardKey 是功能卡片上的說明文字（用來點它），
// loads 是切過去之後應該被觸發的資料載入。
const TABS = [
    { value: 0, name: '使用者管理', permission: 'users.manage', cardKey: 'admin.sections.users' },
    {
        value: 1,
        name: '上傳考古題',
        permission: 'exams.upload',
        cardKey: 'admin.sections.examUpload',
    },
    {
        value: 2,
        name: '上傳大抄',
        permission: 'cheatSheets.upload',
        cardKey: 'admin.sections.cheatSheetUpload',
    },
    {
        value: 3,
        name: '考古題管理',
        permission: 'exams.manage',
        cardKey: 'admin.sections.examManage',
        loadsFetch: '/api/exams',
    },
    {
        value: 4,
        name: '大抄管理',
        permission: 'cheatSheets.manage',
        cardKey: 'admin.sections.cheatSheetManage',
        loadsFetch: '/api/cheat-sheets',
    },
    {
        value: 5,
        name: '課程評價審核',
        permission: 'courseReviews.moderate',
        cardKey: 'courseReview.admin.description',
        loads: () => courseReviewService.getAdminReviews,
    },
    {
        value: 6,
        name: '回饋金撥款',
        permission: 'courseReviews.payout',
        cardKey: 'courseReview.payout.description',
        loads: () => courseReviewService.getPayouts,
    },
    {
        value: 7,
        name: '身分組',
        permission: 'roles.manage',
        cardKey: 'admin.sections.roles',
        loads: () => roleService.getRoles,
    },
    {
        value: 8,
        name: '模組',
        permission: 'modules.manage',
        cardKey: 'admin.sections.modules',
        loads: () => moduleService.getModuleSettings,
    },
    {
        value: 9,
        name: '公告',
        permission: 'announcements.manage',
        cardKey: 'announcement.admin.description',
        loads: () => announcementService.getAll,
    },
    {
        value: 10,
        name: '意見回饋',
        permission: 'feedback.manage',
        cardKey: 'feedback.admin.description',
        loads: () => feedbackService.getAll,
    },
    // LINE 分頁刻意沒有 permission：綁定自己的帳號是個人設定，不是管理功能
    { value: 11, name: 'LINE 綁定', permission: null, cardKey: 'line.description' },
];

const ALL_PERMISSIONS = TABS.map((tab) => tab.permission).filter(Boolean);

const okJson = (data) => ({ ok: true, json: async () => data });

beforeEach(() => {
    grantedPermissions = [];
    mockNavigate.mockClear();
    global.fetch = jest.fn().mockResolvedValue(okJson([]));
    global.alert = jest.fn();
});

afterEach(() => {
    delete global.fetch;
});

describe('後台控制台的進入條件', () => {
    test('完全沒有後台權限的人會被導回首頁', async () => {
        grantedPermissions = [];
        render(<AdminPage />);

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
    });

    test('持有任一後台權限就進得來', async () => {
        grantedPermissions = ['users.manage'];
        render(<AdminPage />);

        expect(await screen.findByText('admin.consoleTitle')).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    // 這條抓的是一個真實的壞法：setLoading(false) 只寫在 fetchUsers 裡
    // （AdminPage.js:776/779），而 fetchUsers 只在有 users.manage 時才呼叫。
    // 沒有該權限的幹部（例如只有審核權的學術部）會永遠停在「載入中...」，
    // 整個控制台對他們是不能用的。
    test('沒有 users.manage 的人也要看得到控制台，不能卡在載入中', async () => {
        grantedPermissions = ['courseReviews.moderate'];
        render(<AdminPage />);

        expect(await screen.findByText('admin.consoleTitle')).toBeInTheDocument();
    });
});

describe('功能卡片依權限出現', () => {
    test.each(TABS.filter((tab) => tab.permission))(
        '有 $permission 才看得到「$name」的卡片',
        async (tab) => {
            grantedPermissions = [tab.permission];
            const { unmount } = render(<AdminPage />);
            await screen.findByText('admin.consoleTitle');
            expect(screen.getAllByText(tab.cardKey).length).toBeGreaterThan(0);
            unmount();

            // 換成別人的權限，這張卡片就該消失
            grantedPermissions = ['announcements.manage'];
            if (tab.permission === 'announcements.manage') return;
            render(<AdminPage />);
            await screen.findByText('admin.consoleTitle');
            expect(screen.queryByText(tab.cardKey)).not.toBeInTheDocument();
        },
    );

    test('LINE 綁定不需要任何權限就看得到', async () => {
        grantedPermissions = ['feedback.manage'];
        render(<AdminPage />);
        await screen.findByText('admin.consoleTitle');

        expect(screen.getAllByText('line.description').length).toBeGreaterThan(0);
    });
});

// 切到某個分頁時，該分頁的資料載入有沒有被觸發。
//
// 這是拆解時最容易掉的東西：那些 fetch 目前全擠在同一個 useEffect 的
// if/else if 鏈裡，搬動時很容易漏掉一條而毫無徵兆——畫面照樣渲染，只是永遠空的。
//
// 走 service 的分頁與走裸 fetch 的分頁分開測，不要在同一條測試裡用 if 分岔
// （那會讓失敗訊息說不清楚是哪一種情況壞了）。
describe('切換分頁會載入該分頁的資料（走 service）', () => {
    test.each(TABS.filter((tab) => tab.loads))('切到「$name」會觸發資料載入', async (tab) => {
        grantedPermissions = ALL_PERMISSIONS;
        render(<AdminPage />);
        await screen.findByText('admin.consoleTitle');

        const loader = tab.loads();
        loader.mockClear();

        // 卡片在 DOM 裡排在分頁內容之前，所以取第一個
        fireEvent.click(screen.getAllByText(tab.cardKey)[0]);

        await waitFor(() => expect(loader).toHaveBeenCalled());
    });
});

describe('切換分頁會載入該分頁的資料（走裸 fetch）', () => {
    test.each(TABS.filter((tab) => tab.loadsFetch))('切到「$name」會觸發資料載入', async (tab) => {
        grantedPermissions = ALL_PERMISSIONS;
        render(<AdminPage />);
        await screen.findByText('admin.consoleTitle');

        global.fetch.mockClear();
        fireEvent.click(screen.getAllByText(tab.cardKey)[0]);

        // 這兩個分頁的 fetch 不帶第二個參數，所以只比對 URL
        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(tab.loadsFetch)),
        );
    });
});

describe('每個分頁都渲染得出來', () => {
    test.each(TABS)('「$name」切過去不會拋錯', async (tab) => {
        grantedPermissions = ALL_PERMISSIONS;
        render(<AdminPage />);
        await screen.findByText('admin.consoleTitle');

        expect(() => fireEvent.click(screen.getAllByText(tab.cardKey)[0])).not.toThrow();
        // 切完之後控制台本體還在（沒有整個 render tree 爆掉）
        expect(screen.getByText('admin.consoleTitle')).toBeInTheDocument();
    });
});

// ── 分頁不該帶入頁面層級的標題 ──────────────────────────────────
//
// 控制台自己的標題是 h4。任何分頁跑出一個 <h1>，就代表有人把一個「頁面」
// 整包塞進控制台——那正是考古題／大抄管理曾經壞掉的方式：它們渲染的是
// 從獨立頁面抽出來的元件，連頁面外框一起帶了進來，於是後台少了卡片、
// 多了一個 3rem 的大標題，而且 h1 被包在 h4 裡面（無障礙上也是錯的）。
//
// 用 test.each 而不是在一條測試裡跑迴圈，失敗時才看得出是哪一個分頁。
describe('後台分頁不該帶入頁面層級的標題', () => {
    test.each(TABS)('切到「$name」之後控制台裡沒有 <h1>', async (tab) => {
        grantedPermissions = ALL_PERMISSIONS;
        render(<AdminPage />);
        await screen.findByText('admin.consoleTitle');

        fireEvent.click(screen.getAllByText(tab.cardKey)[0]);

        expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0);
    });
});
