const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { body, validationResult, query } = require('express-validator');
const { CheatSheet, User } = require('../models');
const { authenticateToken, requirePaidMember } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { Op } = require('sequelize');

// 取得大抄列表（公開）
router.get('/', [
    query('courseCode').optional().isString(),
    query('keyword').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const {
            courseCode,
            keyword,
            page = 1,
            limit = 20
        } = req.query;

        // 建立查詢條件
        const where = {};
        if (courseCode) where.courseCode = { [Op.like]: `%${courseCode}%` };
        if (keyword) {
            where[Op.or] = [
                { title: { [Op.like]: `%${keyword}%` } },
                { description: { [Op.like]: `%${keyword}%` } },
                { courseName: { [Op.like]: `%${keyword}%` } }
            ];
        }

        // 查詢大抄
        const { count, rows } = await CheatSheet.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'uploader',
                attributes: ['username', 'fullName']
            }],
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
        console.error('取得大抄列表錯誤:', error);
        res.status(500).json({ error: '取得大抄失敗' });
    }
});

// 取得單一大抄詳情
router.get('/:id', async (req, res) => {
    try {
        const cheatSheet = await CheatSheet.findByPk(req.params.id, {
            include: [{
                model: User,
                as: 'uploader',
                attributes: ['username', 'fullName']
            }]
        });

        if (!cheatSheet) {
            return res.status(404).json({ error: '大抄不存在' });
        }

        res.json(cheatSheet);
    } catch (error) {
        console.error('取得大抄詳情錯誤:', error);
        res.status(500).json({ error: '取得大抄失敗' });
    }
});

// 上傳大抄（需登入且繳費）
router.post('/',
    authenticateToken,
    requirePaidMember,
    upload.single('file'),
    handleUploadError,
    [
        body('courseCode').notEmpty().withMessage('課程代碼為必填'),
        body('courseName').notEmpty().withMessage('課程名稱為必填'),
        body('title').notEmpty().withMessage('標題為必填'),
        body('description').optional().isString()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // 刪除已上傳的檔案
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ errors: errors.array() });
        }

        if (!req.file) {
            return res.status(400).json({ error: '請選擇要上傳的檔案' });
        }

        try {
            const {
                courseCode,
                courseName,
                title,
                description
            } = req.body;

            // 建立大抄記錄
            const cheatSheet = await CheatSheet.create({
                courseCode,
                courseName,
                title,
                description,
                filePath: req.file.path,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                uploadedBy: req.user.id
            });

            res.status(201).json({
                message: '大抄上傳成功',
                data: cheatSheet
            });
        } catch (error) {
            // 刪除已上傳的檔案
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            console.error('上傳大抄錯誤:', error);
            res.status(500).json({ error: '上傳失敗' });
        }
    }
);

// 下載大抄（需登入且繳費）
router.get('/:id/download', authenticateToken, requirePaidMember, async (req, res) => {
    try {
        const cheatSheet = await CheatSheet.findByPk(req.params.id);

        if (!cheatSheet) {
            return res.status(404).json({ error: '大抄不存在' });
        }

        // 檢查檔案是否存在
        if (!fs.existsSync(cheatSheet.filePath)) {
            return res.status(404).json({ error: '檔案不存在' });
        }

        // 更新下載次數
        cheatSheet.downloadCount += 1;
        await cheatSheet.save();

        // 設定下載標頭
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cheatSheet.fileName)}"`);

        // 傳送檔案
        res.sendFile(path.resolve(cheatSheet.filePath));
    } catch (error) {
        console.error('下載大抄錯誤:', error);
        res.status(500).json({ error: '下載失敗' });
    }
});

// 更新大抄資訊（只有上傳者或管理員）
router.put('/:id',
    authenticateToken,
    [
        body('title').optional().notEmpty(),
        body('description').optional().isString()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const cheatSheet = await CheatSheet.findByPk(req.params.id);

            if (!cheatSheet) {
                return res.status(404).json({ error: '大抄不存在' });
            }

            // 檢查權限
            if (cheatSheet.uploadedBy !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '無權修改此大抄' });
            }

            // 更新資訊
            const { title, description } = req.body;
            if (title) cheatSheet.title = title;
            if (description !== undefined) cheatSheet.description = description;

            await cheatSheet.save();

            res.json({
                message: '大抄更新成功',
                data: cheatSheet
            });
        } catch (error) {
            console.error('更新大抄錯誤:', error);
            res.status(500).json({ error: '更新失敗' });
        }
    }
);

// 刪除大抄（只有上傳者或管理員）
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const cheatSheet = await CheatSheet.findByPk(req.params.id);

        if (!cheatSheet) {
            return res.status(404).json({ error: '大抄不存在' });
        }

        // 檢查權限
        if (cheatSheet.uploadedBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: '無權刪除此大抄' });
        }

        // 刪除檔案
        if (fs.existsSync(cheatSheet.filePath)) {
            fs.unlinkSync(cheatSheet.filePath);
        }

        // 刪除資料庫記錄
        await cheatSheet.destroy();

        res.json({ message: '大抄已刪除' });
    } catch (error) {
        console.error('刪除大抄錯誤:', error);
        res.status(500).json({ error: '刪除失敗' });
    }
});

module.exports = router;