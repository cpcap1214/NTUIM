const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const { CourseReview, User, Course } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('../models').sequelize;

const hasAdminAccess = (user) => user?.role === 'admin' || user?.username === 'cpcap';

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

        // 建立查詢條件（公開列表只顯示已核准的評價，有金錢回饋，未審核前不對外顯示）
        const where = { status: 'approved' };
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

        // 計算平均評分（只統計已核准的評價）
        const stats = await CourseReview.findOne({
            where: { courseCode, status: 'approved' },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('quality')), 'avgQuality'],
                [sequelize.fn('AVG', sequelize.col('difficulty')), 'avgDifficulty'],
                [sequelize.fn('AVG', sequelize.col('sweetness')), 'avgSweetness'],
                [sequelize.fn('AVG', sequelize.col('usefulness')), 'avgUsefulness'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
            ],
            raw: true
        });

        // 依教授分組統計（四指標分開列出，不計算任何綜合分數；只統計已核准的評價）
        const professorStats = await CourseReview.findAll({
            where: { courseCode, status: 'approved' },
            attributes: [
                'professor',
                [sequelize.fn('AVG', sequelize.col('quality')), 'avgQuality'],
                [sequelize.fn('AVG', sequelize.col('difficulty')), 'avgDifficulty'],
                [sequelize.fn('AVG', sequelize.col('sweetness')), 'avgSweetness'],
                [sequelize.fn('AVG', sequelize.col('usefulness')), 'avgUsefulness'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount']
            ],
            group: ['professor'],
            order: [['professor', 'ASC']],
            raw: true
        });

        res.json({
            courseCode,
            overall: {
                avgQuality: parseFloat(stats.avgQuality || 0).toFixed(1),
                avgDifficulty: parseFloat(stats.avgDifficulty || 0).toFixed(1),
                avgSweetness: parseFloat(stats.avgSweetness || 0).toFixed(1),
                avgUsefulness: parseFloat(stats.avgUsefulness || 0).toFixed(1),
                totalReviews: parseInt(stats.totalReviews || 0)
            },
            byProfessor: professorStats.map(prof => ({
                professor: prof.professor,
                avgQuality: parseFloat(prof.avgQuality).toFixed(1),
                avgDifficulty: parseFloat(prof.avgDifficulty).toFixed(1),
                avgSweetness: parseFloat(prof.avgSweetness).toFixed(1),
                avgUsefulness: parseFloat(prof.avgUsefulness).toFixed(1),
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
        body('quality').isFloat({ min: 1, max: 5 }).withMessage('課程品質須為1-5'),
        body('difficulty').isFloat({ min: 1, max: 5 }).withMessage('難易度須為1-5'),
        body('sweetness').isFloat({ min: 1, max: 5 }).withMessage('給分高低須為1-5'),
        body('usefulness').isFloat({ min: 1, max: 5 }).withMessage('實用性須為1-5'),
        body('comment').trim().isLength({ min: 50, max: 1000 }).withMessage('心得為必填，請填寫 50-1000 字'),
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
                quality,
                difficulty,
                sweetness,
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

            // 建立評價（狀態一律從 pending 開始，需經管理員審核後才會公開顯示）
            const review = await CourseReview.create({
                courseCode,
                courseName,
                professor,
                year: parseInt(year),
                semester,
                quality: parseFloat(quality),
                difficulty: parseFloat(difficulty),
                sweetness: parseFloat(sweetness),
                usefulness: parseFloat(usefulness),
                comment,
                userId: req.user.id,
                isAnonymous,
                status: 'pending'
            });

            // 更新或建立課程資訊
            await Course.findOrCreate({
                where: { courseCode },
                defaults: { courseName }
            });

            res.status(201).json({
                message: '評價已送出，待管理員審核後將公開顯示',
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
        body('quality').optional().isFloat({ min: 1, max: 5 }),
        body('difficulty').optional().isFloat({ min: 1, max: 5 }),
        body('sweetness').optional().isFloat({ min: 1, max: 5 }),
        body('usefulness').optional().isFloat({ min: 1, max: 5 }),
        body('comment').optional().trim().isLength({ min: 50, max: 1000 }).withMessage('心得請填寫 50-1000 字'),
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
            const allowedFields = ['quality', 'difficulty', 'sweetness', 'usefulness', 'comment', 'isAnonymous'];
            
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            // 內容有異動就代表需要重新審核（尤其是被拒絕後修改重新送出的情況）
            updates.status = 'pending';
            updates.rejectReason = null;

            await review.update(updates);

            res.json({
                message: '評價已更新，將重新進入審核',
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
        if (review.userId !== req.user.id && !hasAdminAccess(req.user)) {
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

// 取得評價列表供管理員審核/管理（管理員）
// 不帶 status 就回傳全部，帶 status 則只回傳該狀態（pending/approved/rejected）
router.get('/admin/reviews', authenticateToken, requireAdmin, [
    query('status').optional().isIn(['pending', 'approved', 'rejected'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { status } = req.query;
        const where = status ? { status } : {};

        const reviews = await CourseReview.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['username', 'fullName', 'studentId']
                },
                {
                    model: User,
                    as: 'reviewedByUser',
                    attributes: ['username', 'fullName']
                }
            ],
            // pending 的排最前面（優先處理），同狀態內新的排前面
            order: [
                [sequelize.literal("CASE WHEN status = 'pending' THEN 0 ELSE 1 END"), 'ASC'],
                ['created_at', 'DESC']
            ]
        });

        res.json({ data: reviews });
    } catch (error) {
        console.error('取得評價列表錯誤:', error);
        res.status(500).json({ error: '取得評價列表失敗' });
    }
});

// 審核評價（核准或拒絕，管理員）
router.patch('/:id/status',
    authenticateToken,
    requireAdmin,
    [
        body('status').isIn(['approved', 'rejected']).withMessage('狀態須為 approved 或 rejected'),
        body('rejectReason').optional().isString()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { status, rejectReason } = req.body;

            if (status === 'rejected' && !rejectReason?.trim()) {
                return res.status(400).json({ error: '拒絕時請填寫拒絕原因' });
            }

            const review = await CourseReview.findByPk(req.params.id);

            if (!review) {
                return res.status(404).json({ error: '評價不存在' });
            }

            review.status = status;
            review.rejectReason = status === 'rejected' ? rejectReason.trim() : null;
            review.reviewedBy = req.user.id;
            await review.save();

            res.json({
                message: status === 'approved' ? '評價已核准' : '評價已拒絕',
                data: review
            });
        } catch (error) {
            console.error('審核評價錯誤:', error);
            res.status(500).json({ error: '審核評價失敗' });
        }
    }
);

module.exports = router;
