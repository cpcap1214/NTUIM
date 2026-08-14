const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { sequelize, Role, RolePermission, UserRole, User } = require('../models');
const { requirePermission } = require('../middleware/auth');
const { PERMISSIONS, PERMISSION_KEYS, WILDCARD } = require('../config/permissions');

// 權限目錄（供身分組編輯器渲染勾選清單）
router.get('/permissions', requirePermission('roles.manage'), (req, res) => {
    res.json({ data: PERMISSIONS });
});

// 身分組列表（含權限與成員數）
router.get('/', requirePermission('roles.manage'), async (req, res) => {
    try {
        const roles = await Role.findAll({ order: [['priority', 'DESC'], ['id', 'ASC']] });

        const result = [];
        for (const role of roles) {
            const perms = await RolePermission.findAll({ where: { roleId: role.id } });

            // 自動身分組（會員）的成員資格不存在 user_roles，必須改查 has_paid_fee，
            // 否則介面上會顯示 0 人，看起來像壞掉
            const memberCount = role.isAuto
                ? await User.count({ where: { hasPaidFee: true } })
                : await UserRole.count({ where: { roleId: role.id } });

            result.push({
                ...role.toJSON(),
                permissions: perms.map((p) => p.permission),
                memberCount
            });
        }

        res.json({ data: result });
    } catch (error) {
        console.error('取得身分組錯誤:', error);
        res.status(500).json({ error: '取得身分組失敗', errorCode: 'FETCH_ROLES_FAILED' });
    }
});

// 新增身分組
router.post('/', requirePermission('roles.manage'), [
    body('key').trim().matches(/^[a-zA-Z][a-zA-Z0-9_]*$/).withMessage({ code: 'ROLE_KEY_FORMAT', message: '代碼只能用英數字與底線，且須以英文字母開頭' }),
    body('name').trim().notEmpty().withMessage({ code: 'NAME_REQUIRED', message: '名稱為必填' }),
    body('permissions').optional().isArray()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { key, name, description, color, priority = 0, permissions = [] } = req.body;

        const existing = await Role.findOne({ where: { key } });
        if (existing) {
            return res.status(400).json({ error: '此身分組代碼已存在', errorCode: 'ROLE_KEY_TAKEN' });
        }

        const role = await Role.create({ key, name, description, color, priority });
        await setPermissions(role.id, permissions);

        res.status(201).json({ message: '身分組已建立', data: role });
    } catch (error) {
        console.error('建立身分組錯誤:', error);
        res.status(500).json({ error: '建立身分組失敗', errorCode: 'CREATE_ROLE_FAILED' });
    }
});

// 更新身分組（名稱等基本資料 + 權限）
router.put('/:id', requirePermission('roles.manage'), async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) return res.status(404).json({ error: '身分組不存在', errorCode: 'ROLE_NOT_FOUND' });

        const { name, description, color, priority, permissions } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (color !== undefined) updates.color = color;
        if (priority !== undefined) updates.priority = priority;
        // key 與 is_system/is_auto 一律不可改：內建身分組的語意寫死在程式碼裡
        // （例如解析權限時是用 key='member' 找自動身分組），改了會直接壞掉
        await role.update(updates);

        if (Array.isArray(permissions)) {
            // 管理員身分組的萬用權限不可拿掉，否則會把自己鎖在門外
            if (role.key === 'admin' && !permissions.includes(WILDCARD)) {
                return res.status(400).json({ error: '管理員身分組必須保留所有權限', errorCode: 'ADMIN_ROLE_KEEPS_ALL' });
            }
            await setPermissions(role.id, permissions);
        }

        res.json({ message: '身分組已更新', data: role });
    } catch (error) {
        console.error('更新身分組錯誤:', error);
        res.status(500).json({ error: '更新身分組失敗', errorCode: 'UPDATE_ROLE_FAILED' });
    }
});

// 刪除身分組
router.delete('/:id', requirePermission('roles.manage'), async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) return res.status(404).json({ error: '身分組不存在', errorCode: 'ROLE_NOT_FOUND' });

        if (role.isSystem) {
            return res.status(400).json({ error: '內建身分組不可刪除', errorCode: 'BUILTIN_ROLE_NOT_DELETABLE' });
        }

        await role.destroy(); // role_permissions / user_roles 會被 ON DELETE CASCADE 一併清掉
        res.json({ message: '身分組已刪除' });
    } catch (error) {
        console.error('刪除身分組錯誤:', error);
        res.status(500).json({ error: '刪除身分組失敗', errorCode: 'DELETE_ROLE_FAILED' });
    }
});

// 身分組成員
router.get('/:id/members', requirePermission('roles.manage'), async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) return res.status(404).json({ error: '身分組不存在', errorCode: 'ROLE_NOT_FOUND' });

        // 自動身分組的成員來自 has_paid_fee，不是 user_roles
        const users = role.isAuto
            ? await User.findAll({
                where: { hasPaidFee: true },
                attributes: ['id', 'username', 'fullName', 'studentId'],
                order: [['id', 'ASC']]
            })
            : await sequelize.query(
                `SELECT u.id, u.username, u.full_name AS fullName, u.student_id AS studentId
                 FROM user_roles ur JOIN users u ON u.id = ur.user_id
                 WHERE ur.role_id = ? ORDER BY u.id`,
                { replacements: [role.id], type: sequelize.QueryTypes.SELECT }
            );

        res.json({ data: users, isAuto: role.isAuto });
    } catch (error) {
        console.error('取得身分組成員錯誤:', error);
        res.status(500).json({ error: '取得成員失敗', errorCode: 'FETCH_MEMBERS_FAILED' });
    }
});

const setPermissions = async (roleId, permissions) => {
    await RolePermission.destroy({ where: { roleId } });
    // 只寫入程式碼裡真實存在的權限，外加萬用字元；
    // 未知的 key 直接忽略，不讓前端亂傳的字串長期殘留在資料庫
    const valid = permissions.filter(
        (p) => p === WILDCARD || p.endsWith('.*') || PERMISSION_KEYS.includes(p)
    );
    for (const permission of valid) {
        await RolePermission.create({ roleId, permission });
    }
};

module.exports = router;
