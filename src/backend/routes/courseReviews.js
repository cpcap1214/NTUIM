const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const { CourseReview, User, Course } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('../models').sequelize;

const hasAdminAccess = (user) => user?.role === 'admin' || user?.username === 'cpcap';

// 錯誤訊息一律回傳 errorCode，實際中文文字由前端 i18n 語言檔（src/main/js/i18n/locales/zh-TW.js
// 的 errors 區塊）負責翻譯；error 欄位保留中文純文字作為未支援 i18n 的舊客戶端 fallback。
const errorResponse = (errorCode, message) => ({ error: message, errorCode });

// 取得課程評價列表（公開，支援分頁、關鍵字搜尋、篩選、排序）
router.get('/', [
    query('courseCode').optional().isString(),
    query('professor').optional().isString(),
    query('search').optional().isString(),
    query('year').optional().isInt(),
    query('semester').optional().isIn(['1', '2', 'summer']),
    query('sortBy').optional().isIn(['latest', 'highest', 'lowest']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const {
            courseCode,
            professor,
            search,
            year,
            semester,
            sortBy = 'latest',
            page = 1,
            limit = 12
        } = req.query;

        // 建立查詢條件（公開列表只顯示已核准的評價，有金錢回饋，未審核前不對外顯示）
        const where = { status: 'approved' };
        if (courseCode) where.courseCode = { [Op.like]: `%${courseCode}%` };
        if (professor) where.professor = { [Op.like]: professor };
        if (year) where.year = year;
        if (semester) where.semester = semester;
        // search 是搜尋框用的模糊比對，同時比對課程名稱/代碼/教授；
        // 跟上面的 courseCode/professor（給其他 API 使用者的精準篩選）是不同用途，可以同時套用
        if (search) {
            const keyword = `%${search}%`;
            where[Op.or] = [
                { courseName: { [Op.like]: keyword } },
                { courseCode: { [Op.like]: keyword } },
                { professor: { [Op.like]: keyword } }
            ];
        }

        // 排序：最新發表用建立時間；評分最高/最低用四指標平均分（不落地成欄位，查詢時即時計算）
        const order = sortBy === 'highest' || sortBy === 'lowest'
            ? [[sequelize.literal('(quality + difficulty + sweetness + usefulness) / 4'), sortBy === 'highest' ? 'DESC' : 'ASC']]
            : [['created_at', 'DESC']];

        // 查詢評價
        const { count, rows } = await CourseReview.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'reviewer',
                attributes: ['username', 'fullName']
            }],
            order,
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
                pages: Math.ceil(count / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('取得課程評價錯誤:', error);
        res.status(500).json(errorResponse('FETCH_FAILED', '取得評價失敗'));
    }
});

// 取得篩選選項（公開）：目前實際存在哪些學年期、哪些教授有已核准的評價，
// 給前端的篩選下拉選單使用；跟分頁後的評價列表分開查，選單才不會只反映當前那一頁的資料
router.get('/filters', async (req, res) => {
    try {
        const terms = await CourseReview.findAll({
            where: { status: 'approved' },
            attributes: ['year', 'semester'],
            group: ['year', 'semester'],
            raw: true
        });

        const professorRows = await CourseReview.findAll({
            where: { status: 'approved' },
            attributes: ['professor'],
            group: ['professor'],
            order: [['professor', 'ASC']],
            raw: true
        });

        res.json({
            academicTerms: terms.map(t => ({ year: t.year, semester: t.semester })),
            professors: professorRows.map(p => p.professor)
        });
    } catch (error) {
        console.error('取得篩選選項錯誤:', error);
        res.status(500).json(errorResponse('FETCH_FAILED', '取得篩選選項失敗'));
    }
});

// 新增課程評價（需登入）
router.post('/',
    authenticateToken,
    [
        body('courseCode').trim().notEmpty().withMessage({ code: 'COURSE_CODE_REQUIRED', message: '課程代碼為必填' }),
        body('courseName').trim().notEmpty().withMessage({ code: 'COURSE_NAME_REQUIRED', message: '課程名稱為必填' }),
        body('professor').trim().notEmpty().withMessage({ code: 'PROFESSOR_REQUIRED', message: '授課教授為必填' }),
        body('year').isInt({ min: 2000, max: 2100 }).withMessage({ code: 'YEAR_INVALID', message: '請輸入有效年份' }),
        body('semester').isIn(['1', '2', 'summer']).withMessage({ code: 'SEMESTER_REQUIRED', message: '請選擇學期' }),
        body('quality').isFloat({ min: 0.5, max: 5 }).withMessage({ code: 'QUALITY_RANGE', message: '課程品質須為0.5-5' }),
        body('difficulty').isFloat({ min: 0.5, max: 5 }).withMessage({ code: 'DIFFICULTY_RANGE', message: '難易度須為0.5-5' }),
        body('sweetness').isFloat({ min: 0.5, max: 5 }).withMessage({ code: 'SWEETNESS_RANGE', message: '給分高低須為0.5-5' }),
        body('usefulness').isFloat({ min: 0.5, max: 5 }).withMessage({ code: 'USEFULNESS_RANGE', message: '實用性須為0.5-5' }),
        body('courseContent').trim().isLength({ min: 5, max: 1000 }).withMessage({ code: 'COURSE_CONTENT_REQUIRED', message: '課程內容為必填，請填寫至少 5 字' }),
        body('teachingMethod').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage({ code: 'TEACHING_METHOD_TOO_LONG', message: '教學方式請勿超過 1000 字' }),
        body('assignmentExamFormat').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage({ code: 'ASSIGNMENT_EXAM_FORMAT_TOO_LONG', message: '作業與考試形式請勿超過 1000 字' }),
        body('gradingBreakdown').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage({ code: 'GRADING_BREAKDOWN_TOO_LONG', message: '評分佔比請勿超過 1000 字' }),
        body('comment').trim().isLength({ min: 50, max: 1000 }).withMessage({ code: 'COMMENT_LENGTH', message: '心得為必填，請填寫 50-1000 字' }),
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
                courseContent,
                teachingMethod,
                assignmentExamFormat,
                gradingBreakdown,
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
                return res.status(400).json(errorResponse('DUPLICATE_REVIEW', '您已評價過此課程（同學期、同教授）'));
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
                courseContent,
                teachingMethod: teachingMethod || null,
                assignmentExamFormat: assignmentExamFormat || null,
                gradingBreakdown: gradingBreakdown || null,
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
            // 資料庫的 UNIQUE 約束是重複評價檢查的最後一道防線（例如連點兩下送出鍵、
            // 或開兩個分頁同時送出，都可能繞過前面 findOne 的預先檢查）
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json(errorResponse('DUPLICATE_REVIEW', '您已評價過此課程（同學期、同教授）'));
            }
            console.error('新增評價錯誤:', error);
            res.status(500).json(errorResponse('CREATE_FAILED', '新增評價失敗'));
        }
    }
);

// 更新評價（只有評價者本人）
router.put('/:id',
    authenticateToken,
    [
        body('quality').optional().isFloat({ min: 0.5, max: 5 }),
        body('difficulty').optional().isFloat({ min: 0.5, max: 5 }),
        body('sweetness').optional().isFloat({ min: 0.5, max: 5 }),
        body('usefulness').optional().isFloat({ min: 0.5, max: 5 }),
        body('courseContent').optional().trim().isLength({ min: 5, max: 1000 }).withMessage({ code: 'COURSE_CONTENT_REQUIRED', message: '課程內容為必填，請填寫至少 5 字' }),
        body('teachingMethod').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage({ code: 'TEACHING_METHOD_TOO_LONG', message: '教學方式請勿超過 1000 字' }),
        body('assignmentExamFormat').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage({ code: 'ASSIGNMENT_EXAM_FORMAT_TOO_LONG', message: '作業與考試形式請勿超過 1000 字' }),
        body('gradingBreakdown').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage({ code: 'GRADING_BREAKDOWN_TOO_LONG', message: '評分佔比請勿超過 1000 字' }),
        body('comment').optional().trim().isLength({ min: 50, max: 1000 }).withMessage({ code: 'COMMENT_LENGTH_OPTIONAL', message: '心得請填寫 50-1000 字' }),
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
                return res.status(404).json(errorResponse('REVIEW_NOT_FOUND', '評價不存在'));
            }

            // 檢查權限（只有評價者本人可以修改）
            if (review.userId !== req.user.id) {
                return res.status(403).json(errorResponse('NO_PERMISSION_EDIT', '無權修改此評價'));
            }

            // 更新評價
            const updates = {};
            const allowedFields = ['quality', 'difficulty', 'sweetness', 'usefulness', 'courseContent', 'teachingMethod', 'assignmentExamFormat', 'gradingBreakdown', 'comment', 'isAnonymous'];

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
            res.status(500).json(errorResponse('UPDATE_FAILED', '更新評價失敗'));
        }
    }
);

// 刪除評價（評價者本人或管理員）
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const review = await CourseReview.findByPk(req.params.id);

        if (!review) {
            return res.status(404).json(errorResponse('REVIEW_NOT_FOUND', '評價不存在'));
        }

        // 檢查權限
        if (review.userId !== req.user.id && !hasAdminAccess(req.user)) {
            return res.status(403).json(errorResponse('NO_PERMISSION_DELETE', '無權刪除此評價'));
        }

        await review.destroy();

        res.json({ message: '評價已刪除' });
    } catch (error) {
        console.error('刪除評價錯誤:', error);
        res.status(500).json(errorResponse('DELETE_FAILED', '刪除評價失敗'));
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
        res.status(500).json(errorResponse('FETCH_FAILED', '取得評價失敗'));
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
        res.status(500).json(errorResponse('FETCH_LIST_FAILED', '取得評價列表失敗'));
    }
});

// 審核評價（核准或拒絕，管理員）
router.patch('/:id/status',
    authenticateToken,
    requireAdmin,
    [
        body('status').isIn(['approved', 'rejected']).withMessage({ code: 'STATUS_INVALID', message: '狀態須為 approved 或 rejected' }),
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
                return res.status(400).json(errorResponse('REJECT_REASON_REQUIRED', '拒絕時請填寫拒絕原因'));
            }

            const review = await CourseReview.findByPk(req.params.id);

            if (!review) {
                return res.status(404).json(errorResponse('REVIEW_NOT_FOUND', '評價不存在'));
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
            res.status(500).json(errorResponse('REVIEW_STATUS_UPDATE_FAILED', '審核評價失敗'));
        }
    }
);

module.exports = router;
