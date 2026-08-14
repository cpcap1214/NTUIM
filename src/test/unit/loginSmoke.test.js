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

import axios from 'axios';
import { AuthProvider } from '../../main/js/contexts/AuthContext';
import LoginPage from '../../main/js/pages/LoginPage';

const instance = require('axios').__instance;

const renderLogin = () =>
    render(
        <MemoryRouter>
            <AuthProvider>
                <LoginPage />
            </AuthProvider>
        </MemoryRouter>
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
        // 查不到 key 時 i18next 會回 key 本身，畫面就會出現 'auth.password' 這種字串
        await waitFor(() => {
            expect(screen.queryByText(/^auth\./)).not.toBeInTheDocument();
            expect(screen.queryByText(/^nav\./)).not.toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: /log in|登入/i })).toBeInTheDocument();
    });

    test('送出表單會真的呼叫 /auth/login', async () => {
        instance.post.mockResolvedValue({ data: { token: 'tok', user: { id: 1, username: 'a' } } });
        renderLogin();

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'admin' } });
        fireEvent.click(screen.getByRole('button', { name: /log in|登入/i }));

        await waitFor(() => {
            expect(instance.post).toHaveBeenCalledWith('/auth/login', expect.objectContaining({ username: 'admin' }));
        });
    });
});
