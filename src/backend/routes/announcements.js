const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Op, literal } = require('sequelize');
const { Announcement, AnnouncementDismissal, User } = require('../models');
const { optionalAuth, authenticateToken, requirePermission } = require('../middleware/auth');

// 「目前生效中」的條件。三個獨立的判斷：
//   enabled     —— 管理員的總開關
//   publish_at  —— NULL 或已經到了
//   expire_at   —— NULL 或還沒到
// NULL 一律視為「該側不限制」，所以兩個時間都不填就是永久生效。
const activeWhere = () => {
    const now = new Date();
    return {
        enabled: true,
        [Op.and]: [
            { [Op.or]: [{ publishAt: null }, { publishAt: { [Op.lte]: now } }] },
            { [Op.or]: [{ expireAt: null }, { expireAt: { [Op.gt]: now } }] }
        ]
    };
};

// 送給前台的欄位。刻意不含 enabled / createdBy 這些後台才需要的資訊。
const toPublicJSON = (a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    level: a.level,
    // ISO 8601（UTC）。前端要顯示成本地時間自行轉換。
    createdAt: a.createdAt
});

// ---------------------------------------------------------------------------
// 前台端點
// ---------------------------------------------------------------------------

// 生效中的公告 + 這個人已經關掉哪些。
//
// 公開端點：訪客同樣看得到公告。未登入時 dismissedIds 回空陣列，
// 由前端用 localStorage 補上那一半——訪客沒有帳號可以綁記錄。
router.get('/active', optionalAuth, async (req, res) => {
    try {
        const announcements = await Announcement.findAll({
            where: activeWhere(),
            // important 先出現，其次才是新的在前
            order: [
                [literal("CASE WHEN level = 'important' THEN 0 ELSE 1 END"), 'ASC'],
                ['created_at', 'DESC']
            ]
        });

        let dismissedIds = [];
        if (req.user) {
            const rows = await AnnouncementDismissal.findAll({
                where: { userId: req.user.id },
                attributes: ['announcementId']
            });
            dismissedIds = rows.map((r) => r.announcementId);
        }

        res.json({ data: announcements.map(toPublicJSON), dismissedIds });
    } catch (error) {
        console.error('取得公告錯誤:', error);
        res.status(500).json({ error: '取得公告失敗', errorCode: 'FETCH_ANNOUNCEMENTS_FAILED' });
    }
});

// 標記「不要再提醒」。只有登入者會走到這裡；訪客只寫 localStorage。
router.post('/:id/dismiss', authenticateToken, async (req, res) => {
    try {
        const announcement = await Announcement.findByPk(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: '公告不存在', errorCode: 'ANNOUNCEMENT_NOT_FOUND' });
        }

        // 複合主鍵已擋掉重複，findOrCreate 讓重送不會噴 constraint 錯誤
        await AnnouncementDismissal.findOrCreate({
            where: { announcementId: announcement.id, userId: req.user.id },
            defaults: { announcementId: announcement.id, userId: req.user.id }
        });

        res.json({ message: '已標記為不再提醒' });
    } catch (error) {
        console.error('標記公告錯誤:', error);
        res.status(500).json({ error: '標記公告失敗', errorCode: 'DISMISS_ANNOUNCEMENT_FAILED' });
    }
});

// ---------------------------------------------------------------------------
// 管理端點（需 announcements.manage）
// ---------------------------------------------------------------------------

const manageOnly = [authenticateToken, requirePermission('announcements.manage')];

const validators = [
    body('title').trim().isLength({ min: 1, max: 200 })
        .withMessage({ code: 'ANNOUNCEMENT_TITLE_REQUIRED', message: '公告標題為必填，且不超過 200 字' }),
    body('body').trim().notEmpty()
        .withMessage({ code: 'ANNOUNCEMENT_BODY_REQUIRED', message: '公告內容為必填' }),
    body('level').optional().isIn(['info', 'important'])
        .withMessage({ code: 'ANNOUNCEMENT_LEVEL_INVALID', message: '公告層級無效' }),
    body('enabled').optional().isBoolean(),
    body('publishAt').optional({ nullable: true, checkFalsy: true }).isISO8601()
        .withMessage({ code: 'ANNOUNCEMENT_TIME_INVALID', message: '上架時間格式無效' }),
    body('expireAt').optional({ nullable: true, checkFalsy: true }).isISO8601()
        .withMessage({ code: 'ANNOUNCEMENT_TIME_INVALID', message: '下架時間格式無效' })
];

// 從請求取出要寫入的欄位。空字串一律轉成 null——
// 前端清空 datetime-local 時送的是 ''，直接存進去會變成無效日期。
const pickFields = (payload) => ({
    title: payload.title.trim(),
    body: payload.body.trim(),
    level: payload.level || 'info',
    enabled: payload.enabled === undefined ? true : Boolean(payload.enabled),
    publishAt: payload.publishAt ? new Date(payload.publishAt) : null,
    expireAt: payload.expireAt ? new Date(payload.expireAt) : null
});

// 下架時間早於上架時間的公告永遠不會出現，而且畫面上完全看不出原因，
// 所以在寫入前就擋掉。
const windowInvalid = (fields) =>
    fields.publishAt && fields.expireAt && fields.expireAt <= fields.publishAt;

// 全部公告（含停用與已過期），給後台列表用
router.get('/', ...manageOnly, async (req, res) => {
    try {
        const announcements = await Announcement.findAll({
            include: [{ model: User, as: 'author', attributes: ['id', 'username', 'fullName'] }],
            order: [['created_at', 'DESC']]
        });
        res.json({ data: announcements });
    } catch (error) {
        console.error('取得公告清單錯誤:', error);
        res.status(500).json({ error: '取得公告清單失敗', errorCode: 'FETCH_ANNOUNCEMENTS_FAILED' });
    }
});

router.post('/', ...manageOnly, validators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const fields = pickFields(req.body);
        if (windowInvalid(fields)) {
            return res.status(400).json({ error: '下架時間必須晚於上架時間', errorCode: 'ANNOUNCEMENT_INVALID_WINDOW' });
        }

        const announcement = await Announcement.create({ ...fields, createdBy: req.user.id });
        res.status(201).json({ message: '公告已建立', data: announcement });
    } catch (error) {
        console.error('建立公告錯誤:', error);
        res.status(500).json({ error: '建立公告失敗', errorCode: 'CREATE_ANNOUNCEMENT_FAILED' });
    }
});

router.put('/:id', ...manageOnly, validators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const announcement = await Announcement.findByPk(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: '公告不存在', errorCode: 'ANNOUNCEMENT_NOT_FOUND' });
        }

        const fields = pickFields(req.body);
        if (windowInvalid(fields)) {
            return res.status(400).json({ error: '下架時間必須晚於上架時間', errorCode: 'ANNOUNCEMENT_INVALID_WINDOW' });
        }

        await announcement.update(fields);
        res.json({ message: '公告已更新', data: announcement });
    } catch (error) {
        console.error('更新公告錯誤:', error);
        res.status(500).json({ error: '更新公告失敗', errorCode: 'UPDATE_ANNOUNCEMENT_FAILED' });
    }
});

router.delete('/:id', ...manageOnly, async (req, res) => {
    try {
        const announcement = await Announcement.findByPk(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: '公告不存在', errorCode: 'ANNOUNCEMENT_NOT_FOUND' });
        }

        // dismissals 靠 ON DELETE CASCADE 一併清掉，不必手動刪
        await announcement.destroy();
        res.json({ message: '公告已刪除' });
    } catch (error) {
        console.error('刪除公告錯誤:', error);
        res.status(500).json({ error: '刪除公告失敗', errorCode: 'DELETE_ANNOUNCEMENT_FAILED' });
    }
});

module.exports = router;
