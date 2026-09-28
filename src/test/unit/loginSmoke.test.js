// 登入頁的冒煙測試。
//
// 目的不是測登入邏輯，而是抓「模組載入期就爆掉」的問題——循環相依、
// i18n 還沒初始化就被用、export 改名後有人沒跟上之類的。
// 這種錯誤在瀏覽器只會表現成一片白或一句籠統的失敗訊息，從後端完全看不出來。

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// axios 是 ESM，CRA 的 jest 不轉譯 node_modules
jest.mock('axios', () => {
    const instance = {
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
        post: jest.fn(),
        get: jest.fn(),
    };
    return { __esModule: true, default: { create: () => instance }, __instance: instance };
});

import { AuthProvider } from '../../main/js/contexts/AuthContext';
import LoginPage from '../../main/js/pages/LoginPage';

const instance = require('axios').__instance;

const renderLogin = () =>
    render(
        <MemoryRouter>
            <AuthProvider>
                <LoginPage />
            </AuthProvider>
        </MemoryRouter>,
    );

describe('登入頁冒煙測試', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        instance.get.mockResolvedValue({ data: {} });
    });

    test('模組載入與初次渲染不拋錯', () => {
        expect(() => renderLogin()).not.toThrow();
    });

    test('表單欄位與按鈕都渲染得出來（i18n key 有查到）', async () => {
        renderLogin();
        // 查不到 key 時 i18next 會回 key 本身，畫面就會出現 'auth.password' 這種字串。
        // 兩個命名空間分開等，失敗時才看得出是哪一個沒查到
        await waitFor(() => expect(screen.queryByText(/^auth\./)).not.toBeInTheDocument());
        await waitFor(() => expect(screen.queryByText(/^nav\./)).not.toBeInTheDocument());
        expect(screen.getByRole('button', { name: /log in|登入/i })).toBeInTheDocument();
    });

    // 忘記密碼的入口是使用者的救援路徑。這一行被默默拿掉的話，
    // 忘記密碼的人在登入頁上會完全沒有出路，而畫面看起來一切正常。
    // （收不到信時的人工聯絡方式在 /forgot-password 那一頁，見 ForgotPasswordPage.test.js）
    test('登入頁有連到忘記密碼流程的入口', async () => {
        renderLogin();

        const link = await screen.findByRole('link', { name: /忘記密碼|forgot your password/i });
        expect(link).toHaveAttribute('href', '/forgot-password');
    });

    test('從重設密碼頁回來時提示用新密碼登入', async () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/login', state: { passwordReset: true } }]}>
                <AuthProvider>
                    <LoginPage />
                </AuthProvider>
            </MemoryRouter>,
        );

        expect(
            await screen.findByText(/密碼已更新|password has been updated/i),
        ).toBeInTheDocument();
    });

    test('送出表單會真的呼叫 /auth/login', async () => {
        instance.post.mockResolvedValue({ data: { token: 'tok', user: { id: 1, username: 'a' } } });
        renderLogin();

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'admin' } });
        fireEvent.click(screen.getByRole('button', { name: /log in|登入/i }));

        await waitFor(() => {
            expect(instance.post).toHaveBeenCalledWith(
                '/auth/login',
                expect.objectContaining({ username: 'admin' }),
            );
        });
    });
});
