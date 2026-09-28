// 忘記密碼（/forgot-password）與設定新密碼（/reset-password）兩頁。
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'zh-TW' } }),
}));
jest.mock('../../../main/js/utils/apiError', () => ({
    translateApiError: (err, fallback) => (err?.errorCode ? `errors.${err.errorCode}` : fallback),
}));
jest.mock('../../../main/js/services/authService', () => ({
    __esModule: true,
    default: {
        forgotPassword: jest.fn(),
        verifyResetToken: jest.fn(),
        resetPassword: jest.fn(),
    },
}));

import authService from '../../../main/js/services/authService';
import ForgotPasswordPage from '../../../main/js/pages/ForgotPasswordPage';
import ResetPasswordPage from '../../../main/js/pages/ResetPasswordPage';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ForgotPasswordPage', () => {
    const renderPage = () =>
        render(
            <MemoryRouter>
                <ForgotPasswordPage />
            </MemoryRouter>,
        );

    const submit = (identifier) => {
        fireEvent.change(screen.getByRole('textbox'), { target: { value: identifier } });
        fireEvent.click(screen.getByRole('button', { name: 'auth.forgot.submit' }));
    };

    // 後端對存在與不存在的帳號回應相同；前端也不能依結果顯示不同內容
    test('送出後顯示固定的「已寄出」訊息，不透露帳號是否存在', async () => {
        authService.forgotPassword.mockResolvedValue({ message: 'whatever' });
        renderPage();
        submit('  someone  ');

        expect(await screen.findByText('auth.forgot.sent')).toBeInTheDocument();
        expect(authService.forgotPassword).toHaveBeenCalledWith('someone');
    });

    test('申請太頻繁時顯示後端的等待訊息', async () => {
        authService.forgotPassword.mockRejectedValue({
            errorCode: 'PASSWORD_RESET_RATE_LIMITED',
            params: { minutes: 42 },
        });
        renderPage();
        submit('someone');

        expect(await screen.findByText('errors.PASSWORD_RESET_RATE_LIMITED')).toBeInTheDocument();
        expect(screen.queryByText('auth.forgot.sent')).not.toBeInTheDocument();
    });

    test('收不到信的人工聯絡方式一直都在', () => {
        renderPage();
        expect(screen.getByRole('link', { name: 'imsa@ntu.im' })).toHaveAttribute(
            'href',
            'mailto:imsa@ntu.im',
        );
    });
});

describe('ResetPasswordPage', () => {
    const renderAt = (hash) =>
        render(
            <MemoryRouter initialEntries={[{ pathname: '/reset-password', hash }]}>
                <Routes>
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/login" element={<div>LOGIN PAGE</div>} />
                </Routes>
            </MemoryRouter>,
        );

    const fill = (a, b) => {
        fireEvent.change(screen.getByLabelText(/auth.reset.newPassword/), { target: { value: a } });
        fireEvent.change(screen.getByLabelText(/auth.reset.confirmPassword/), {
            target: { value: b },
        });
        fireEvent.click(screen.getByRole('button', { name: 'auth.reset.submit' }));
    };

    test('從網址 # 後面讀出 token 並先檢查是否有效', async () => {
        authService.verifyResetToken.mockResolvedValue({ valid: true });
        renderAt('#token=abc123');

        await screen.findByLabelText(/auth.reset.newPassword/);
        expect(authService.verifyResetToken).toHaveBeenCalledWith('abc123');
    });

    test('網址沒有 token 時直接顯示無效，並提供重新申請', () => {
        renderAt('');

        expect(authService.verifyResetToken).not.toHaveBeenCalled();
        expect(screen.getByRole('link', { name: 'auth.reset.requestNew' })).toHaveAttribute(
            'href',
            '/forgot-password',
        );
    });

    test('連結過期時顯示原因與重新申請', async () => {
        authService.verifyResetToken.mockRejectedValue({ errorCode: 'RESET_TOKEN_EXPIRED' });
        renderAt('#token=old');

        expect(await screen.findByText('errors.RESET_TOKEN_EXPIRED')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'auth.reset.requestNew' })).toBeInTheDocument();
    });

    test('兩次密碼不一致時不送出', async () => {
        authService.verifyResetToken.mockResolvedValue({ valid: true });
        renderAt('#token=abc123');
        await screen.findByLabelText(/auth.reset.newPassword/);

        fill('newpass1', 'newpass2');

        expect(screen.getByText('auth.reset.mismatch')).toBeInTheDocument();
        expect(authService.resetPassword).not.toHaveBeenCalled();
    });

    test('密碼太短時不送出', async () => {
        authService.verifyResetToken.mockResolvedValue({ valid: true });
        renderAt('#token=abc123');
        await screen.findByLabelText(/auth.reset.newPassword/);

        fill('123', '123');

        expect(screen.getByText('errors.NEW_PASSWORD_TOO_SHORT')).toBeInTheDocument();
        expect(authService.resetPassword).not.toHaveBeenCalled();
    });

    test('成功後帶著提示回到登入頁', async () => {
        authService.verifyResetToken.mockResolvedValue({ valid: true });
        authService.resetPassword.mockResolvedValue({});
        renderAt('#token=abc123');
        await screen.findByLabelText(/auth.reset.newPassword/);

        fill('newpass1', 'newpass1');

        expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
        expect(authService.resetPassword).toHaveBeenCalledWith('abc123', 'newpass1');
    });

    test('填表途中連結被用掉了：切到無效畫面，而不是停在表單上', async () => {
        authService.verifyResetToken.mockResolvedValue({ valid: true });
        authService.resetPassword.mockRejectedValue({ errorCode: 'RESET_TOKEN_INVALID' });
        renderAt('#token=abc123');
        await screen.findByLabelText(/auth.reset.newPassword/);

        fill('newpass1', 'newpass1');

        expect(
            await screen.findByRole('link', { name: 'auth.reset.requestNew' }),
        ).toBeInTheDocument();
        expect(screen.queryByLabelText(/auth.reset.newPassword/)).not.toBeInTheDocument();
    });
});
