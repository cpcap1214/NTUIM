const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult, query } = require('express-validator');
const { User, Exam, CheatSheet, CourseReview } = require('../models');
const { requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// 取得使用者列表（管理員）
router.get('/', requireAdmin, [
    query('role').optional().isIn(['admin', 'member', 'user']),
    query('hasPaidFee').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const {
            role,
            hasPaidFee,
            page = 1,
            limit = 20
        } = req.query;

        // 建立查詢條件
        const where = {};
        if (role) where.role = role;
        if (hasPaidFee !== undefined) where.hasPaidFee = hasPaidFee === 'true';

        // 查詢使用者
        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: { exclude: ['passwordHash'] },
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('取得使用者列表錯誤:', error);
        res.status(500).json({ error: '取得使用者列表失敗' });
    }
});

// 取得個人資料
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['passwordHash'] }
        });

        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        // 統計使用者貢獻
        const stats = await Promise.all([
            Exam.count({ where: { uploadedBy: req.user.id } }),
            CheatSheet.count({ where: { uploadedBy: req.user.id } }),
            CourseReview.count({ where: { userId: req.user.id } })
        ]);

        res.json({
            ...user.toJSON(),
            stats: {
                uploadedExams: stats[0],
                uploadedCheatSheets: stats[1],
                reviews: stats[2]
            }
        });
    } catch (error) {
        console.error('取得個人資料錯誤:', error);
        res.status(500).json({ error: '取得個人資料失敗' });
    }
});

// 取得指定使用者資料（管理員或本人）
router.get('/:id', requireOwnerOrAdmin('id'), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['passwordHash'] }
        });

        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        res.json(user);
    } catch (error) {
        console.error('取得使用者資料錯誤:', error);
        res.status(500).json({ error: '取得使用者資料失敗' });
    }
});

// 更新個人資料
router.put('/profile', [
    body('fullName').optional().notEmpty(),
    body('email').optional().isEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        // 檢查 email 是否已被使用
        if (req.body.email && req.body.email !== user.email) {
            const existingUser = await User.findOne({
                where: { email: req.body.email }
            });

            if (existingUser) {
                return res.status(400).json({ error: '此電子郵件已被使用' });
            }
        }

        // 更新資料
        const updates = {};
        const allowedFields = ['fullName', 'email'];
        
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        await user.update(updates);

        res.json({
            message: '個人資料更新成功',
            data: {
                ...user.toJSON(),
                passwordHash: undefined
            }
        });
    } catch (error) {
        console.error('更新個人資料錯誤:', error);
        res.status(500).json({ error: '更新個人資料失敗' });
    }
});

// 更新使用者會費狀態（管理員）
router.patch('/:id/fee-status', requireAdmin, [
    body('hasPaidFee').isBoolean().withMessage('請提供有效的繳費狀態')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        user.hasPaidFee = req.body.hasPaidFee;
        await user.save();

        res.json({
            message: '會費狀態更新成功',
            data: {
                id: user.id,
                username: user.username,
                hasPaidFee: user.hasPaidFee
            }
        });
    } catch (error) {
        console.error('更新會費狀態錯誤:', error);
        res.status(500).json({ error: '更新會費狀態失敗' });
    }
});

// 更新使用者角色（管理員）
router.patch('/:id/role', requireAdmin, [
    body('role').isIn(['admin', 'member', 'user']).withMessage('請提供有效的角色')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        // 防止移除最後一個管理員
        if (user.role === 'admin' && req.body.role !== 'admin') {
            const adminCount = await User.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                return res.status(400).json({ error: '無法移除最後一個管理員' });
            }
        }

        user.role = req.body.role;
        await user.save();

        res.json({
            message: '角色更新成功',
            data: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('更新角色錯誤:', error);
        res.status(500).json({ error: '更新角色失敗' });
    }
});

// 刪除使用者（管理員）
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        // 防止刪除最後一個管理員
        if (user.role === 'admin') {
            const adminCount = await User.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                return res.status(400).json({ error: '無法刪除最後一個管理員' });
            }
        }

        // 防止刪除自己
        if (user.id === req.user.id) {
            return res.status(400).json({ error: '無法刪除自己的帳號' });
        }

        await user.destroy();

        res.json({ message: '使用者已刪除' });
    } catch (error) {
        console.error('刪除使用者錯誤:', error);
        res.status(500).json({ error: '刪除使用者失敗' });
    }
});

// 取得使用者貢獻統計
router.get('/:id/contributions', async (req, res) => {
    try {
        const userId = req.params.id;

        // 取得上傳的考古題
        const exams = await Exam.findAll({
            where: { uploadedBy: userId },
            attributes: ['id', 'courseCode', 'courseName', 'examType', 'year', 'semester', 'created_at'],
            order: [['created_at', 'DESC']],
            limit: 10
        });

        // 取得上傳的大抄
        const cheatSheets = await CheatSheet.findAll({
            where: { uploadedBy: userId },
            attributes: ['id', 'courseCode', 'courseName', 'title', 'created_at'],
            order: [['created_at', 'DESC']],
            limit: 10
        });

        // 取得課程評價
        const reviews = await CourseReview.findAll({
            where: { userId: userId },
            attributes: ['id', 'courseCode', 'courseName', 'professor', 'overallRating', 'created_at'],
            order: [['created_at', 'DESC']],
            limit: 10
        });

        res.json({
            exams,
            cheatSheets,
            reviews,
            totals: {
                exams: await Exam.count({ where: { uploadedBy: userId } }),
                cheatSheets: await CheatSheet.count({ where: { uploadedBy: userId } }),
                reviews: await CourseReview.count({ where: { userId: userId } })
            }
        });
    } catch (error) {
        console.error('取得使用者貢獻錯誤:', error);
        res.status(500).json({ error: '取得貢獻統計失敗' });
    }
});

module.exports = router;