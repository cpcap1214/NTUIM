import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import '@testing-library/jest-dom';
import theme from '../../../main/js/theme';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

import RoleChip from '../../../main/js/components/common/RoleChip';

const renderChip = (role) =>
    render(
        <ThemeProvider theme={theme}>
            <RoleChip role={role} />
        </ThemeProvider>,
    );

// jsdom 的 computed style 會把顏色正規化成 rgb()
const rgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

// RoleChip 帶有 data-testid="role-chip"，直接取得 chip 的根節點（樣式掛在那裡）
const chipOf = (name) =>
    screen.getAllByTestId('role-chip').find((chip) => within(chip).queryByText(name));

describe('RoleChip', () => {
    test('有顏色的身分組：底色用身分組顏色，文字色依對比計算', () => {
        renderChip({ id: 1, name: '管理員', color: '#d32f2f' });
        const chip = chipOf('管理員');

        expect(chip).toHaveClass('MuiChip-filled');
        expect(chip).toHaveStyle({ backgroundColor: rgb('#d32f2f') });
        expect(chip).toHaveStyle({ color: rgb('#ffffff') });
    });

    // 原本各處一律寫死白字，淺色身分組會變成白底白字
    test('淺色身分組用深色文字，不會白底白字', () => {
        renderChip({ id: 2, name: '測試員', color: '#ffeb3b' });
        const chip = chipOf('測試員');

        expect(chip).not.toHaveStyle({ color: rgb('#ffffff') });
    });

    test('沒有顏色的身分組用外框樣式', () => {
        renderChip({ id: 3, name: '自訂' });

        expect(chipOf('自訂')).toHaveClass('MuiChip-outlined');
    });

    test('自動身分組在 hover 時說明它不能手動指派', async () => {
        renderChip({ id: 4, name: '會員', color: '#1976d2', isAuto: true });

        fireEvent.mouseOver(screen.getByText('會員'));
        expect(await screen.findByText('admin.roles.memberAutoHint')).toBeInTheDocument();
    });
});
