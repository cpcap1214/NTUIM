const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const {
    User,
    Exam,
    CheatSheet,
    CourseReview,
    Role,
    UserRole,
    RolePermission,
    SENSITIVE_USER_FIELDS,
    toSafeUser,
} = require('../models');
const { WILDCARD } = require('../config/permissions');
const { requirePermission, requireOwnerOrAdmin } = require('../middleware/auth');
const permissionService = require('../services/permissionService');

// 取得使用者列表（管理員）
router.get(
    '/',
    requirePermission('users.manage'),
    [
        query('hasPaidFee').optional().isBoolean(),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { hasPaidFee, page = 1, limit = 20 } = req.query;

            // 建立查詢條件。原本還能依舊的 role 欄位篩選，但那個欄位已不隨身分組更新，
            // 篩出來的結果和實際權限對不起來，已移除。
            const where = {};
            if (hasPaidFee !== undefined) where.hasPaidFee = hasPaidFee === 'true';

            // 查詢使用者
            const { count, rows } = await User.findAndCountAll({
                where,
                attributes: { exclude: SENSITIVE_USER_FIELDS },
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
            });

            res.json({
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    pages: Math.ceil(count / limit),
                },
            });
        } catch (error) {
            console.error('取得使用者列表錯誤:', error);
            res.status(500).json({
                error: '取得使用者列表失敗',
                errorCode: 'FETCH_USER_LIST_FAILED',
            });
        }
    },
);

// 取得個人資料
router.get('/profile', async (req, res) => {
    try {
        // 身分組預覽的是一個假想使用者，沒有 id，查資料庫必然落空。
        // 不特別處理的話這裡會回 404，而前端 AuthContext 收到 404 會清掉登入資料——
        // 按下「以身分組檢視」的結果會變成把自己登出。
        if (req.preview?.kind === 'role') {
            const modules = await permissionService.listModulesFor(req.user, req.permissions);
            return res.json({
                id: null,
                username: req.user.username,
                email: null,
                fullName: req.user.username,
                studentId: null,
                hasPaidFee: req.user.hasPaidFee,
                roles: req.user.roles || [],
                permissions: req.user.permissions || [],
                isAdmin: !!req.permissions?.isAdmin,
                modules,
                stats: { uploadedExams: 0, uploadedCheatSheets: 0, reviews: 0 },
            });
        }

        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: SENSITIVE_USER_FIELDS },
        });

        if (!user) {
            return res.status(404).json({ error: '使用者不存在', errorCode: 'USER_NOT_FOUND' });
        }

        // 統計使用者貢獻
        const stats = await Promise.all([
            Exam.count({ where: { uploadedBy: req.user.id } }),
            CheatSheet.count({ where: { uploadedBy: req.user.id } }),
            CourseReview.count({ where: { userId: req.user.id } }),
        ]);

        // 前端的權限判斷一律以後端解析結果為準，不再自己從 role 推導。
        // authenticateToken 已經解析好掛在 req.user 上，這裡直接帶出去。
        const modules = await permissionService.listModulesFor(req.user, req.permissions);

        res.json({
            ...user.toJSON(),
            hasPaidFee: req.user.hasPaidFee,
            roles: req.user.roles || [],
            permissions: req.user.permissions || [],
            // 管理員判斷的權威來源。前端不可再自己從 role 欄位推導——
            // 那個欄位不會隨身分組更新，新指派的管理員在前端會不被當成管理員。
            // 展開後的 permissions 也判斷不出來：expandPermissions 遇到 '*' 會回傳
            // 所有權限 key，但不含 '*' 本身。
            isAdmin: !!req.permissions?.isAdmin,
            modules,
            stats: {
                uploadedExams: stats[0],
                uploadedCheatSheets: stats[1],
                reviews: stats[2],
            },
        });
    } catch (error) {
        console.error('取得個人資料錯誤:', error);
        res.status(500).json({ error: '取得個人資料失敗', errorCode: 'FETCH_PROFILE_FAILED' });
    }
});

// 取得指定使用者資料（管理員或本人）
router.get('/:id', requireOwnerOrAdmin('id'), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: SENSITIVE_USER_FIELDS },
        });

        if (!user) {
            return res.status(404).json({ error: '使用者不存在', errorCode: 'USER_NOT_FOUND' });
        }

        res.json(user);
    } catch (error) {
        console.error('取得使用者資料錯誤:', error);
        res.status(500).json({ error: '取得使用者資料失敗', errorCode: 'FETCH_USER_FAILED' });
    }
});

// 更新個人資料
router.put(
    '/profile',
    [body('fullName').optional().notEmpty(), body('email').optional().isEmail()],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findByPk(req.user.id);

            if (!user) {
                return res.status(404).json({ error: '使用者不存在', errorCode: 'USER_NOT_FOUND' });
            }

            // 檢查 email 是否已被使用
            if (req.body.email && req.body.email !== user.email) {
                const existingUser = await User.findOne({
                    where: { email: req.body.email },
                });

                if (existingUser) {
                    return res
                        .status(400)
                        .json({ error: '此電子郵件已被使用', errorCode: 'EMAIL_TAKEN' });
                }
            }

            // 更新資料
            const updates = {};
            const allowedFields = ['fullName', 'email'];

            allowedFields.forEach((field) => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            await user.update(updates);

            res.json({
                message: '個人資料更新成功',
                data: toSafeUser(user),
            });
        } catch (error) {
            console.error('更新個人資料錯誤:', error);
            res.status(500).json({ error: '更新個人資料失敗', errorCode: 'UPDATE_PROFILE_FAILED' });
        }
    },
);

// 更新使用者會費狀態（管理員）
router.patch(
    '/:id/fee-status',
    requirePermission('users.manage'),
    [
        body('hasPaidFee')
            .isBoolean()
            .withMessage({ code: 'FEE_STATUS_INVALID', message: '請提供有效的繳費狀態' }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findByPk(req.params.id);

            if (!user) {
                return res.status(404).json({ error: '使用者不存在', errorCode: 'USER_NOT_FOUND' });
            }

            user.hasPaidFee = req.body.hasPaidFee;
            await user.save();

            res.json({
                message: '會費狀態更新成功',
                data: {
                    id: user.id,
                    username: user.username,
                    hasPaidFee: user.hasPaidFee,
                },
            });
        } catch (error) {
            console.error('更新會費狀態錯誤:', error);
            res.status(500).json({
                error: '更新會費狀態失敗',
                errorCode: 'UPDATE_FEE_STATUS_FAILED',
            });
        }
    },
);

// 原本這裡有 PATCH /:id/role，寫的是舊的 users.role 欄位。那個欄位已沒有任何授權作用，
// 前端也沒有呼叫端；留著只會讓人以為「改這裡就能給管理員」。身分組請用 PUT /:id/roles。

// 設定使用者的身分組（管理員）。一次帶入完整清單，前端用多選框操作。
router.put(
    '/:id/roles',
    requirePermission('users.manage'),
    [
        body('roleIds')
            .isArray()
            .withMessage({ code: 'ROLE_LIST_REQUIRED', message: '請提供身分組清單' }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findByPk(req.params.id);
            if (!user)
                return res.status(404).json({ error: '使用者不存在', errorCode: 'USER_NOT_FOUND' });

            const requested = await Role.findAll({ where: { id: req.body.roleIds } });

            // 自動身分組（會員）的成員資格由繳費狀態推導，不可手動指派。
            // 若允許手動加，它會在下一次繳費狀態變動時無聲消失——一張無法重現的客訴單。
            const autoRole = requested.find((r) => r.isAuto);
            if (autoRole) {
                return res.status(400).json({
                    error: `「${autoRole.name}」是自動身分組，依繳費狀態自動授予，不可手動指派`,
                    errorCode: 'AUTO_ROLE_NOT_ASSIGNABLE',
                    params: { name: autoRole.name },
                });
            }

            // 不可移除最後一位管理員（持有任一帶 '*' 的身分組者，不只 key='admin'）
            const willBeSuperuser = requested.length
                ? (await RolePermission.count({
                      where: { roleId: requested.map((r) => r.id), permission: WILDCARD },
                  })) > 0
                : false;
            if (
                !willBeSuperuser &&
                (await permissionService.isSuperuser(user.id)) &&
                (await permissionService.countSuperusers({ exceptUserId: user.id })) === 0
            ) {
                return res.status(400).json({
                    error: '無法移除最後一個管理員',
                    errorCode: 'CANNOT_REMOVE_LAST_ADMIN',
                });
            }

            await UserRole.destroy({ where: { userId: user.id } });
            for (const role of requested.filter((r) => !r.isAuto)) {
                await UserRole.create({ userId: user.id, roleId: role.id, grantedBy: req.user.id });
            }

            res.json({ message: '身分組已更新' });
        } catch (error) {
            console.error('更新使用者身分組錯誤:', error);
            res.status(500).json({ error: '更新身分組失敗', errorCode: 'UPDATE_ROLE_FAILED' });
        }
    },
);

// 刪除使用者（管理員）
router.delete('/:id', requirePermission('users.manage'), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: '使用者不存在', errorCode: 'USER_NOT_FOUND' });
        }

        // 防止刪除最後一個管理員
        if (
            (await permissionService.isSuperuser(user.id)) &&
            (await permissionService.countSuperusers({ exceptUserId: user.id })) === 0
        ) {
            return res.status(400).json({
                error: '無法刪除最後一個管理員',
                errorCode: 'CANNOT_DELETE_LAST_ADMIN',
            });
        }

        // 防止刪除自己
        if (user.id === req.user.id) {
            return res
                .status(400)
                .json({ error: '無法刪除自己的帳號', errorCode: 'CANNOT_DELETE_SELF' });
        }

        await user.destroy();

        res.json({ message: '使用者已刪除' });
    } catch (error) {
        console.error('刪除使用者錯誤:', error);
        res.status(500).json({ error: '刪除使用者失敗', errorCode: 'DELETE_USER_FAILED' });
    }
});

// 取得使用者貢獻統計
router.get('/:id/contributions', async (req, res) => {
    try {
        const userId = req.params.id;

        // 取得上傳的考古題
        const exams = await Exam.findAll({
            where: { uploadedBy: userId },
            attributes: [
                'id',
                'courseCode',
                'courseName',
                'examType',
                'year',
                'semester',
                'created_at',
            ],
            order: [['created_at', 'DESC']],
            limit: 10,
        });

        // 取得上傳的大抄
        const cheatSheets = await CheatSheet.findAll({
            where: { uploadedBy: userId },
            attributes: ['id', 'courseCode', 'courseName', 'title', 'created_at'],
            order: [['created_at', 'DESC']],
            limit: 10,
        });

        // 取得課程評價
        const reviews = await CourseReview.findAll({
            where: { userId: userId },
            attributes: [
                'id',
                'courseCode',
                'courseName',
                'professor',
                'quality',
                'difficulty',
                'sweetness',
                'usefulness',
                'created_at',
            ],
            order: [['created_at', 'DESC']],
            limit: 10,
        });

        res.json({
            exams,
            cheatSheets,
            reviews,
            totals: {
                exams: await Exam.count({ where: { uploadedBy: userId } }),
                cheatSheets: await CheatSheet.count({ where: { uploadedBy: userId } }),
                reviews: await CourseReview.count({ where: { userId: userId } }),
            },
        });
    } catch (error) {
        console.error('取得使用者貢獻錯誤:', error);
        res.status(500).json({
            error: '取得貢獻統計失敗',
            errorCode: 'FETCH_CONTRIBUTIONS_FAILED',
        });
    }
});

module.exports = router;
