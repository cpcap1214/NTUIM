// 公告視窗的顯示條件。
//
// 這裡真正要守住的是「已關掉」的判斷取後端與 localStorage 的聯集。
// 少了任何一半都不會壞掉、也不會報錯——只會在某些情境下公告又跳出來一次，
// 而那種「偶爾才重現」的症狀從畫面上完全看不出原因。

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../main/js/services/announcementService', () => ({
    __esModule: true,
    default: { getActive: jest.fn(), dismiss: jest.fn() },
}));

jest.mock('../../../main/js/contexts/AuthContext', () => ({
    useAuth: jest.fn(),
}));

import announcementService from '../../../main/js/services/announcementService';
import { useAuth } from '../../../main/js/contexts/AuthContext';
import AnnouncementDialog from '../../../main/js/components/AnnouncementDialog';
import {
    addDismissedAnnouncements,
    getDismissedAnnouncements,
    clearDismissedAnnouncements,
} from '../../../main/js/services/announcementStorage';

const ANNOUNCEMENT_A = { id: 1, title: '系學會費繳交方式', body: '內文 A', level: 'important' };
const ANNOUNCEMENT_B = { id: 2, title: '新生座談會報名', body: '內文 B', level: 'info' };
const ANNOUNCEMENT_C = { id: 3, title: '網站改版', body: '內文 C', level: 'info' };

const renderDialog = (path = '/') =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <AnnouncementDialog />
        </MemoryRouter>
    );

const asGuest = () => useAuth.mockReturnValue({ user: null, loading: false });
const asUser = () => useAuth.mockReturnValue({ user: { id: 7 }, loading: false });

describe('公告視窗', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearDismissedAnnouncements();
        localStorage.clear();
    });

    test('沒有生效中的公告就不開啟', async () => {
        asGuest();
        announcementService.getActive.mockResolvedValue({ announcements: [], dismissedIds: [] });

        renderDialog();

        await waitFor(() => expect(announcementService.getActive).toHaveBeenCalled());
        expect(screen.queryByText(ANNOUNCEMENT_A.title)).not.toBeInTheDocument();
    });

    test('有未關閉的公告就開啟並列出全部', async () => {
        asGuest();
        announcementService.getActive.mockResolvedValue({
            announcements: [ANNOUNCEMENT_A, ANNOUNCEMENT_B],
            dismissedIds: [],
        });

        renderDialog();

        expect(await screen.findByText(ANNOUNCEMENT_A.title)).toBeInTheDocument();
        expect(screen.getByText(ANNOUNCEMENT_B.title)).toBeInTheDocument();
    });

    test('全部都被後端標記為已關就不開啟', async () => {
        asUser();
        announcementService.getActive.mockResolvedValue({
            announcements: [ANNOUNCEMENT_A, ANNOUNCEMENT_B],
            dismissedIds: [1, 2],
        });

        renderDialog();

        await waitFor(() => expect(announcementService.getActive).toHaveBeenCalled());
        expect(screen.queryByText(ANNOUNCEMENT_A.title)).not.toBeInTheDocument();
    });

    test('訪客關掉之後再登入，同一則不會再跳出（聯集邏輯）', async () => {
        // 訪客身分關掉 1 號 —— 只寫得進 localStorage，後端沒有這筆記錄
        addDismissedAnnouncements([ANNOUNCEMENT_A.id]);

        // 登入後後端回的 dismissedIds 是空的（那筆從來沒送上去過）
        asUser();
        announcementService.getActive.mockResolvedValue({
            announcements: [ANNOUNCEMENT_A],
            dismissedIds: [],
        });

        renderDialog();

        await waitFor(() => expect(announcementService.getActive).toHaveBeenCalled());
        // 只看後端的話這裡會又跳出來
        expect(screen.queryByText(ANNOUNCEMENT_A.title)).not.toBeInTheDocument();
    });

    test('已關兩則、新增第三則時只顯示新的那則', async () => {
        asUser();
        announcementService.getActive.mockResolvedValue({
            announcements: [ANNOUNCEMENT_A, ANNOUNCEMENT_B, ANNOUNCEMENT_C],
            dismissedIds: [1, 2],
        });

        renderDialog();

        expect(await screen.findByText(ANNOUNCEMENT_C.title)).toBeInTheDocument();
        expect(screen.queryByText(ANNOUNCEMENT_A.title)).not.toBeInTheDocument();
        expect(screen.queryByText(ANNOUNCEMENT_B.title)).not.toBeInTheDocument();
    });

    test('勾選後關閉：登入者同時寫入後端與本機', async () => {
        asUser();
        announcementService.getActive.mockResolvedValue({
            announcements: [ANNOUNCEMENT_A, ANNOUNCEMENT_B],
            dismissedIds: [],
        });
        announcementService.dismiss.mockResolvedValue({});

        renderDialog();
        await screen.findByText(ANNOUNCEMENT_A.title);

        // 只勾第一則
        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        fireEvent.click(screen.getByRole('button', { name: /關閉|close/i }));

        await waitFor(() => expect(announcementService.dismiss).toHaveBeenCalledWith(1));
        expect(announcementService.dismiss).toHaveBeenCalledTimes(1);
        expect(getDismissedAnnouncements()).toEqual([1]);
    });

    test('訪客關閉時不打後端，只寫本機', async () => {
        asGuest();
        announcementService.getActive.mockResolvedValue({
            announcements: [ANNOUNCEMENT_A],
            dismissedIds: [],
        });

        renderDialog();
        await screen.findByText(ANNOUNCEMENT_A.title);

        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        fireEvent.click(screen.getByRole('button', { name: /關閉|close/i }));

        await waitFor(() => expect(getDismissedAnnouncements()).toEqual([1]));
        expect(announcementService.dismiss).not.toHaveBeenCalled();
    });

    test('沒勾就關閉，下次還會再出現', async () => {
        asUser();
        announcementService.getActive.mockResolvedValue({
            announcements: [ANNOUNCEMENT_A],
            dismissedIds: [],
        });

        renderDialog();
        await screen.findByText(ANNOUNCEMENT_A.title);

        fireEvent.click(screen.getByRole('button', { name: /關閉|close/i }));

        await waitFor(() => expect(screen.queryByText(ANNOUNCEMENT_A.title)).not.toBeInTheDocument());
        expect(announcementService.dismiss).not.toHaveBeenCalled();
        expect(getDismissedAnnouncements()).toEqual([]);
    });

    test('登入頁不顯示，免得蓋住登入表單', async () => {
        asGuest();
        announcementService.getActive.mockResolvedValue({
            announcements: [ANNOUNCEMENT_A],
            dismissedIds: [],
        });

        renderDialog('/login');

        await waitFor(() => expect(announcementService.getActive).toHaveBeenCalled());
        expect(screen.queryByText(ANNOUNCEMENT_A.title)).not.toBeInTheDocument();
    });

    test('認證還在載入時不抓公告（否則會拿到訪客版的已關清單）', () => {
        useAuth.mockReturnValue({ user: null, loading: true });

        renderDialog();

        expect(announcementService.getActive).not.toHaveBeenCalled();
    });
});
