const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { body, validationResult, query } = require('express-validator');
const { CheatSheet, User } = require('../models');
const { authenticateToken, requirePaidMember, requireAdmin } = require('../middleware/auth');
const { upload, adminUpload, handleUploadError } = require('../middleware/upload');
const { Op } = require('sequelize');

// 取得大抄列表（公開）
router.get('/', [
    query('courseCode').optional().isString(),
    query('keyword').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 10000 })
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

// 上傳大抄（只有管理員可以上傳）
router.post('/upload',
    authenticateToken,
    requireAdmin,
    adminUpload.single('file'),
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
                description,
                tags
            } = req.body;

            // 解析 tags（前端傳送的是 JSON 字串）
            let parsedTags = [];
            try {
                parsedTags = tags ? JSON.parse(tags) : [];
            } catch (e) {
                parsedTags = [];
            }

            // 建立大抄記錄 - 使用修正編碼後的檔名
            const fileName = req.fileInfo?.file?.originalName || req.file.originalname;
            
            const cheatSheet = await CheatSheet.create({
                courseCode,
                courseName,
                title,
                description,
                tags: parsedTags,
                filePath: req.file.path,
                fileName: fileName, // 使用修正編碼的檔名
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

// 預覽大抄（只需登入）
router.get('/:id/preview', (req, res, next) => {
    // 支援 query parameter 的 token
    if (req.query.token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
}, authenticateToken, async (req, res) => {
    try {
        const cheatSheet = await CheatSheet.findByPk(req.params.id);
        
        if (!cheatSheet) {
            return res.status(404).json({ error: '大抄不存在' });
        }

        const filePath = path.resolve(cheatSheet.filePath);
        
        // 檢查檔案是否存在
        if (!fs.existsSync(filePath)) {
            console.error('大抄檔案不存在:', filePath);
            return res.status(404).json({ error: '大抄檔案不存在' });
        }

        // 設定為在線預覽（而非下載）
        res.setHeader('Content-Type', 'application/pdf');
        // 使用 RFC 5987 標準處理中文檔名
        const encodedFilename = encodeURIComponent(cheatSheet.fileName);
        res.setHeader('Content-Disposition', `inline; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
        
        // 傳送檔案
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('預覽大抄錯誤:', error);
        res.status(500).json({ error: '預覽失敗，請稍後再試' });
    }
});

// 下載大抄（只需登入）
router.get('/:id/download', authenticateToken, async (req, res) => {
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
        // 使用 RFC 5987 標準處理中文檔名
        const encodedFilename = encodeURIComponent(cheatSheet.fileName);
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);

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
        body('courseCode').optional().notEmpty().withMessage('課程代碼不能為空'),
        body('courseName').optional().notEmpty().withMessage('課程名稱不能為空'),
        body('title').optional().notEmpty().withMessage('標題不能為空'),
        body('description').optional().isString(),
        body('tags').optional().isArray()
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
            const { courseCode, courseName, title, description, tags } = req.body;
            if (courseCode) cheatSheet.courseCode = courseCode;
            if (courseName) cheatSheet.courseName = courseName;
            if (title) cheatSheet.title = title;
            if (description !== undefined) cheatSheet.description = description;
            if (tags !== undefined) cheatSheet.tags = tags;

            await cheatSheet.save();

            res.json({
                message: '大抄資訊更新成功',
                data: cheatSheet
            });
        } catch (error) {
            console.error('更新大抄錯誤:', error);
            res.status(500).json({ error: '更新失敗' });
        }
    }
);

// 更新大抄檔案（只有上傳者或管理員可以更新）
router.put('/:id/file',
    authenticateToken,
    adminUpload.single('file'),
    handleUploadError,
    async (req, res) => {
        try {
            const cheatSheet = await CheatSheet.findByPk(req.params.id);

            if (!cheatSheet) {
                // 清理上傳的檔案
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({ error: '大抄不存在' });
            }

            // 檢查權限
            if (cheatSheet.uploadedBy !== req.user.id && req.user.role !== 'admin') {
                // 清理上傳的檔案
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(403).json({ error: '無權修改此大抄' });
            }

            if (!req.file) {
                return res.status(400).json({ error: '請選擇要上傳的檔案' });
            }

            // 刪除舊檔案
            if (fs.existsSync(cheatSheet.filePath)) {
                fs.unlinkSync(cheatSheet.filePath);
            }

            // 更新檔案資訊
            const fileName = req.fileInfo?.file?.originalName || req.file.originalname;
            cheatSheet.filePath = req.file.path;
            cheatSheet.fileName = fileName;
            cheatSheet.fileSize = req.file.size;

            await cheatSheet.save();

            res.json({
                message: '大抄檔案更新成功',
                data: cheatSheet
            });
        } catch (error) {
            // 清理上傳的檔案
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            console.error('更新大抄檔案錯誤:', error);
            res.status(500).json({ error: '檔案更新失敗' });
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