// 驗證寫評價表單的「先選學期、再搜該學期的課」流程。
//
// 這幾條規則都不容易靠讀程式碼確認，而且錯了會產生壞資料（例如把 114-2 的教授
// 標成 114-1 的課），所以用測試釘住：
//   1. 新增時預設帶入「最近一個期末考已結束」的學期，不是今天所在的學期
//   2. 搜尋會帶上該學期，並且只在「全部」模式才跨學期
//   3. 換學期會清掉已帶入的課號與教授（它們屬於原本那個學期）
//   4. 停在「全部」又沒從選單挑課程時，送出要被擋下

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WriteReviewDialog from '../../../main/js/components/courseReview/WriteReviewDialog';
import courseReviewService from '../../../main/js/services/courseReviewService';

// 必須給明確的 factory，不能只寫 jest.mock(path)：
// 自動 mock 仍會載入真實模組來推導形狀，而它會經 api.js 拉進 axios，
// 而 axios v1 是 ESM、CRA 的 jest 預設不轉譯 node_modules，會直接解析失敗。
jest.mock('../../../main/js/services/courseReviewService', () => ({
    __esModule: true,
    default: {
        getReviewableTerms: jest.fn(),
        searchCourseCatalog: jest.fn(),
        getAcademicTermLabel: jest.fn(),
        createReview: jest.fn(),
        updateReview: jest.fn(),
        getQualityText: jest.fn(),
        getDifficultyText: jest.fn(),
        getSweetnessText: jest.fn(),
        getUsefulnessText: jest.fn(),
    },
}));

// i18n 在測試裡直接回 key，斷言才不會綁在文案上
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));
jest.mock('../../../main/js/i18n', () => ({
    __esModule: true,
    default: { t: (key, opts) => (opts && opts.defaultValue) || key },
}));
jest.mock('../../../main/js/utils', () => ({
    translateApiError: (err, fallback) => fallback || 'error',
}));

// 現在是 115-1 學期進行中（期末考未結束），所以最近一個可填學期是 114-2
const REVIEWABLE_TERMS = [
    { year: 2025, semester: '2' },
    { year: 2025, semester: '1' },
    { year: 2024, semester: '2' },
];

const CATALOG = {
    '2025-1': [
        { courseCode: 'LibEdu1021', courseName: '邏輯', professor: '傅皓政', year: 2025, semester: '1' },
    ],
    '2025-2': [
        { courseCode: 'Phl1511', courseName: '邏輯', professor: '曾漢塘', year: 2025, semester: '2' },
    ],
};

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    courseReviewService.getReviewableTerms.mockResolvedValue(REVIEWABLE_TERMS);
    courseReviewService.getAcademicTermLabel.mockImplementation(
        (year, semester) => `${year - 1911}-${semester}`
    );
    courseReviewService.searchCourseCatalog.mockImplementation((keyword, opts = {}) => {
        if (opts.year && opts.semester) {
            return Promise.resolve(CATALOG[`${opts.year}-${opts.semester}`] || []);
        }
        return Promise.resolve([...CATALOG['2025-1'], ...CATALOG['2025-2']]);
    });
    ['getQualityText', 'getDifficultyText', 'getSweetnessText', 'getUsefulnessText'].forEach((fn) => {
        courseReviewService[fn] = jest.fn(() => 'x');
    });
});

const renderDialog = () =>
    render(<WriteReviewDialog open onClose={() => {}} review={null} onSaved={() => {}} />);

const termField = () => screen.getByLabelText('courseReview.form.academicTerm');
const nameInput = () => screen.getByLabelText(/courseReview\.form\.courseName/);
const professorInput = () => screen.getByLabelText(/courseReview\.form\.professor/);
const codeInput = () => screen.getByLabelText(/courseReview\.form\.courseCode/);

describe('WriteReviewDialog 學期與課程搜尋', () => {
    test('預設帶入最近一個期末考已結束的學期（114-2），而不是進行中的 115-1', async () => {
        renderDialog();
        await waitFor(() => {
            expect(termField()).toHaveTextContent('114-2');
        });
        expect(termField()).not.toHaveTextContent('115-1');
    });

    test('搜尋會帶上目前選定的學期', async () => {
        renderDialog();
        await waitFor(() => expect(termField()).toHaveTextContent('114-2'));

        fireEvent.change(nameInput(), { target: { value: '邏輯' } });

        await waitFor(
            () => {
                expect(courseReviewService.searchCourseCatalog).toHaveBeenCalledWith(
                    '邏輯',
                    expect.objectContaining({ year: '2025', semester: '2', limit: 150 })
                );
            },
            { timeout: 3000 }
        );
    });

    test('換學期會清掉已帶入的課號與教授', async () => {
        renderDialog();
        await waitFor(() => expect(termField()).toHaveTextContent('114-2'));

        fireEvent.change(nameInput(), { target: { value: '邏輯' } });
        const option = await screen.findByText('曾漢塘 · Phl1511', undefined, { timeout: 3000 });
        fireEvent.click(option);

        await waitFor(() => expect(professorInput()).toHaveValue('曾漢塘'));
        expect(codeInput()).toHaveValue('Phl1511');
        // 帶入後鎖定
        expect(professorInput()).toBeDisabled();

        // 改成 114-1
        fireEvent.mouseDown(termField());
        fireEvent.click(await screen.findByRole('option', { name: '114-1' }));

        await waitFor(() => expect(professorInput()).toHaveValue(''));
        expect(codeInput()).toHaveValue('');
        // 解鎖，讓使用者可以重選或手動填
        expect(professorInput()).not.toBeDisabled();
        // 課程名稱保留，不用重打
        expect(nameInput()).toHaveValue('邏輯');
    });

    test('「全部」模式跨學期搜尋，且同名不同學期都出現', async () => {
        renderDialog();
        await waitFor(() => expect(termField()).toHaveTextContent('114-2'));

        fireEvent.mouseDown(termField());
        fireEvent.click(await screen.findByRole('option', { name: 'courseReview.form.allTerms' }));

        fireEvent.change(nameInput(), { target: { value: '邏輯' } });

        // 「全部」模式不帶學期、名額再放大一級（跨三學期，筆數約三倍）
        await waitFor(
            () => {
                expect(courseReviewService.searchCourseCatalog).toHaveBeenCalledWith(
                    '邏輯',
                    expect.objectContaining({ year: undefined, semester: undefined, limit: 200 })
                );
            },
            { timeout: 3000 }
        );

        // 兩個學期的選項都在，而且此時才顯示學年期
        expect(await screen.findByText('傅皓政 · LibEdu1021 · 114-1')).toBeInTheDocument();
        expect(screen.getByText('曾漢塘 · Phl1511 · 114-2')).toBeInTheDocument();
    });

    test('「全部」模式挑了課程後，學期會切成該課程的學年期', async () => {
        renderDialog();
        await waitFor(() => expect(termField()).toHaveTextContent('114-2'));

        fireEvent.mouseDown(termField());
        fireEvent.click(await screen.findByRole('option', { name: 'courseReview.form.allTerms' }));
        fireEvent.change(nameInput(), { target: { value: '邏輯' } });

        const option = await screen.findByText('傅皓政 · LibEdu1021 · 114-1', undefined, { timeout: 3000 });
        fireEvent.click(option);

        await waitFor(() => expect(termField()).toHaveTextContent('114-1'));
        expect(professorInput()).toHaveValue('傅皓政');
    });

    test('結果剛好塞滿名額時，提示使用者縮小關鍵字', async () => {
        // 回傳筆數等於 limit ＝ 可能還有沒顯示到的課程。不提示的話使用者會以為
        // 那些課不存在——「國文、英文有缺」的回報就是這樣來的。
        courseReviewService.searchCourseCatalog.mockResolvedValueOnce(
            Array.from({ length: 150 }, (_, i) => ({
                courseCode: `X${i}`,
                courseName: '英文',
                professor: `教授${i}`,
                year: 2025,
                semester: '2',
            }))
        );

        renderDialog();
        await waitFor(() => expect(termField()).toHaveTextContent('114-2'));
        fireEvent.change(nameInput(), { target: { value: '英文' } });

        expect(
            await screen.findByText('courseReview.form.searchTruncatedHint', undefined, { timeout: 3000 })
        ).toBeInTheDocument();
    });

    test('結果沒滿名額時不顯示截斷提示', async () => {
        renderDialog();
        await waitFor(() => expect(termField()).toHaveTextContent('114-2'));
        fireEvent.change(nameInput(), { target: { value: '邏輯' } });

        await waitFor(() => expect(courseReviewService.searchCourseCatalog).toHaveBeenCalled(), { timeout: 3000 });
        expect(screen.queryByText('courseReview.form.searchTruncatedHint')).not.toBeInTheDocument();
    });

    test('停在「全部」又沒從選單挑課程時，送出被擋下', async () => {
        renderDialog();
        await waitFor(() => expect(termField()).toHaveTextContent('114-2'));

        fireEvent.mouseDown(termField());
        fireEvent.click(await screen.findByRole('option', { name: 'courseReview.form.allTerms' }));
        fireEvent.change(nameInput(), { target: { value: '不存在的課' } });

        fireEvent.click(screen.getByText('courseReview.form.submitReview'));

        expect(await screen.findByText('courseReview.form.termRequiredForManualEntry')).toBeInTheDocument();
        expect(courseReviewService.createReview).not.toHaveBeenCalled();
    });
});
