const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Feedback } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { feedbackLimiter } = require('../middleware/rateLimits');

const errorResponse = (errorCode, message) => ({ error: message, errorCode });

const CATEGORIES = ['bug', 'suggestion', 'other'];
const STATUSES = ['new', 'read', 'resolved'];

// ---------------------------------------------------------------------------
// 送出回饋（需登入，但不記錄是誰）
// ---------------------------------------------------------------------------
//
// 要求登入是為了擋掉沒有帳號的洪水、並以帳號為單位限流；
// req.user 只被限流器用來當計數的 key，「從不」寫進資料庫。
// 見 migrations/010_create_feedback.sql 的說明。
router.post('/',
    authenticateToken,
    // 必須在 authenticateToken 之後，否則 req.user 還不存在，限流會退化成 IP 模式
    feedbackLimiter,
    [
        body('body').trim().isLength({ min: 10, max: 2000 })
            .withMessage({ code: 'FEEDBACK_BODY_REQUIRED', message: '回饋內容為必填，請填寫 10-2000 字' }),
        body('category').optional().isIn(CATEGORIES)
            .withMessage({ code: 'FEEDBACK_CATEGORY_INVALID', message: '回饋分類無效' })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            await Feedback.create({
                body: req.body.body.trim(),
                category: req.body.category || 'other'
                // 這裡沒有 userId，也不該有
            });

            // 刻意「不」回傳建立出來的資料列。回傳 id 等於給出一條把後台某一筆
            // 對回「剛才是誰送的」的線索——送出者的瀏覽器與伺服器日誌都會留下那個 id。
            res.status(201).json({ message: '已收到您的回饋，謝謝！' });
        } catch (error) {
            console.error('建立回饋錯誤:', error);
            res.status(500).json(errorResponse('CREATE_FEEDBACK_FAILED', '送出回饋失敗'));
        }
    }
);

// ---------------------------------------------------------------------------
// 管理端點（需 feedback.manage）
// ---------------------------------------------------------------------------

const manageOnly = [authenticateToken, requirePermission('feedback.manage')];

router.get('/', ...manageOnly, async (req, res) => {
    try {
        const where = {};
        if (req.query.status && STATUSES.includes(req.query.status)) {
            where.status = req.query.status;
        }
        if (req.query.category && CATEGORIES.includes(req.query.category)) {
            where.category = req.query.category;
        }

        const feedback = await Feedback.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: 500
        });

        // 這張表沒有任何使用者欄位可以外洩，所以整列直接回傳是安全的
        res.json({ data: feedback });
    } catch (error) {
        console.error('取得回饋清單錯誤:', error);
        res.status(500).json(errorResponse('FETCH_FEEDBACK_FAILED', '取得回饋清單失敗'));
    }
});

// 更新狀態或管理員備註
router.patch('/:id', ...manageOnly, [
    body('status').optional().isIn(STATUSES)
        .withMessage({ code: 'FEEDBACK_STATUS_INVALID', message: '回饋狀態無效' }),
    body('adminNote').optional({ nullable: true }).isLength({ max: 2000 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const feedback = await Feedback.findByPk(req.params.id);
        if (!feedback) {
            return res.status(404).json(errorResponse('FEEDBACK_NOT_FOUND', '找不到這筆回饋'));
        }

        // 只允許改這兩個欄位，body 與 category 是使用者送出的原文，不該被後台竄改
        const updates = {};
        if (req.body.status !== undefined) updates.status = req.body.status;
        if (req.body.adminNote !== undefined) updates.adminNote = req.body.adminNote;

        await feedback.update(updates);
        res.json({ message: '回饋已更新', data: feedback });
    } catch (error) {
        console.error('更新回饋錯誤:', error);
        res.status(500).json(errorResponse('UPDATE_FEEDBACK_FAILED', '更新回饋失敗'));
    }
});

router.delete('/:id', ...manageOnly, async (req, res) => {
    try {
        const feedback = await Feedback.findByPk(req.params.id);
        if (!feedback) {
            return res.status(404).json(errorResponse('FEEDBACK_NOT_FOUND', '找不到這筆回饋'));
        }

        await feedback.destroy();
        res.json({ message: '回饋已刪除' });
    } catch (error) {
        console.error('刪除回饋錯誤:', error);
        res.status(500).json(errorResponse('DELETE_FEEDBACK_FAILED', '刪除回饋失敗'));
    }
});

module.exports = router;
