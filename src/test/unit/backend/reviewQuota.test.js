// 回饋金名額的核心邏輯。
//
// 這是後端的檔案，但在前端的測試套件裡跑：src/backend 底下沒有任何 jest 設定，
// 而 CRA 的 runner 會把 src/ 底下所有 *.test.js 掃進來。reviewQuota.js 刻意寫成
// 零依賴（不碰 sequelize / sqlite3），就是為了能這樣被 require 進來測。
const {
    QUOTA_LIMITS,
    normalizeRequirement,
    isImTargetAudience,
    isCommonCore,
    resolveTier,
    limitForTier,
    catalogRowRank,
    computeUsage,
    rankEligible,
} = require('../../../backend/config/reviewQuota');

describe('normalizeRequirement', () => {
    // 實測 NOL 的「必/選修」欄只有這三種值（另有空白）。
    test('「必帶」算必修——資管系的核心必修全部是這個值', () => {
        // IM1010 資料結構與進階程式設計、IM2003 作業系統、IM2008 資訊管理導論、
        // IM3007 系統分析與設計 在 NOL 上都標「必帶」。若這條掛掉，整套系必修會
        // 靜默降級成「其他」（1 名），而且畫面上完全看不出異常。
        expect(normalizeRequirement('必帶')).toBe('required');
    });

    test('「必修」算必修', () => {
        expect(normalizeRequirement('必修')).toBe('required');
    });

    test('「選修」與「選帶」算選修', () => {
        expect(normalizeRequirement('選修')).toBe('elective');
        expect(normalizeRequirement('選帶')).toBe('elective');
    });

    test('去掉全形與半形空白後再判斷', () => {
        expect(normalizeRequirement('　必修 ')).toBe('required');
        expect(normalizeRequirement(' 選 修 ')).toBe('elective');
    });

    test('空值與認不出來的字串一律回 null', () => {
        expect(normalizeRequirement('')).toBeNull();
        expect(normalizeRequirement('   ')).toBeNull();
        expect(normalizeRequirement(null)).toBeNull();
        expect(normalizeRequirement(undefined)).toBeNull();
        expect(normalizeRequirement('不明字串')).toBeNull();
    });
});

describe('isImTargetAudience', () => {
    test('大學部的「資管系」', () => {
        expect(isImTargetAudience('資管系')).toBe(true);
        expect(isImTargetAudience('資管系1')).toBe(true);
    });

    test('研究所的「資訊管理所」——不含「資管」二字', () => {
        // 只比對「資管」會把整個研究所漏掉，全部掉到「其他」（1 名）。
        expect(isImTargetAudience('資訊管理所')).toBe(true);
        expect(isImTargetAudience('資訊管理學系')).toBe(true);
    });

    test('其他系所一律 false', () => {
        expect(isImTargetAudience('資工系')).toBe(false);
        expect(isImTargetAudience('電機系')).toBe(false);
        expect(isImTargetAudience('工管系')).toBe(false);
    });

    test('空值一律 false', () => {
        expect(isImTargetAudience('')).toBe(false);
        expect(isImTargetAudience(null)).toBe(false);
        expect(isImTargetAudience(undefined)).toBe(false);
    });
});

describe('isCommonCore', () => {
    test('Common 開頭的課號是校訂必修', () => {
        expect(isCommonCore('Common1012')).toBe(true);
        expect(isCommonCore('common 2001')).toBe(true);
        expect(isCommonCore('COMMON3005')).toBe(true);
    });

    test('系上與外系的課號不是', () => {
        expect(isCommonCore('IM2008')).toBe(false);
        expect(isCommonCore('MATH4008')).toBe(false);
        expect(isCommonCore('')).toBe(false);
        expect(isCommonCore(null)).toBe(false);
    });
});

describe('resolveTier', () => {
    test('資管系 + 必修 → 系上必修', () => {
        expect(resolveTier({ courseCode: 'IM2008', requirement: 'required', isImTarget: true }))
            .toBe('imRequired');
    });

    test('資管系 + 選修 → 系上選修', () => {
        expect(resolveTier({ courseCode: 'IM5061', requirement: 'elective', isImTarget: true }))
            .toBe('imElective');
    });

    test('外系開給資管的系訂必修仍算系上必修', () => {
        // 微積分、會計學原理、統計學這類課，學生是真的非修不可。
        expect(resolveTier({ courseCode: 'MATH4008', requirement: 'required', isImTarget: true }))
            .toBe('imRequired');
    });

    test('校訂必修即使被列為資管必修，也降到其他', () => {
        // 國文、外文、體育這些全校都在修，不該吃掉系學會的名額。
        expect(resolveTier({ courseCode: 'Common1012', requirement: 'required', isImTarget: true }))
            .toBe('other');
    });

    // 下面三條共同守著同一個不變式：未知絕不能被當成系上必修。
    test('修別未知（爬蟲還沒抓過）→ 其他', () => {
        expect(resolveTier({ courseCode: 'IM2008', requirement: null, isImTarget: true }))
            .toBe('other');
    });

    test('非資管的課即使是必修 → 其他', () => {
        expect(resolveTier({ courseCode: 'EE1001', requirement: 'required', isImTarget: false }))
            .toBe('other');
    });

    test('完全沒有資料 → 其他', () => {
        expect(resolveTier({ courseCode: 'IM2008', requirement: null, isImTarget: null }))
            .toBe('other');
        expect(resolveTier({})).toBe('other');
        expect(resolveTier()).toBe('other');
    });
});

describe('limitForTier', () => {
    test('三個級距的名額', () => {
        expect(limitForTier('imRequired')).toBe(3);
        expect(limitForTier('imElective')).toBe(2);
        expect(limitForTier('other')).toBe(1);
    });

    test('未知級距退回最小名額', () => {
        expect(limitForTier('nonsense')).toBe(QUOTA_LIMITS.other);
        expect(limitForTier(undefined)).toBe(QUOTA_LIMITS.other);
    });
});

describe('catalogRowRank', () => {
    test('資管必修 > 資管選修 > 資管未知 > 非資管', () => {
        // 全序才能讓爬蟲的合併結果與分頁順序無關，重跑才會一致。
        const imRequired = catalogRowRank({ requirement: 'required', isImTarget: true });
        const imElective = catalogRowRank({ requirement: 'elective', isImTarget: true });
        const imUnknown = catalogRowRank({ requirement: null, isImTarget: true });
        const notIm = catalogRowRank({ requirement: 'required', isImTarget: false });

        expect(imRequired).toBeGreaterThan(imElective);
        expect(imElective).toBeGreaterThan(imUnknown);
        expect(imUnknown).toBeGreaterThan(notIm);
    });
});

describe('computeUsage', () => {
    test('一般情況', () => {
        expect(computeUsage({ total: 2, sticky: 0, limit: 3 })).toEqual({ used: 2, remaining: 1 });
    });

    test('沒有任何評價', () => {
        expect(computeUsage({ total: 0, sticky: 0, limit: 3 })).toEqual({ used: 0, remaining: 3 });
    });

    test('額滿', () => {
        expect(computeUsage({ total: 3, sticky: 0, limit: 3 })).toEqual({ used: 3, remaining: 0 });
    });

    test('舊資料超額時誠實回報，不夾到上限', () => {
        // 上線前就有 5 篇（全部 quota_exempt）的必修課要顯示 5/3，
        // 夾成 3/3 會讓使用者看不出這門課有多滿。
        expect(computeUsage({ total: 5, sticky: 5, limit: 3 })).toEqual({ used: 5, remaining: 0 });
    });

    test('sticky 少於上限時，仍以實際筆數為準', () => {
        expect(computeUsage({ total: 6, sticky: 1, limit: 3 })).toEqual({ used: 3, remaining: 0 });
    });
});

describe('rankEligible', () => {
    const day = (n) => new Date(`2026-01-${String(n).padStart(2, '0')}T00:00:00Z`);
    const review = (props) => ({ status: 'pending', isPaid: false, quotaExempt: false, requeuedAt: null, ...props });

    test('先到先得，超出名額的沒有資格', () => {
        const eligible = rankEligible([
            review({ id: 3, createdAt: day(3) }),
            review({ id: 1, createdAt: day(1) }),
            review({ id: 2, createdAt: day(2) }),
        ], 2);

        expect([...eligible].sort()).toEqual([1, 2]);
    });

    test('已發放的評價即使超出名額仍具資格——發出去的錢不追溯作廢', () => {
        const eligible = rankEligible([
            review({ id: 1, createdAt: day(1) }),
            review({ id: 2, createdAt: day(2) }),
            review({ id: 3, createdAt: day(3), isPaid: true, status: 'approved' }),
        ], 1);

        expect(eligible.has(3)).toBe(true);
    });

    test('規則生效前的評價（quota_exempt）即使超出名額仍具資格', () => {
        const eligible = rankEligible([
            review({ id: 1, createdAt: day(5), quotaExempt: true }),
            review({ id: 2, createdAt: day(6), quotaExempt: true }),
            review({ id: 3, createdAt: day(7), quotaExempt: true }),
        ], 1);

        expect([...eligible].sort()).toEqual([1, 2, 3]);
    });

    test('已拒絕的評價不佔名額', () => {
        const eligible = rankEligible([
            review({ id: 1, createdAt: day(1), status: 'rejected' }),
            review({ id: 2, createdAt: day(2) }),
        ], 1);

        expect(eligible.has(1)).toBe(false);
        expect(eligible.has(2)).toBe(true);
    });

    test('「已拒絕卻仍標記為已發放」的殘留列也不佔名額', () => {
        // PATCH /:id/status 拒絕評價時不會清 is_paid（既有的舊 bug），
        // 資料庫裡可能留著這種列。它不該永久佔住一門課的名額。
        const eligible = rankEligible([
            review({ id: 1, createdAt: day(1), status: 'rejected', isPaid: true }),
            review({ id: 2, createdAt: day(2) }),
        ], 1);

        expect(eligible.has(1)).toBe(false);
        expect(eligible.has(2)).toBe(true);
    });

    test('被拒後重送的評價排到隊伍後面，不會擠掉已核准的人', () => {
        // 1/1 A 投稿 → 1/3 A 被拒 → 1/6 B 投稿並核准 → 1/10 A 改好重送。
        // 沒有 requeued_at 的話 A 會用 1/1 的時間插到最前面，把 B 擠出名額。
        const eligible = rankEligible([
            review({ id: 1, createdAt: day(1), requeuedAt: day(10) }),
            review({ id: 2, createdAt: day(6), status: 'approved' }),
        ], 1);

        expect(eligible.has(2)).toBe(true);
        expect(eligible.has(1)).toBe(false);
    });

    test('created_at 相同時用 id 決定先後', () => {
        const eligible = rankEligible([
            review({ id: 9, createdAt: day(1) }),
            review({ id: 4, createdAt: day(1) }),
        ], 1);

        expect([...eligible]).toEqual([4]);
    });

    test('空清單不會爆', () => {
        expect(rankEligible([], 3).size).toBe(0);
        expect(rankEligible(null, 3).size).toBe(0);
        expect(rankEligible(undefined, 3).size).toBe(0);
    });
});
