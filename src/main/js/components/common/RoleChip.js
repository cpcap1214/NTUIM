import React from 'react';
import { useTranslation } from 'react-i18next';
import { Chip, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// 身分組的唯一呈現方式。
//
// 原本在用戶管理（列表、詳情、多選框）、身分組管理、模組管理各寫一份，
// 有的上色、有的不上色，上色的文字又一律寫死白色——淺色的身分組（黃、淺綠）
// 會變成白底白字。文字色改由主題依背景計算對比。
//
// role：{ name, color, isAuto }（後端 permissionService.toRoleDTO 的形狀）
const RoleChip = ({ role, size = 'small', sx = {}, ...chipProps }) => {
    const { t } = useTranslation();
    const theme = useTheme();

    const colorSx = role.color
        ? { bgcolor: role.color, color: theme.palette.getContrastText(role.color) }
        : {};

    const chip = (
        <Chip
            label={role.name}
            size={size}
            variant={role.color ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, ...colorSx, ...sx }}
            data-testid="role-chip"
            {...chipProps}
        />
    );

    // 自動身分組（會員）不能手動指派或拿掉，hover 時說明原因
    if (!role.isAuto) return chip;
    return (
        <Tooltip title={t('admin.roles.memberAutoHint')}>
            <span>{chip}</span>
        </Tooltip>
    );
};

export default RoleChip;
