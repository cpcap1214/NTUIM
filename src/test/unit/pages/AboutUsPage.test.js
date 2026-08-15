// 幹部區塊的學年切換。
//
// 真正容易壞的不是切換本身，而是「本學年還沒公佈名單」那段空窗期：
// 台大學年度 8 月起算，所以每年一到 8 月，本學年就會變成一個還沒有資料的年份。
// 預設值若直接寫成 getCurrentAcademicYear()，那段期間打開這頁會是一片空白，
// 而且沒有任何錯誤訊息——最難發現的那種壞法。
//
// 這裡固定 getCurrentAcademicYear 的回傳值來模擬各個時間點，不依賴真實日期，
// 否則這幾條測試會在每年 8 月自己變紅。

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// 名單改用固定的假資料：真實 mockData 換屆時這些測試不該跟著壞。
// 112 刻意留空，用來驗「該學年已建立但名單還沒填」的情況。
jest.mock('../../../main/resources/data/mockData', () => ({
    aboutSummary: { description: '' },
    staffByYear: {
        112: [],
        113: [
            { id: 1, name: '甲會長', position: '會長', avatar: '/images/members/113/a.jpg' },
            { id: 2, name: '甲部長', position: '學術部長', avatar: '/images/members/113/b.jpg' },
        ],
        114: [
            { id: 3, name: '乙會長', position: '會長', avatar: '/images/members/114/c.jpg' },
            { id: 4, name: '乙部長', position: '資訊部長', avatar: '/images/members/114/d.jpg' },
        ],
    },
}));

jest.mock('../../../main/js/utils/dateUtils', () => ({
    getCurrentAcademicYear: jest.fn(),
}));

import i18n from '../../../main/js/i18n';
import { getCurrentAcademicYear } from '../../../main/js/utils/dateUtils';
import AboutUsPage from '../../../main/js/pages/AboutUsPage';

const yearButton = (year) =>
    screen.getByRole('button', { name: i18n.t('about.yearOption', { year }) });

describe('幹部區塊的學年切換', () => {
    test('本學年有名單時，預設就是本學年', () => {
        getCurrentAcademicYear.mockReturnValue(114);
        render(<AboutUsPage />);

        expect(screen.getByText('乙會長')).toBeInTheDocument();
        expect(screen.queryByText('甲會長')).not.toBeInTheDocument();
    });

    test('本學年還沒公佈名單時，退到最新有資料的學年（8 月換屆的空窗期）', () => {
        // 115 根本不在 staffByYear 裡——每年 8 月剛跨學年時就是這個狀態
        getCurrentAcademicYear.mockReturnValue(115);
        render(<AboutUsPage />);

        // 不是空白，而是落在 114
        expect(screen.getByText('乙會長')).toBeInTheDocument();
        expect(screen.getByText('乙部長')).toBeInTheDocument();
    });

    test('可以切到其他學年', () => {
        getCurrentAcademicYear.mockReturnValue(114);
        render(<AboutUsPage />);

        fireEvent.click(yearButton(113));

        expect(screen.getByText('甲會長')).toBeInTheDocument();
        expect(screen.queryByText('乙會長')).not.toBeInTheDocument();
    });

    test('學年存在但名單是空的，顯示尚未公佈而不是兩塊空版面', () => {
        getCurrentAcademicYear.mockReturnValue(112);
        render(<AboutUsPage />);

        expect(
            screen.getByText(i18n.t('about.noStaffForYear', { year: 112 }))
        ).toBeInTheDocument();
        // 「核心幹部」「各部部長」的標題不該出現
        expect(screen.queryByText(i18n.t('about.coreStaff'))).not.toBeInTheDocument();
        expect(screen.queryByText(i18n.t('about.directors'))).not.toBeInTheDocument();
    });

    test('學年按鈕依降冪排列，最新的在最前面', () => {
        getCurrentAcademicYear.mockReturnValue(114);
        render(<AboutUsPage />);

        [114, 113, 112].forEach((year) => {
            expect(yearButton(year)).toBeInTheDocument();
        });
    });

    test('再次點擊已選取的學年不會變成沒有選取', () => {
        // ToggleButtonGroup 在點已選取的按鈕時會送出 null，沒擋掉的話畫面會整個空掉
        getCurrentAcademicYear.mockReturnValue(114);
        render(<AboutUsPage />);

        fireEvent.click(yearButton(114));

        expect(screen.getByText('乙會長')).toBeInTheDocument();
    });
});
