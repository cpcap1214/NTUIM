const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const { CourseReview, User, Course } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('../models').sequelize;

// 取得課程評價列表（公開）
router.get('/', [
    query('courseCode').optional().isString(),
    query('professor').optional().isString(),
    query('year').optional().isInt(),
    query('semester').optional().isIn(['1', '2', 'summer']),
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
            professor,
            year,
            semester,
            page = 1,
            limit = 20
        } = req.query;

        // 建立查詢條件
        const where = {};
        if (courseCode) where.courseCode = { [Op.like]: `%${courseCode}%` };
        if (professor) where.professor = { [Op.like]: `%${professor}%` };
        if (year) where.year = year;
        if (semester) where.semester = semester;

        // 查詢評價
        const { count, rows } = await CourseReview.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'reviewer',
                attributes: ['username', 'fullName']
            }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        // 處理匿名評價
        const processedRows = rows.map(review => {
            const reviewData = review.toJSON();
            if (reviewData.isAnonymous) {
                reviewData.reviewer = {
                    username: '匿名使用者',
                    fullName: '匿名'
                };
            }
            return reviewData;
        });

        res.json({
            data: processedRows,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('取得課程評價錯誤:', error);
        res.status(500).json({ error: '取得評價失敗' });
    }
});

// 取得課程統計資料（公開）
router.get('/statistics/:courseCode', async (req, res) => {
    try {
        const { courseCode } = req.params;

        // 計算平均評分
        const stats = await CourseReview.findOne({
            where: { courseCode },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('overall_rating')), 'avgOverallRating'],
                [sequelize.fn('AVG', sequelize.col('difficulty')), 'avgDifficulty'],
                [sequelize.fn('AVG', sequelize.col('workload')), 'avgWorkload'],
                [sequelize.fn('AVG', sequelize.col('usefulness')), 'avgUsefulness'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
            ],
            raw: true
        });

        // 依教授分組統計
        const professorStats = await CourseReview.findAll({
            where: { courseCode },
            attributes: [
                'professor',
                [sequelize.fn('AVG', sequelize.col('overall_rating')), 'avgRating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount']
            ],
            group: ['professor'],
            raw: true
        });

        res.json({
            courseCode,
            overall: {
                avgOverallRating: parseFloat(stats.avgOverallRating || 0).toFixed(1),
                avgDifficulty: parseFloat(stats.avgDifficulty || 0).toFixed(1),
                avgWorkload: parseFloat(stats.avgWorkload || 0).toFixed(1),
                avgUsefulness: parseFloat(stats.avgUsefulness || 0).toFixed(1),
                totalReviews: parseInt(stats.totalReviews || 0)
            },
            byProfessor: professorStats.map(prof => ({
                professor: prof.professor,
                avgRating: parseFloat(prof.avgRating).toFixed(1),
                reviewCount: parseInt(prof.reviewCount)
            }))
        });
    } catch (error) {
        console.error('取得課程統計錯誤:', error);
        res.status(500).json({ error: '取得統計資料失敗' });
    }
});

// 新增課程評價（需登入）
router.post('/',
    authenticateToken,
    [
        body('courseCode').notEmpty().withMessage('課程代碼為必填'),
        body('courseName').notEmpty().withMessage('課程名稱為必填'),
        body('professor').notEmpty().withMessage('授課教授為必填'),
        body('year').isInt({ min: 2000, max: 2100 }).withMessage('請輸入有效年份'),
        body('semester').isIn(['1', '2', 'summer']).withMessage('請選擇學期'),
        body('overallRating').isFloat({ min: 1, max: 5 }).withMessage('整體評分須為1-5'),
        body('difficulty').isInt({ min: 1, max: 5 }).withMessage('難度須為1-5'),
        body('workload').isInt({ min: 1, max: 5 }).withMessage('作業量須為1-5'),
        body('usefulness').isInt({ min: 1, max: 5 }).withMessage('實用性須為1-5'),
        body('comment').optional().isString(),
        body('isAnonymous').optional().isBoolean()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const {
                courseCode,
                courseName,
                professor,
                year,
                semester,
                overallRating,
                difficulty,
                workload,
                usefulness,
                comment,
                isAnonymous = false
            } = req.body;

            // 檢查是否已評價過此課程（同一學期、同一教授）
            const existingReview = await CourseReview.findOne({
                where: {
                    courseCode,
                    professor,
                    year,
                    semester,
                    userId: req.user.id
                }
            });

            if (existingReview) {
                return res.status(400).json({
                    error: '您已評價過此課程（同學期、同教授）'
                });
            }

            // 建立評價
            const review = await CourseReview.create({
                courseCode,
                courseName,
                professor,
                year: parseInt(year),
                semester,
                overallRating: parseFloat(overallRating),
                difficulty: parseInt(difficulty),
                workload: parseInt(workload),
                usefulness: parseInt(usefulness),
                comment,
                userId: req.user.id,
                isAnonymous
            });

            // 更新或建立課程資訊
            await Course.findOrCreate({
                where: { courseCode },
                defaults: { courseName }
            });

            res.status(201).json({
                message: '評價新增成功',
                data: review
            });
        } catch (error) {
            console.error('新增評價錯誤:', error);
            res.status(500).json({ error: '新增評價失敗' });
        }
    }
);

// 更新評價（只有評價者本人）
router.put('/:id',
    authenticateToken,
    [
        body('overallRating').optional().isFloat({ min: 1, max: 5 }),
        body('difficulty').optional().isInt({ min: 1, max: 5 }),
        body('workload').optional().isInt({ min: 1, max: 5 }),
        body('usefulness').optional().isInt({ min: 1, max: 5 }),
        body('comment').optional().isString(),
        body('isAnonymous').optional().isBoolean()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const review = await CourseReview.findByPk(req.params.id);

            if (!review) {
                return res.status(404).json({ error: '評價不存在' });
            }

            // 檢查權限（只有評價者本人可以修改）
            if (review.userId !== req.user.id) {
                return res.status(403).json({ error: '無權修改此評價' });
            }

            // 更新評價
            const updates = {};
            const allowedFields = ['overallRating', 'difficulty', 'workload', 'usefulness', 'comment', 'isAnonymous'];
            
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            await review.update(updates);

            res.json({
                message: '評價更新成功',
                data: review
            });
        } catch (error) {
            console.error('更新評價錯誤:', error);
            res.status(500).json({ error: '更新評價失敗' });
        }
    }
);

// 刪除評價（評價者本人或管理員）
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const review = await CourseReview.findByPk(req.params.id);

        if (!review) {
            return res.status(404).json({ error: '評價不存在' });
        }

        // 檢查權限
        if (review.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: '無權刪除此評價' });
        }

        await review.destroy();

        res.json({ message: '評價已刪除' });
    } catch (error) {
        console.error('刪除評價錯誤:', error);
        res.status(500).json({ error: '刪除評價失敗' });
    }
});

// 取得我的評價（需登入）
router.get('/my-reviews', authenticateToken, async (req, res) => {
    try {
        const reviews = await CourseReview.findAll({
            where: { userId: req.user.id },
            order: [['created_at', 'DESC']]
        });

        res.json(reviews);
    } catch (error) {
        console.error('取得我的評價錯誤:', error);
        res.status(500).json({ error: '取得評價失敗' });
    }
});

module.exports = router;