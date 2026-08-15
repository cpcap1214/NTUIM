const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { CourseCatalog, sequelize } = require('../models');
const { Op } = require('sequelize');
const { listReviewableTerms, isTermReviewable } = require('../utils/semesterEligibility');
const { getQuotaForCourses, quotaKey } = require('../services/reviewQuotaService');

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
    // 上限 200：熱門關鍵字的結果量被「同一門課多位教授」放大得很嚴重
    //（FL1008 英文一門就有 24 位教授、各佔一列），名額太小會讓整頁都是同一門課。
    query('limit').optional().isInt({ min: 1, max: 200 }),
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
            order: [
                // 相關性優先。少了這一段就是純字典序，會出現這種情形：
                // 搜「國文」符合 93 筆，前 15 筆卻全是「中世紀英國文學」「中國文學史」，
                // 而「大」(U+5927) 在 Unicode 排在「中初十國」之後，
                // 64 筆「大學國文」整批被擠出畫面，看起來就像資料缺漏。
                //
                // order 子句不吃 replacements，用 sequelize.escape 安全內嵌，不要自己拼字串。
                sequelize.literal(
                    `CASE WHEN course_name LIKE ${sequelize.escape(`${q}%`)} THEN 0`
                    + ` WHEN course_name LIKE ${sequelize.escape(keyword)} THEN 1`
                    + ' ELSE 2 END'
                ),
                // 以下維持「按課程分組」。原本是 year DESC 優先，配合 limit 會讓最新學期
                // 先填滿名額、較舊學期被擠掉（實測搜「邏輯」，114-1 的 16 筆只分到 3 筆）。
                // 這樣排同一門課的不同學期會相鄰出現，兩個學期都看得到。
                ['courseName', 'ASC'],
                ['courseCode', 'ASC'],
                ['professor', 'ASC'],
                ['year', 'DESC'],
                // 字串遞減剛好等於時序遞減（'summer' > '2' > '1'），不需要額外的排序表
                ['semester', 'DESC']
            ],
            limit: parseInt(limit),
            attributes: [
                'courseCode', 'courseName', 'professor', 'year', 'semester',
                // 名額級距要用的分類。不直接回傳給前端——前端拿到的是算好的 quotaTier
                'requirement', 'isImTarget'
            ],
            raw: true
        });

        // 回饋金名額。搜尋結果本身就是 catalog 列，所以級距不必再查一次資料庫，
        // 只需要一條 grouped query 去數評價數——整個端點固定兩條 SQL，與筆數無關。
        const quotas = await getQuotaForCourses(rows, rows);

        res.json({
            data: rows.map((row) => ({
                courseCode: row.courseCode,
                courseName: row.courseName,
                professor: row.professor,
                year: row.year,
                semester: row.semester,
                // quotaTier 是穩定的 enum（imRequired / imElective / other），
                // 中文由前端的 i18n 決定；後端不回傳給使用者看的文案
                ...quotas.get(quotaKey(row))
            }))
        });
    } catch (error) {
        console.error('搜尋課程目錄錯誤:', error);
        res.status(500).json({ error: '搜尋課程目錄失敗', errorCode: 'FETCH_FAILED' });
    }
});

// 單一課程的回饋金名額（公開）。
//
// /search 的每一列都已經帶名額了，這支是補「手動輸入課程」的洞：課程目錄裡沒有的課
// （或使用者不從下拉選單選、自己打課名的情況）在 /search 走不到，沒有這支端點的話
// 那些人完全看不到名額資訊，等於回到「投稿後才發現沒錢」。
router.get('/quota', [
    query('courseCode').isString().notEmpty(),
    query('professor').isString().notEmpty(),
    query('year').isInt({ min: 1911 }),
    query('semester').isIn(['1', '2', 'summer'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { courseCode, professor, semester } = req.query;
        const year = parseInt(req.query.year, 10);

        // 與 /search 同樣的把關：不可填寫的學期不給查，否則等於開一個側門
        if (!isTermReviewable(year, semester)) {
            return res.status(400).json({
                error: '該學年期尚不可填寫評價',
                errorCode: 'TERM_NOT_REVIEWABLE'
            });
        }

        const key = { courseCode, professor, year, semester };
        const quotas = await getQuotaForCourses([key]);

        res.json({ data: { ...key, ...quotas.get(quotaKey(key)) } });
    } catch (error) {
        console.error('取得課程名額錯誤:', error);
        res.status(500).json({ error: '取得課程名額失敗', errorCode: 'FETCH_FAILED' });
    }
});

module.exports = router;
