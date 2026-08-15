const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Module, ModuleAccess, Role, User } = require('../models');
const { optionalAuth, authenticateToken, requirePermission } = require('../middleware/auth');
const permissionService = require('../services/permissionService');

// 取得目前使用者可用的模組清單（公開端點，未登入也能呼叫）。
//
// 為什麼必須公開：/api/users/profile 需要認證，登出的訪客沒有任何管道知道
// 哪些模組該顯示在導覽列。少了這支，匿名訪客的導覽列不是全空就是先閃出完整選單再縮回去。
//
// 回傳每個模組的 accessible / comingSoon / visible，前端據此決定
// 顯示、標示「即將推出」、或整個隱藏。
router.get('/', optionalAuth, async (req, res) => {
    try {
        const modules = await permissionService.listModulesFor(req.user, req.permissions);
        res.json({ data: modules });
    } catch (error) {
        console.error('取得模組清單錯誤:', error);
        res.status(500).json({ error: '取得模組清單失敗', errorCode: 'FETCH_MODULES_FAILED' });
    }
});

// ---------------------------------------------------------------------------
// 以下為管理端點（需 modules.manage 權限）
// ---------------------------------------------------------------------------

// 模組完整設定（含白名單），給模組管理介面用
router.get('/admin', authenticateToken, requirePermission('modules.manage'), async (req, res) => {
    try {
        const modules = await Module.findAll({ order: [['id', 'ASC']] });

        const result = [];
        for (const module of modules) {
            const rules = await ModuleAccess.findAll({
                where: { moduleId: module.id },
                include: [
                    { model: Role, as: 'role', attributes: ['id', 'key', 'name', 'color'] },
                    { model: User, as: 'user', attributes: ['id', 'username', 'fullName'] }
                ]
            });

            result.push({
                ...module.toJSON(),
                allowedRoles: rules.filter((r) => r.roleId).map((r) => r.role).filter(Boolean),
                allowedUsers: rules.filter((r) => r.userId).map((r) => r.user).filter(Boolean)
            });
        }

        res.json({ data: result });
    } catch (error) {
        console.error('取得模組設定錯誤:', error);
        res.status(500).json({ error: '取得模組設定失敗', errorCode: 'FETCH_MODULE_SETTINGS_FAILED' });
    }
});

// 更新模組開放設定
router.put('/:key', authenticateToken, requirePermission('modules.manage'), [
    body('visibility').optional().isIn(['public', 'restricted']),
    body('showWhenRestricted').optional().isBoolean(),
    body('roleIds').optional().isArray(),
    body('userIds').optional().isArray()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const module = await Module.findOne({ where: { key: req.params.key } });
        if (!module) return res.status(404).json({ error: '模組不存在', errorCode: 'MODULE_NOT_FOUND' });

        const { visibility, showWhenRestricted, roleIds, userIds } = req.body;

        const updates = {};
        if (visibility !== undefined) updates.visibility = visibility;
        if (showWhenRestricted !== undefined) updates.showWhenRestricted = !!showWhenRestricted;
        await module.update(updates);

        // 白名單一次整批覆蓋。注意 visibility='public' 時白名單一律被忽略，
        // 但仍然保留下來——這樣暫時開放全站再改回限定時，設定不會消失。
        if (Array.isArray(roleIds) || Array.isArray(userIds)) {
            await ModuleAccess.destroy({ where: { moduleId: module.id } });
            for (const roleId of roleIds || []) {
                await ModuleAccess.create({ moduleId: module.id, roleId });
            }
            for (const userId of userIds || []) {
                await ModuleAccess.create({ moduleId: module.id, userId });
            }
        }

        res.json({ message: '模組設定已更新', data: module });
    } catch (error) {
        console.error('更新模組設定錯誤:', error);
        res.status(500).json({ error: '更新模組設定失敗', errorCode: 'UPDATE_MODULE_SETTINGS_FAILED' });
    }
});

module.exports = router;
