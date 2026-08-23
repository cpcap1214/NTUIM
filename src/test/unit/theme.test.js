// 主題的響應式字級。
//
// 標題字級原本是寫死的單一數值（h1 = 2.5rem 不分螢幕），40px 的中文標題
// 在 375px 寬會斷成好幾行。改在主題處理而不是逐頁加 sx，是因為字級屬於
// 設計語言：散在各頁的話，下一個人新增頁面時不會知道要補這一段。
//
// 這條測試釘住「有做」而不是釘住具體數值——數值是設計決定，可以調；
// 但「手機上有縮一級」這件事不該被無聲拿掉。

import theme from '../../main/js/theme';

// createTheme 的預設 md 斷點是 900px
const MD_QUERY = '@media (min-width:900px)';

describe('主題的響應式字級', () => {
    test.each(['h1', 'h2', 'h3'])('%s 在 md 以上會放大', (variant) => {
        const style = theme.typography[variant];

        expect(style.fontSize).toBeDefined();
        expect(style[MD_QUERY]).toBeDefined();
        expect(style[MD_QUERY].fontSize).toBeDefined();

        const toPx = (rem) => parseFloat(rem) * 16;
        expect(toPx(style[MD_QUERY].fontSize)).toBeGreaterThan(toPx(style.fontSize));
    });

    // h4 以下本來就不大（1.25rem 以下），手機上不需要再縮
    test.each(['h4', 'h5', 'h6'])('%s 維持單一字級', (variant) => {
        expect(theme.typography[variant][MD_QUERY]).toBeUndefined();
    });
});
