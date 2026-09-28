import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'zh-TW' } }),
}));

// service 要給明確 factory：自動 mock 仍會載入真實模組，
// 而它經 api.js 拉進 axios（ESM，CRA 的 jest 不轉譯 node_modules）
jest.mock('../../../main/js/services/api', () => ({
    __esModule: true,
    API_BASE_URL: '/api',
    default: {},
}));
jest.mock('../../../main/js/utils', () => ({
    translateApiError: (err, fallback) => fallback || 'error',
}));
jest.mock('../../../main/js/services/roleService', () => ({
    __esModule: true,
    default: { setUserRoles: jest.fn().mockResolvedValue({}) },
}));

// 實作在測試裡設定：CRA 的 jest 設定 resetMocks: true，factory 裡的 mockResolvedValue
// 會在每個測試開始前被清掉
jest.mock('../../../main/js/services/userService', () => ({
    __esModule: true,
    default: { createPasswordResetLink: jest.fn() },
}));

import userService from '../../../main/js/services/userService';
import UserAdminPanel from '../../../main/js/components/admin/UserAdminPanel';

const ME = { id: 1, username: 'me', fullName: '我自己', roles: [], hasPaidFee: false };
const OTHER = {
    id: 2,
    username: 'other',
    fullName: '別人',
    roles: [{ id: 9, key: 'treasurer', name: '總務', color: '#7b1fa2', isAuto: false }],
    hasPaidFee: true,
};

beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [ME, OTHER] });
});

afterEach(() => {
    delete global.fetch;
});

const renderPanel = () =>
    render(
        <UserAdminPanel
            roles={[]}
            currentUser={{ id: ME.id }}
            onUpdateSelf={jest.fn()}
            onStartPreview={jest.fn()}
            onError={jest.fn()}
            onSuccess={jest.fn()}
        />,
    );

const rowOf = (name) =>
    screen.getAllByRole('row').find((row) => within(row).queryAllByText(name).length > 0);

// 原本 handleEdit 寫成 setEditingId(currentUser.id)：點別人的「編輯」，
// 進入編輯的是自己那一列、表單裝的卻是別人的資料，存檔就寫到自己身上。
test('點別人那一列的編輯，只有那一列進入編輯', async () => {
    renderPanel();
    await screen.findAllByText('別人');

    const myRow = rowOf('我自己');
    fireEvent.click(within(rowOf('別人')).getByTitle('common.edit'));

    // 編輯表單裝的是對方的資料，而且出現在對方那一列
    const editingRow = screen
        .getAllByRole('row')
        .find((row) => within(row).queryByDisplayValue('別人'));
    expect(within(editingRow).getByDisplayValue('other')).toBeInTheDocument();
    expect(editingRow).not.toBe(myRow);
    // 自己那一列維持唯讀
    expect(within(myRow).queryByRole('textbox')).not.toBeInTheDocument();
});

test('身分組用統一的 RoleChip 呈現', async () => {
    renderPanel();
    await screen.findAllByText('別人');

    const chip = within(rowOf('別人')).getByTestId('role-chip');
    expect(chip).toHaveTextContent('總務');
    expect(chip).toHaveClass('MuiChip-filled');
});

// 管理員備援：產生重設連結轉交給本人，管理員不必知道或傳送任何人的密碼
test('重設密碼對話框可以產生重設連結並顯示網址', async () => {
    userService.createPasswordResetLink.mockResolvedValue({
        url: 'https://ntu.im/reset-password#token=abc',
        expiresAt: '2026-09-29T12:00:00.000Z',
    });
    renderPanel();
    await screen.findAllByText('別人');

    fireEvent.click(within(rowOf('別人')).getByTitle('admin.users.resetPassword'));
    fireEvent.click(await screen.findByRole('button', { name: 'admin.users.resetLink.generate' }));

    expect(
        await screen.findByDisplayValue('https://ntu.im/reset-password#token=abc'),
    ).toBeInTheDocument();
    expect(userService.createPasswordResetLink).toHaveBeenCalledWith(OTHER.id);
});
