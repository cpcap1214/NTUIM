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
// 模糊比對課程名稱/教授/課號。
// 只回傳「期末考已結束」學期的課程——還不能評價的學期直接不出現在選單裡。
//
// year + semester 兩者都給時只搜該學年期（表單的主要流程是「先選學期、再搜該學期的課」）；
// 都不給時搜所有可填學期，供表單的「全部」選項使用。
router.get('/search', [
    query('q').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 30 }),
    query('year').optional().isInt({ min: 1911 }),
    query('semester').optional().isIn(['1', '2', 'summer'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { q, limit = 15, year, semester } = req.query;
        const keyword = `%${q}%`;
        const reviewableTerms = listReviewableTerms();

        if (reviewableTerms.length === 0) {
            return res.json({ data: [] });
        }

        // 指定了學年期就縮到那一個。找不到就回 400，不可以退回「當作全部」——
        // 那會讓前端「不可填的學期不出現在選單」這條限制形同虛設，
        // 使用者能靠自己組網址搜到期末考還沒結束的學期。
        let terms = reviewableTerms;
        if (year !== undefined && semester !== undefined) {
            const matched = reviewableTerms.find(
                (term) => term.year === parseInt(year, 10) && term.semester === semester
            );
            if (!matched) {
                return res.status(400).json({
                    error: '該學年期尚不可填寫評價',
                    errorCode: 'TERM_NOT_REVIEWABLE'
                });
            }
            terms = [matched];
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
                        [Op.or]: terms.map((term) => ({
                            year: term.year,
                            semester: term.semester
                        }))
                    }
                ]
            },
            // 按「課程」分組而不是「學期優先」。原本是 year DESC, semester DESC，
            // 配合 limit 會讓最新學期先填滿名額、較舊學期被擠掉：
            // 實測搜「邏輯」共 28 筆，114-2 的 12 筆先佔滿，114-1 的 16 筆只分到 3 筆。
            // 改成這個排序後，同一門課的不同學期會相鄰出現，兩個學期都看得到。
            order: [
                ['courseName', 'ASC'],
                ['courseCode', 'ASC'],
                ['professor', 'ASC'],
                ['year', 'DESC'],
                // 字串遞減剛好等於時序遞減（'summer' > '2' > '1'），不需要額外的排序表
                ['semester', 'DESC']
            ],
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
