const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { body, validationResult, query } = require('express-validator');
const { Exam, User } = require('../models');
const { authenticateToken, requirePaidMember, requireAdmin } = require('../middleware/auth');
const { upload, adminUpload, handleUploadError } = require('../middleware/upload');
const { Op } = require('sequelize');

// 取得考古題列表（公開）
router.get('/', [
    query('courseCode').optional().isString(),
    query('year').optional().isInt(),
    query('semester').optional().isIn(['1', '2', 'summer']),
    query('examType').optional().isIn(['midterm', 'final', 'quiz']),
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
            year,
            semester,
            examType,
            page = 1,
            limit = 20
        } = req.query;

        // 建立查詢條件
        const where = {};
        if (courseCode) where.courseCode = { [Op.like]: `%${courseCode}%` };
        if (year) where.year = year;
        if (semester) where.semester = semester;
        if (examType) where.examType = examType;

        // 查詢考古題
        const { count, rows } = await Exam.findAndCountAll({
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
        console.error('取得考古題列表錯誤:', error);
        res.status(500).json({ error: '取得考古題失敗' });
    }
});

// 上傳考古題（只有管理員可以上傳）
router.post('/upload', 
    authenticateToken,
    requireAdmin,
    adminUpload.single('file'),
    handleUploadError,
    [
        body('courseCode').notEmpty().withMessage('課程代碼為必填'),
        body('courseName').notEmpty().withMessage('課程名稱為必填'),
        body('year').isInt({ min: 2000, max: 2100 }).withMessage('請輸入有效年份'),
        body('semester').isIn(['1', '2', 'summer']).withMessage('請選擇學期'),
        body('examType').isIn(['midterm', 'final', 'quiz']).withMessage('請選擇考試類型'),
        body('professor').optional().isString()
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
                year,
                semester,
                examType,
                professor
            } = req.body;

            // 建立考古題記錄
            const exam = await Exam.create({
                courseCode,
                courseName,
                professor,
                year: parseInt(year),
                semester,
                examType,
                filePath: req.file.path,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                uploadedBy: req.user.id
            });

            res.status(201).json({
                message: '考古題上傳成功',
                data: exam
            });
        } catch (error) {
            // 刪除已上傳的檔案
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            console.error('上傳考古題錯誤:', error);
            res.status(500).json({ error: '上傳失敗' });
        }
    }
);

// 下載考古題（需登入且繳費）
router.get('/:id/download', authenticateToken, requirePaidMember, async (req, res) => {
    try {
        const exam = await Exam.findByPk(req.params.id);

        if (!exam) {
            return res.status(404).json({ error: '考古題不存在' });
        }

        // 檢查檔案是否存在
        if (!fs.existsSync(exam.filePath)) {
            return res.status(404).json({ error: '檔案不存在' });
        }

        // 更新下載次數
        exam.downloadCount += 1;
        await exam.save();

        // 設定下載標頭
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(exam.fileName)}"`);

        // 傳送檔案
        res.sendFile(path.resolve(exam.filePath));
    } catch (error) {
        console.error('下載考古題錯誤:', error);
        res.status(500).json({ error: '下載失敗' });
    }
});

// 刪除考古題（只有上傳者或管理員可以刪除）
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const exam = await Exam.findByPk(req.params.id);

        if (!exam) {
            return res.status(404).json({ error: '考古題不存在' });
        }

        // 檢查權限
        if (exam.uploadedBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: '無權刪除此考古題' });
        }

        // 刪除檔案
        if (fs.existsSync(exam.filePath)) {
            fs.unlinkSync(exam.filePath);
        }

        // 刪除資料庫記錄
        await exam.destroy();

        res.json({ message: '考古題已刪除' });
    } catch (error) {
        console.error('刪除考古題錯誤:', error);
        res.status(500).json({ error: '刪除失敗' });
    }
});

module.exports = router;