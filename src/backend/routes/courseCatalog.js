const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { CourseCatalog } = require('../models');
const { Op } = require('sequelize');
const { listReviewableTerms } = require('../utils/semesterEligibility');

// 可填寫評價的學年期（公開）：期末考已結束的學期才可填，給前端「學年期」下拉選單用
router.get('/reviewable-terms', (req, res) => {
    try {
        res.json({ data: listReviewableTerms() });
    } catch (error) {
        console.error('取得可填寫學年期錯誤:', error);
        res.status(500).json({ error: '取得可填寫學年期失敗', errorCode: 'FETCH_FAILED' });
    }
});

// 課程目錄搜尋（公開）：給「寫課程評價」表單的課程名稱自動完成下拉選單用，
// 模糊比對課程名稱/教授/課號，最近學期優先排序。
// 只回傳「期末考已結束」學期的課程——還不能評價的學期直接不出現在選單裡。
router.get('/search', [
    query('q').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 30 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { q, limit = 15 } = req.query;
        const keyword = `%${q}%`;
        const reviewableTerms = listReviewableTerms();

        if (reviewableTerms.length === 0) {
            return res.json({ data: [] });
        }

        const rows = await CourseCatalog.findAll({
            where: {
                [Op.and]: [
                    {
                        [Op.or]: [
                            { courseName: { [Op.like]: keyword } },
                            { professor: { [Op.like]: keyword } },
                            { courseCode: { [Op.like]: keyword } }
                        ]
                    },
                    {
                        [Op.or]: reviewableTerms.map((term) => ({
                            year: term.year,
                            semester: term.semester
                        }))
                    }
                ]
            },
            order: [['year', 'DESC'], ['semester', 'DESC']],
            limit: parseInt(limit),
            attributes: ['courseCode', 'courseName', 'professor', 'year', 'semester']
        });

        res.json({ data: rows });
    } catch (error) {
        console.error('搜尋課程目錄錯誤:', error);
        res.status(500).json({ error: '搜尋課程目錄失敗', errorCode: 'FETCH_FAILED' });
    }
});

module.exports = router;
