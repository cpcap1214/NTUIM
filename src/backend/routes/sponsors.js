const express = require('express');
const rateLimit = require('express-rate-limit');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const router = express.Router();
const creatives = ['easywallet-banner', 'easywallet-coupons', 'easywallet-details'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.post(
    '/events',
    rateLimit({ windowMs: 60000, max: 120, standardHeaders: true, legacyHeaders: false }),
    async (req, res, next) => {
        const { eventId, creativeId, type, visitorId, pageViewId } = req.body;
        if (
            !creatives.includes(creativeId) ||
            !['impression', 'open'].includes(type) ||
            ![eventId, visitorId, pageViewId].every(
                (value) => typeof value === 'string' && uuid.test(value),
            )
        ) {
            return res.status(400).json({ error: '無效的廣告事件' });
        }
        try {
            await sequelize.query(
                `INSERT OR IGNORE INTO sponsor_events
            (event_id, creative_id, event_type, visitor_id, page_view_id)
            VALUES (:eventId, :creativeId, :type, :visitorId, :pageViewId)`,
                {
                    replacements: { eventId, creativeId, type, visitorId, pageViewId },
                },
            );
            res.sendStatus(204);
        } catch (error) {
            next(error);
        }
    },
);

// Uses the existing announcement-management permission; no public analytics data.
router.get(
    '/stats',
    authenticateToken,
    requirePermission('announcements.manage'),
    async (req, res, next) => {
        const { from, to } = req.query;
        const validDate = (value) =>
            typeof value === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(value)) &&
            new Date(value).toISOString().slice(0, 10) === value;
        if (!validDate(from) || !validDate(to) || from > to)
            return res.status(400).json({ error: '請提供有效日期範圍' });
        // Report dates use Asia/Taipei, with an exclusive next-day boundary.
        const start = new Date(`${from}T00:00:00+08:00`).toISOString();
        const end = new Date(Date.parse(`${to}T00:00:00+08:00`) + 86400000).toISOString();
        const aggregate = `SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) AS impressions,
        COUNT(DISTINCT CASE WHEN event_type = 'impression' THEN visitor_id END) AS visitors,
        SUM(CASE WHEN event_type = 'open' THEN 1 ELSE 0 END) AS opens`;
        try {
            const options = { replacements: { start, end }, type: QueryTypes.SELECT };
            const rows = await sequelize.query(
                `SELECT creative_id AS id, ${aggregate} FROM sponsor_events
            WHERE created_at >= :start AND created_at < :end GROUP BY creative_id`,
                options,
            );
            const [total] = await sequelize.query(
                `SELECT ${aggregate} FROM sponsor_events
            WHERE created_at >= :start AND created_at < :end`,
                options,
            );
            res.json({
                creatives: creatives.map(
                    (id) =>
                        rows.find((row) => row.id === id) || {
                            id,
                            impressions: 0,
                            visitors: 0,
                            opens: 0,
                        },
                ),
                total: {
                    impressions: total.impressions || 0,
                    visitors: total.visitors,
                    opens: total.opens || 0,
                },
            });
        } catch (error) {
            next(error);
        }
    },
);
module.exports = router;
