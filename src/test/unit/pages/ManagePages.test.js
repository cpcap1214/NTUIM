// 考古題管理頁與大抄管理頁的行為網。
//
// 這兩支頁面有 69% 的行完全相同（去空白去註解後 180/261），接下來要把共用邏輯
// 抽成 hook。抽取本身不該改變任何行為，但「不該改變」需要有東西看著——
// 這個檔案就是那個東西，先於重構建立。
//
// 兩支頁面刻意跑同一組情境：共用邏輯若在某一支壞掉、另一支沒壞，
// 代表抽取抽得不對。

import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'zh-TW' } }),
}));

// 兩支頁面都靠 useAuth 決定要不要擋下非管理員
const mockAuth = { user: { id: 1, username: 'admin' }, isAdmin: true };
jest.mock('../../../main/js/contexts/AuthContext', () => ({
    useAuth: () => mockAuth,
}));

// service 要給明確 factory：自動 mock 仍會載入真實模組，
// 而它經 api.js 拉進 axios（ESM，CRA 的 jest 不轉譯 node_modules）
jest.mock('../../../main/js/services/examService', () => ({
    __esModule: true,
    default: { updateExam: jest.fn(), updateExamFiles: jest.fn() },
}));
jest.mock('../../../main/js/services/cheatSheetService', () => ({
    __esModule: true,
    default: { updateCheatSheet: jest.fn(), updateCheatSheetFile: jest.fn() },
}));
jest.mock('../../../main/js/services/api', () => ({
    __esModule: true,
    API_BASE_URL: '/api',
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// 編輯對話框各自有測試，這裡只需要知道它有沒有被開起來
jest.mock('../../../main/js/components/EditExamDialog', () => ({
    __esModule: true,
    default: ({ open }) => (open ? <div data-testid="edit-dialog" /> : null),
}));
jest.mock('../../../main/js/components/EditCheatSheetDialog', () => ({
    __esModule: true,
    default: ({ open }) => (open ? <div data-testid="edit-dialog" /> : null),
}));

import ExamManagePage from '../../../main/js/pages/ExamManagePage';
import CheatSheetManagePage from '../../../main/js/pages/CheatSheetManagePage';

const EXAMS = [
    {
        id: 1,
        courseCode: 'IM2001',
        courseName: '資料結構',
        professor: '陳教授',
        year: 2024,
        semester: '1',
        examType: 'midterm',
        examAttempt: 1,
        questionFileName: 'q1.pdf',
        questionFileSize: 1024,
        downloadCount: 3,
        created_at: '2024-03-01T00:00:00Z',
        uploader: { username: 'alice', fullName: '愛麗絲' },
    },
    {
        id: 2,
        courseCode: 'IM3005',
        courseName: '演算法',
        professor: '林教授',
        year: 2024,
        semester: '2',
        examType: 'final',
        examAttempt: 1,
        questionFileName: 'q2.pdf',
        questionFileSize: 2048,
        downloadCount: 7,
        created_at: '2024-06-01T00:00:00Z',
        uploader: { username: 'bob', fullName: '巴布' },
    },
];

const SHEETS = [
    {
        id: 1,
        courseCode: 'IM2001',
        courseName: '資料結構',
        title: '期中重點',
        description: '',
        tags: [],
        fileName: 'c1.pdf',
        fileSize: 1024,
        downloadCount: 3,
        created_at: '2024-03-01T00:00:00Z',
        uploader: { username: 'alice', fullName: '愛麗絲' },
    },
    {
        id: 2,
        courseCode: 'IM3005',
        courseName: '演算法',
        title: '期末總整理',
        description: '',
        tags: [],
        fileName: 'c2.pdf',
        fileSize: 2048,
        downloadCount: 7,
        created_at: '2024-06-01T00:00:00Z',
        uploader: { username: 'bob', fullName: '巴布' },
    },
];

// 兩支頁面共用的情境表：只有「怎麼取得資料」與「列裡看得到什麼字」不同
const CASES = [
    {
        name: '考古題管理頁',
        Page: ExamManagePage,
        rows: EXAMS,
        listPath: '/api/exams',
        deletePath: '/api/exams/1',
        firstRowText: '資料結構',
        secondRowText: '演算法',
        // 兩支頁面比對的欄位不同（見檔案末尾的分歧測試），所以搜尋字串各給各的
        searchHitsFirstOnly: 'IM2001',
        // 兩支頁面對同一個 UI 元件用了不同的 i18n key，這裡照實反映
        searchPlaceholder: 'courseReview.admin.searchPlaceholder',
    },
    {
        name: '大抄管理頁',
        Page: CheatSheetManagePage,
        rows: SHEETS,
        listPath: '/api/cheat-sheets',
        deletePath: '/api/cheat-sheets/1',
        firstRowText: '期中重點',
        secondRowText: '期末總整理',
        searchHitsFirstOnly: '期中',
        searchPlaceholder: 'cheatSheet.searchPlaceholder',
    },
];

// 刪除確認鈕的 key 兩頁相同——即使頁面跟課程評價無關，用的仍是
// courseReview.admin.confirmDelete。這是既有的 key 借用，照實反映。
const CONFIRM_DELETE_KEY = 'courseReview.admin.confirmDelete';

const okJson = (data) => ({ ok: true, json: async () => ({ data }) });

describe.each(CASES)('$name', (c) => {
    beforeEach(() => {
        mockAuth.user = { id: 1, username: 'admin' };
        mockAuth.isAdmin = true;
        global.fetch = jest.fn().mockResolvedValue(okJson(c.rows));
        window.URL.createObjectURL = jest.fn(() => 'blob:x');
        window.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        delete global.fetch;
    });

    test('非管理員看到權限不足的畫面', () => {
        mockAuth.isAdmin = false;
        render(<c.Page />);

        expect(screen.getByText('guard.noPermissionTitle')).toBeInTheDocument();
    });

    // 這條原本釘的是一個壞掉的現況：權限判斷在 render 裡提前 return，
    // 但抓資料的 useEffect 在那之前就跑掉了，非管理員仍會送出一次清單請求。
    //
    // 把功能抽成 ExamManagePanel / CheatSheetManagePanel 之後，抓資料的程式碼
    // 隨面板一起走了，而面板要通過權限判斷才會掛載——問題自己消失了。
    // 這不是刻意去修的，是結構變對之後的結果，所以改成釘住正確行為。
    test('非管理員不會送出任何請求', () => {
        mockAuth.isAdmin = false;
        render(<c.Page />);

        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('載入後每一筆都渲染得出來', async () => {
        render(<c.Page />);

        expect(await screen.findByText(c.firstRowText)).toBeInTheDocument();
        expect(screen.getByText(c.secondRowText)).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(c.listPath));
    });

    test('搜尋會濾掉不符合的那筆', async () => {
        render(<c.Page />);
        await screen.findByText(c.firstRowText);

        const search = screen.getByPlaceholderText(c.searchPlaceholder);
        fireEvent.change(search, { target: { value: c.searchHitsFirstOnly } });

        expect(screen.getByText(c.firstRowText)).toBeInTheDocument();
        expect(screen.queryByText(c.secondRowText)).not.toBeInTheDocument();
    });

    test('搜尋比對不分大小寫', async () => {
        render(<c.Page />);
        await screen.findByText(c.firstRowText);

        fireEvent.change(screen.getByPlaceholderText(c.searchPlaceholder), {
            target: { value: c.searchHitsFirstOnly.toLowerCase() },
        });

        expect(screen.getByText(c.firstRowText)).toBeInTheDocument();
    });

    test('抓取失敗時顯示錯誤，不是空白畫面', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
        render(<c.Page />);

        expect(await screen.findByRole('alert')).toBeInTheDocument();
    });

    test('刪除要先確認，確認後才真的送出 DELETE 並重抓清單', async () => {
        render(<c.Page />);
        await screen.findByText(c.firstRowText);

        const initialCalls = global.fetch.mock.calls.length;

        fireEvent.click(screen.getAllByRole('button', { name: 'common.delete' })[0]);

        // 只是打開確認框，還沒送出任何請求
        expect(global.fetch).toHaveBeenCalledTimes(initialCalls);

        const dialog = await screen.findByRole('dialog');
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
            .mockResolvedValue(okJson(c.rows));

        fireEvent.click(within(dialog).getByText(CONFIRM_DELETE_KEY));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(c.deletePath),
                expect.objectContaining({ method: 'DELETE' }),
            );
        });
        // 刪完一定要重抓，否則畫面會留著已經不存在的那一列
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    });

    test('刪除取消就不會送出請求', async () => {
        render(<c.Page />);
        await screen.findByText(c.firstRowText);
        const before = global.fetch.mock.calls.length;

        fireEvent.click(screen.getAllByRole('button', { name: 'common.delete' })[0]);
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByText('common.cancel'));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(global.fetch).toHaveBeenCalledTimes(before);
    });

    // 守另一個方向：標題從面板搬到外殼時不能搬丟了。
    // 面板本身不再有標題（後台要的是區塊標題 + 卡片），所以頁面外殼
    // 必須自己提供——少了它，這一頁就沒有任何頁面標題。
    test('有唯一的頁面標題（h1）', async () => {
        render(<c.Page />);
        await screen.findByText(c.firstRowText);

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    test('點編輯會開啟編輯對話框', async () => {
        render(<c.Page />);
        await screen.findByText(c.firstRowText);

        fireEvent.click(screen.getAllByRole('button', { name: 'common.edit' })[0]);

        expect(await screen.findByTestId('edit-dialog')).toBeInTheDocument();
    });
});

// ── 兩支頁面的行為分歧 ────────────────────────────────────────────
//
// 這兩條記錄的是「複製貼上之後各自長歪」的結果。抽取共用邏輯時如果
// 不小心把兩邊統一了，這裡會轉紅——那時要做的是刻意決定要統一成哪一種，
// 而不是讓它默默改變。

test('考古題管理頁的搜尋比對課號', async () => {
    mockAuth.isAdmin = true;
    global.fetch = jest.fn().mockResolvedValue(okJson(EXAMS));
    render(<ExamManagePage />);
    await screen.findByText('資料結構');

    fireEvent.change(screen.getByPlaceholderText('courseReview.admin.searchPlaceholder'), {
        target: { value: 'IM2001' },
    });

    expect(screen.getByText('資料結構')).toBeInTheDocument();
    delete global.fetch;
});

test('（分歧）大抄管理頁的搜尋不比對課號，儘管表格裡看得到課號', async () => {
    mockAuth.isAdmin = true;
    global.fetch = jest.fn().mockResolvedValue(okJson(SHEETS));
    render(<CheatSheetManagePage />);
    await screen.findByText('期中重點');

    fireEvent.change(screen.getByPlaceholderText('cheatSheet.searchPlaceholder'), {
        target: { value: 'IM2001' },
    });

    // 大抄頁只比對 title / courseName / description，所以課號搜不到任何東西
    expect(screen.queryByText('期中重點')).not.toBeInTheDocument();
    delete global.fetch;
});

// 只有考古題有教授欄位，單獨測
test('考古題管理頁可以用教授名稱搜尋', async () => {
    mockAuth.isAdmin = true;
    global.fetch = jest.fn().mockResolvedValue(okJson(EXAMS));
    render(<ExamManagePage />);
    await screen.findByText('資料結構');

    fireEvent.change(screen.getByPlaceholderText('courseReview.admin.searchPlaceholder'), {
        target: { value: '林教授' },
    });

    expect(screen.getByText('演算法')).toBeInTheDocument();
    expect(screen.queryByText('資料結構')).not.toBeInTheDocument();
    delete global.fetch;
});

// ── 表格標題必須走 i18n ────────────────────────────────────────────
//
// 這些標題原本是直接寫在 JSX 裡的中文，介面切成英文時整排標題仍是中文。
// t() 在測試裡回傳 key 本身，所以「看得到 manage.columns.* 這種字串」
// 就等於「這一格有走 i18n」。有人改回寫死中文，這裡會轉紅。
describe.each(CASES)('$name 的表格標題', (c) => {
    beforeEach(() => {
        mockAuth.isAdmin = true;
        global.fetch = jest.fn().mockResolvedValue(okJson(c.rows));
    });

    afterEach(() => {
        delete global.fetch;
    });

    test('每個欄位標題都是 i18n key，沒有寫死的字', async () => {
        render(<c.Page />);
        await screen.findByText(c.firstRowText);

        const headers = screen.getAllByRole('columnheader');
        expect(headers.length).toBeGreaterThan(0);
        headers.forEach((cell) => {
            expect(cell.textContent).toMatch(/^manage.columns./);
        });
    });
});

// ── 後台分頁與獨立頁面必須共用同一份實作 ──────────────────────────
//
// 這兩份功能曾經是兩套：獨立頁面 /admin/exam-manage 建於 2025-08-30，
// 後台控制台的分頁是隔天複製過去的。複製品後來沒跟上——欄位標題還是寫死的
// 中文、表格在手機會把整頁撐開，而沒有人發現，因為兩邊看起來「差不多」。
//
// 這條測試直接讀原始碼，確認兩邊 import 的是同一個元件。
// 有人為了改後台而複製第三份出來，這裡會轉紅。
describe('考古題／大抄管理只有一份實作', () => {
    const read = (rel) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

    test.each([
        ['ExamManagePanel', 'src/main/js/pages/ExamManagePage.js'],
        ['CheatSheetManagePanel', 'src/main/js/pages/CheatSheetManagePage.js'],
    ])('後台與獨立頁面都用 %s', (panel, pagePath) => {
        const adminSrc = read('src/main/js/pages/AdminPage.js');
        const pageSrc = read(pagePath);

        expect(adminSrc).toContain(`components/admin/${panel}`);
        expect(pageSrc).toContain(`components/admin/${panel}`);

        // 而且兩邊都不該再自己實作一次表格
        expect(pageSrc).not.toContain('<TableHead>');
        expect(adminSrc).not.toContain('filteredExams');
        expect(adminSrc).not.toContain('filteredCheatSheets');
    });
});
