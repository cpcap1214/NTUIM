const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const { CourseReview, User, Course, CourseCatalog } = require('../models');
const { authenticateToken, requirePermission, isOwnerOrHasPermission } = require('../middleware/auth');
const { reviewWriteLimiter } = require('../middleware/rateLimits');
const { Op } = require('sequelize');
const sequelize = require('../models').sequelize;
const { isTermReviewable } = require('../utils/semesterEligibility');
const {
    getQuotaForCourses,
    getEligibleReviewIds,
    isPayoutEligible,
    quotaKey
} = require('../services/reviewQuotaService');

// 一個帳號的評價總量上限。
//
// 限流只管「速率」，擋不住「每小時 10 筆、連續跑一個月」這種慢速洗版。
// 100 筆遠高於任何真人四年修課的數量（一學期 6~8 門，四年約 50~60 門）。
const MAX_REVIEWS_PER_USER = 100;

// 送出的課程必須真的存在於課程目錄。
//
// 這是擋洗版最關鍵的一層：course_reviews 的 UNIQUE 約束是
// (course_code, professor, year, semester, user_id)，但 courseCode 與 professor
// 原本只驗證「非空字串」——攻擊者控制了複合鍵裡的兩個欄位，把 courseCode 遞增
// 就能無限新增，UNIQUE 完全形同虛設。
//
// 前端的 WriteReviewDialog 本來就只能從課程目錄搜尋選課，所以這一層不會擋到正常流程。
const courseExistsInCatalog = async (courseCode, professor, year, semester) => {
    // 目錄整個是空的就不擋——正式環境若還沒跑過 scripts/fetchNtuCourses.js，
    // 硬性要求存在會讓「所有」評價都送不出去。這是刻意的降級：
    // 目錄一旦填好，這層防護就自動生效，不需要改任何程式碼。
    const total = await CourseCatalog.count();
    if (total === 0) return true;

    const found = await CourseCatalog.count({
        where: { courseCode, professor, year, semester }
    });
    return found > 0;
};

// 錯誤訊息一律回傳 errorCode，實際中文文字由前端 i18n 語言檔（src/main/js/i18n/locales/zh-TW.js
// 的 errors 區塊）負責翻譯；error 欄位保留中文純文字作為未支援 i18n 的舊客戶端 fallback。
const errorResponse = (errorCode, message) => ({ error: message, errorCode });

// 幫一批評價補上回饋金名額狀態（payoutEligible / quotaTier / quotaLimit / quotaUsed）。
//
// 名額資格是每次即時算的，沒有存在資料庫裡——存旗標就得在五條寫入路徑上同步維護，
// 而這個 codebase 已經證明會漏掉其中一條（拒絕已發放的評價時不清 is_paid）。
// 詳細理由見 config/reviewQuota.js 的說明。
//
// 兩條查詢（名額用量、資格排名）攤在整批上，與筆數無關。
const withQuota = async (reviews) => {
    const rows = reviews.map((r) => (typeof r.toJSON === 'function' ? r.toJSON() : r));
    if (rows.length === 0) return rows;

    const keys = rows.map((r) => ({
        courseCode: r.courseCode,
        professor: r.professor,
        year: r.year,
        semester: r.semester
    }));

    const [quotas, eligibleIds] = await Promise.all([
        getQuotaForCourses(keys),
        getEligibleReviewIds(keys)
    ]);

    return rows.map((row) => ({
        ...row,
        payoutEligible: eligibleIds.has(row.id),
        ...quotas.get(quotaKey(row))
    }));
};

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
    // 必須在 authenticateToken 之後：限流以 req.user.id 計數，掛在前面會退化成 IP 模式
    reviewWriteLimiter,
    [
        body('courseCode').trim().notEmpty().withMessage({ code: 'COURSE_CODE_REQUIRED', message: '課號為必填' }),
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

            // 該學期的期末考還沒結束就不能評價（前端已經濾掉這些學期，這裡是後端把關）
            if (!isTermReviewable(year, semester)) {
                return res.status(400).json(errorResponse('TERM_NOT_REVIEWABLE', '該學期的期末考尚未結束，還不能填寫評價'));
            }

            // 課程必須存在於課程目錄——沒有這層，UNIQUE 約束擋不住任何洗版（見檔案上方說明）
            if (!(await courseExistsInCatalog(courseCode, professor, year, semester))) {
                return res.status(400).json(errorResponse('COURSE_NOT_IN_CATALOG', '找不到這門課程，請從搜尋結果中選擇'));
            }

            // 單一帳號的總量上限。限流管速率，這一層管累積總量。
            const reviewCount = await CourseReview.count({ where: { userId: req.user.id } });
            if (reviewCount >= MAX_REVIEWS_PER_USER) {
                return res.status(400).json(errorResponse('REVIEW_LIMIT_EXCEEDED', '您的評價數量已達上限'));
            }

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

            // 被拒絕後重新送出 = 重新排隊。
            //
            // 這一行承載了整個回饋金名額的排隊語意。上面那行把 status 打回 pending
            // 但不會動 created_at，沒有 requeued_at 的話會發生：
            //   1/1 A 投稿 → 1/3 A 被拒（名額釋出）→ 1/6 B 投稿並於 1/7 核准
            //   → 1/10 A 改好重送，A 用 1/1 的時間插到最前面，把 B 擠出名額
            // 已經被通知「已核准」的人因為第三者的編輯而失去回饋金，是最糟的失效模式。
            //
            // 只有 rejected → pending 算重新排隊；單純編輯已核准的評價不算，
            // 那種情況下位置本來就是他的。
            if (review.status === 'rejected') {
                updates.requeuedAt = new Date();
            }

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
        if (!isOwnerOrHasPermission(req, review.userId, 'courseReviews.moderate')) {
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

        // 附上回饋金名額狀態。少了這段，超出名額的作者只能靠「錢一直沒進來」
        // 才發現自己沒資格——那正是這個功能要避免的事。
        res.json(await withQuota(reviews));
    } catch (error) {
        console.error('取得我的評價錯誤:', error);
        res.status(500).json(errorResponse('FETCH_FAILED', '取得評價失敗'));
    }
});

// 取得評價列表供管理員審核/管理（管理員）
// 不帶 status 就回傳全部，帶 status 則只回傳該狀態（pending/approved/rejected）
router.get('/admin/reviews', authenticateToken, requirePermission('courseReviews.moderate'), [
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

// ---------------------------------------------------------------------------
// 回饋金發放（總務部或管理員）
//
// 注意：發放清單一律顯示投稿者的真實姓名與學號，即使該篇評價是匿名發表的——
// 匿名只是「不對外公開作者」，錢還是要發給本人，總務必須知道發放對象是誰。
// ---------------------------------------------------------------------------

// 發放狀態的三個值。pending 是「還沒處理」，declined 是「看過了，決定不發」——
// 兩者都不是「已發放」，但對總務的意義完全不同，不能混為一談。
const PAYOUT_STATUSES = ['pending', 'paid', 'declined'];

// payout_status 與 is_paid 一律在這裡一起寫入。
//
// is_paid 是 payout_status 的鏡像，只為了回滾相容而保留（見 migration 011）。
// 讓它們只有這一個寫入點，是為了讓「兩者不同步」在結構上不可能發生——
// 目前 is_paid 之所以會有殘留的錯誤資料，正是因為它散落在多個路徑各自寫入。
const applyPayoutStatus = (review, status, userId) => {
    const paid = status === 'paid';
    review.payoutStatus = status;
    review.isPaid = paid;
    // paid_at / paid_by 只對「已發放」有意義。改成未處理或不發放時一併清掉，
    // 不留下「沒發放卻有發放人」這種自相矛盾的列
    review.paidAt = paid ? new Date() : null;
    review.paidBy = paid ? userId : null;
};

// 取得回饋金發放清單：只列已核准的評價（未核准的沒有發放的意義）
router.get('/payouts', authenticateToken, requirePermission('courseReviews.payout'), [
    query('payoutStatus').optional().isIn(PAYOUT_STATUSES)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { payoutStatus } = req.query;
        const where = { status: 'approved' };
        if (payoutStatus) where.payoutStatus = payoutStatus;

        const reviews = await CourseReview.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['username', 'fullName', 'studentId', 'email']
                },
                {
                    model: User,
                    as: 'paidByUser',
                    attributes: ['username', 'fullName']
                }
            ],
            // 未處理的排最前面（待辦優先），再來是已發放、不發放；
            // 同狀態內舊的排前面（先投稿的先發）
            order: [
                [sequelize.literal(
                    "CASE payout_status WHEN 'pending' THEN 0 WHEN 'paid' THEN 1 ELSE 2 END"
                ), 'ASC'],
                ['created_at', 'ASC']
            ],
            attributes: [
                'id', 'courseCode', 'courseName', 'professor', 'year', 'semester',
                'isAnonymous', 'isPaid', 'payoutStatus', 'paidAt', 'created_at'
            ]
        });

        // 附上名額狀態，讓總務在按「發放」之前就看得出哪幾筆超額
        res.json({ data: await withQuota(reviews) });
    } catch (error) {
        console.error('取得發放清單錯誤:', error);
        res.status(500).json(errorResponse('FETCH_PAYOUTS_FAILED', '取得發放清單失敗'));
    }
});

// 匯出發放清單 CSV：總務習慣用試算表對帳/做轉帳批次，站上仍是唯一真相來源
router.get('/payouts/export', authenticateToken, requirePermission('courseReviews.payout'), async (req, res) => {
    try {
        const reviews = await CourseReview.findAll({
            where: { status: 'approved' },
            include: [
                { model: User, as: 'reviewer', attributes: ['fullName', 'studentId', 'email'] },
                { model: User, as: 'paidByUser', attributes: ['fullName'] }
            ],
            order: [
                [sequelize.literal(
                    "CASE payout_status WHEN 'pending' THEN 0 WHEN 'paid' THEN 1 ELSE 2 END"
                ), 'ASC'],
                ['created_at', 'ASC']
            ]
        });

        const escapeCsv = (value) => {
            const text = value === null || value === undefined ? '' : String(value);
            return `"${text.replace(/"/g, '""')}"`;
        };

        // 總務多半是在試算表上作業的，名額狀態沒進 CSV 等於沒有
        const eligibleIds = await getEligibleReviewIds(reviews.map((r) => ({
            courseCode: r.courseCode, professor: r.professor, year: r.year, semester: r.semester
        })));

        // 時間一律以台北時間、24 時制輸出。
        // 不指定 timeZone 的話印的是伺服器的當地時間——正式機通常跑 UTC，
        // 匯出的檔案會整批差 8 小時，而總務是拿這份去對帳的。
        const formatTaipei = (value) => (value
            ? new Date(value).toLocaleString('zh-TW', {
                timeZone: 'Asia/Taipei', hour12: false,
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            })
            : '');

        const PAYOUT_STATUS_LABELS = { pending: '未處理', paid: '已發放', declined: '不發放' };

        const header = ['評價ID', '姓名', '學號', 'Email', '課程名稱', '課號', '教授', '學年期', '投稿時間', '名額狀態', '發放狀態', '發放時間', '發放人'];
        const rows = reviews.map((review) => [
            review.id,
            review.reviewer?.fullName,
            review.reviewer?.studentId,
            review.reviewer?.email,
            review.courseName,
            review.courseCode,
            review.professor,
            `${review.year - 1911}-${review.semester}`,
            formatTaipei(review.created_at),
            eligibleIds.has(review.id) ? '名額內' : '超出名額',
            PAYOUT_STATUS_LABELS[review.payoutStatus] || '未處理',
            formatTaipei(review.paidAt),
            review.isPaid ? (review.paidByUser?.fullName || '') : ''
        ]);

        const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="course-review-payouts-${new Date().toISOString().slice(0, 10)}.csv"`);
        // BOM：讓 Excel 開啟時正確辨識 UTF-8，不會變成亂碼
        res.send(`﻿${csv}`);
    } catch (error) {
        console.error('匯出發放清單錯誤:', error);
        res.status(500).json(errorResponse('EXPORT_PAYOUTS_FAILED', '匯出發放清單失敗'));
    }
});

// 標記回饋金發放狀態（總務部或管理員）
router.patch('/:id/payout',
    authenticateToken,
    requirePermission('courseReviews.payout'),
    [body('payoutStatus').isIn(PAYOUT_STATUSES)
        .withMessage({ code: 'PAYOUT_STATUS_INVALID', message: '發放狀態須為未處理、已發放或不發放' })],
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

            // 只有已核准的評價才有回饋金
            if (review.status !== 'approved') {
                return res.status(400).json(errorResponse('PAYOUT_REQUIRES_APPROVED', '只有已核准的評價才能標記發放'));
            }

            const { payoutStatus } = req.body;

            // 超出回饋金名額的評價不能標記「已發放」。
            //
            // 只擋 paid 這一個方向。改成 pending 或 declined 永遠允許——
            // 「不發放」正是給超額評價用的結案動作，擋掉它會讓超額的評價
            // 永遠停在未處理，總務每次打開清單都得重新判斷同一批資料。
            //
            // 三個理由讓這個閘門是閘門而不是陷阱：
            //   1. 離開 paid 永遠允許，不會有評價被卡在無法操作的狀態
            //   2. quota_exempt 讓整批既有評價自動通過，上線當天不會突然有一堆發不出去
            //   3. 被擋只可能代表「有更早的非拒絕評價佔著名額」，那則一被審核
            //      （核准或拒絕都算）就自動解開，不會死鎖，所以不需要 override 機制
            if (payoutStatus === 'paid' && !review.isPaid && !(await isPayoutEligible(review))) {
                return res.status(400).json(errorResponse(
                    'PAYOUT_OVER_QUOTA',
                    '這門課的回饋金名額已滿，或有更早投稿的評價尚未審核完畢'
                ));
            }

            applyPayoutStatus(review, payoutStatus, req.user.id);
            await review.save();

            const messages = {
                paid: '已標記為已發放',
                declined: '已標記為不發放',
                pending: '已改回未處理'
            };
            res.json({
                message: messages[payoutStatus],
                data: review
            });
        } catch (error) {
            console.error('更新發放狀態錯誤:', error);
            res.status(500).json(errorResponse('PAYOUT_UPDATE_FAILED', '更新發放狀態失敗'));
        }
    }
);

// 審核評價（核准或拒絕，管理員）
router.patch('/:id/status',
    authenticateToken,
    requirePermission('courseReviews.moderate'),
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
