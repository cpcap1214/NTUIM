// 意見回饋對話框。
//
// 重點不在表單本身，而在幾個「壞掉也不會報錯」的地方：
//   - 未登入時仍然顯示送出鈕（後端會 401，但使用者只會看到莫名其妙的錯誤）
//   - 字數不足就能按送出（同上，白跑一趟）
//   - 送出成功後沒有清空，使用者以為沒送出去而重複送

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../main/js/services/feedbackService', () => ({
    __esModule: true,
    default: { submit: jest.fn() },
}));

jest.mock('../../../main/js/contexts/AuthContext', () => ({
    useAuth: jest.fn(),
}));

import feedbackService from '../../../main/js/services/feedbackService';
import { useAuth } from '../../../main/js/contexts/AuthContext';
import i18n from '../../../main/js/i18n';
import FeedbackDialog from '../../../main/js/components/FeedbackDialog';

const renderDialog = () =>
    render(
        <MemoryRouter>
            <FeedbackDialog open onClose={jest.fn()} />
        </MemoryRouter>
    );

const asGuest = () => useAuth.mockReturnValue({ isAuthenticated: false });
const asUser = () => useAuth.mockReturnValue({ isAuthenticated: true });

const submitButton = () => screen.queryByRole('button', { name: i18n.t('feedback.submit') });
const bodyField = () => screen.getByLabelText(new RegExp(i18n.t('feedback.body')));

describe('意見回饋對話框', () => {
    beforeEach(() => jest.clearAllMocks());

    test('未登入時不顯示表單，改為提示登入', () => {
        asGuest();
        renderDialog();

        expect(screen.getByText(i18n.t('feedback.loginRequired'))).toBeInTheDocument();
        expect(submitButton()).not.toBeInTheDocument();
    });

    test('登入後顯示匿名說明', () => {
        asUser();
        renderDialog();

        expect(screen.getByText(i18n.t('feedback.anonymityNotice'))).toBeInTheDocument();
    });

    test('字數不足時送出鈕是停用的', () => {
        asUser();
        renderDialog();

        expect(submitButton()).toBeDisabled();

        fireEvent.change(bodyField(), { target: { value: '太短' } });
        expect(submitButton()).toBeDisabled();

        fireEvent.change(bodyField(), { target: { value: '這是一段夠長的回饋內容，超過十個字。' } });
        expect(submitButton()).toBeEnabled();
    });

    test('送出會帶上內容與分類', async () => {
        asUser();
        feedbackService.submit.mockResolvedValue({ message: 'ok' });
        renderDialog();

        fireEvent.change(bodyField(), { target: { value: '這是一段夠長的回饋內容，超過十個字。' } });
        fireEvent.click(submitButton());

        await waitFor(() =>
            expect(feedbackService.submit).toHaveBeenCalledWith({
                body: '這是一段夠長的回饋內容，超過十個字。',
                category: 'suggestion',
            })
        );
    });

    test('送出成功後顯示已收到，並且不再顯示表單', async () => {
        asUser();
        feedbackService.submit.mockResolvedValue({ message: 'ok' });
        renderDialog();

        fireEvent.change(bodyField(), { target: { value: '這是一段夠長的回饋內容，超過十個字。' } });
        fireEvent.click(submitButton());

        expect(await screen.findByText(i18n.t('feedback.sent'))).toBeInTheDocument();
        // 表單收起來，避免使用者以為沒送出而重複送
        expect(submitButton()).not.toBeInTheDocument();
    });

    test('送出成功的畫面不出現任何編號或回覆承諾', async () => {
        // 顯示 id 或「我們會回覆你」都會暗示送出者可被追溯，與匿名的前提矛盾
        asUser();
        feedbackService.submit.mockResolvedValue({ message: 'ok' });
        renderDialog();

        fireEvent.change(bodyField(), { target: { value: '這是一段夠長的回饋內容，超過十個字。' } });
        fireEvent.click(submitButton());
        await screen.findByText(i18n.t('feedback.sent'));

        expect(screen.queryByText(/#\d+/)).not.toBeInTheDocument();
        expect(screen.queryByText(/編號|ticket|回覆您|reply to you/i)).not.toBeInTheDocument();
    });

    test('被限流時顯示還要等幾分鐘，且表單內容保留', async () => {
        asUser();
        // 後端在 429 時會帶 params.minutes（middleware/rateLimits.js 的 handler）。
        // 「請稍後再試」在額度是一小時的情況下等於沒說，使用者無從判斷該等多久。
        feedbackService.submit.mockRejectedValue({
            errorCode: 'FEEDBACK_RATE_LIMITED',
            params: { minutes: 46 },
        });
        renderDialog();

        const text = '這是一段夠長的回饋內容，超過十個字。';
        fireEvent.change(bodyField(), { target: { value: text } });
        fireEvent.click(submitButton());

        const shown = await screen.findByText(/46/);
        expect(shown).toBeInTheDocument();
        // 失敗時內容不能被清掉，否則使用者要重打一遍
        expect(bodyField()).toHaveValue(text);
    });
});
