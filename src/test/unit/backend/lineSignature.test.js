// LINE webhook 的簽章驗證與綁定碼規則。
//
// 簽章是這整個功能唯一的安全邊界：webhook 沒有登入、沒有 token，
// 任何人都能對 https://ntu.im/api/line/webhook 送 POST。驗簽是唯一能證明
// 請求真的來自 LINE 的東西——它一旦壞掉，壞法有兩種，兩種都不會有明顯症狀：
//   1. 永遠失敗 → bot 完全沒反應，看起來像 LINE 那邊沒設定好
//   2. 永遠通過 → 任何人都能偽造事件，把別人的 LINE 綁到自己帳號上
// 所以用測試釘住。

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SECRET = 'test-channel-secret';

// config/line.js 在載入時就讀環境變數，所以必須在 require 之前設好，
// 而且要用 jest.isolateModules 確保拿到的是重新載入的模組
const loadLine = (env = {}) => {
    let mod;
    jest.isolateModules(() => {
        const saved = { ...process.env };
        process.env.LINE_CHANNEL_SECRET = env.secret ?? SECRET;
        process.env.LINE_CHANNEL_ACCESS_TOKEN = env.token ?? 'test-token';
        // eslint-disable-next-line global-require
        mod = require('../../../backend/config/line');
        process.env = saved;
    });
    return mod;
};

const sign = (body, secret = SECRET) =>
    crypto.createHmac('sha256', secret).update(body).digest('base64');

describe('LINE webhook 簽章驗證', () => {
    const line = loadLine();
    const body = Buffer.from(JSON.stringify({ events: [{ type: 'message' }] }));

    test('正確的簽章通過', () => {
        expect(line.verifySignature(body, sign(body))).toBe(true);
    });

    test('body 改一個位元組就失敗', () => {
        const tampered = Buffer.from(body.toString().replace('message', 'follow!'));
        expect(line.verifySignature(tampered, sign(body))).toBe(false);
    });

    test('用別的 secret 簽的失敗', () => {
        expect(line.verifySignature(body, sign(body, 'wrong-secret'))).toBe(false);
    });

    test('簽章長度不對時失敗，而且不拋例外', () => {
        // crypto.timingSafeEqual 在長度不等時會丟 RangeError。
        // 沒先擋掉的話，一個隨手亂打的假簽章會變成 500 而不是 401。
        expect(() => line.verifySignature(body, 'YWJj')).not.toThrow();
        expect(line.verifySignature(body, 'YWJj')).toBe(false);
    });

    test('簽章不是合法 base64 時失敗，而且不拋例外', () => {
        expect(() => line.verifySignature(body, '!!!not-base64!!!')).not.toThrow();
        expect(line.verifySignature(body, '!!!not-base64!!!')).toBe(false);
    });

    test.each([[null], [undefined], ['']])('缺少簽章（%s）失敗', (sig) => {
        expect(line.verifySignature(body, sig)).toBe(false);
    });

    test('缺少 body 失敗', () => {
        expect(line.verifySignature(null, sign(body))).toBe(false);
    });

    test('未設定 secret 時一律失敗——不能因為沒設定就放行', () => {
        // 忘了填環境變數的部署，不該變成任何人都能偽造事件的公開端點
        const unset = loadLine({ secret: '' });
        expect(unset.verifySignature(body, sign(body))).toBe(false);
        expect(unset.isEnabled()).toBe(false);
    });

    test('兩個密鑰都有才算啟用', () => {
        expect(loadLine().isEnabled()).toBe(true);
        expect(loadLine({ token: '' }).isEnabled()).toBe(false);
        expect(loadLine({ secret: '' }).isEnabled()).toBe(false);
    });
});

describe('綁定碼', () => {
    const line = loadLine();

    test('長度固定為 8', () => {
        for (let i = 0; i < 50; i += 1) {
            expect(line.generateBindingCode()).toHaveLength(line.CODE_LENGTH);
        }
    });

    test('不含容易看錯或打錯的字元', () => {
        // 使用者要在手機上把這串字打進 LINE，0/O 與 1/I/l 混淆會變成客訴
        const confusing = /[0O1Il]/;
        expect(line.CODE_ALPHABET).not.toMatch(confusing);
        for (let i = 0; i < 200; i += 1) {
            expect(line.generateBindingCode()).not.toMatch(confusing);
        }
    });

    test('每次產生的碼不同（沒有退化成常數）', () => {
        const codes = new Set(Array.from({ length: 100 }, () => line.generateBindingCode()));
        expect(codes.size).toBeGreaterThan(90);
    });

    test('到期判定：未來為有效、過去為過期', () => {
        const now = Date.now();
        expect(line.isBindingCodeExpired(new Date(now + 60000), now)).toBe(false);
        expect(line.isBindingCodeExpired(new Date(now - 1), now)).toBe(true);
    });

    test('缺值或壞值一律視為過期——寧可要使用者重產，也不要放行不確定的碼', () => {
        expect(line.isBindingCodeExpired(null)).toBe(true);
        expect(line.isBindingCodeExpired(undefined)).toBe(true);
        expect(line.isBindingCodeExpired('not a date')).toBe(true);
    });

    test('bindingCodeExpiry 用的是設定的 TTL', () => {
        const from = Date.now();
        expect(line.bindingCodeExpiry(from).getTime() - from).toBe(line.CODE_TTL_MS);
    });

    test('比對前會正規化（去空白、轉大寫）', () => {
        // 使用者從網頁複製貼上時很容易帶到空白
        expect(line.normalizeBindingCode('  abc23xyz \n')).toBe('ABC23XYZ');
        expect(line.normalizeBindingCode(null)).toBe('');
    });
});

describe('訊息分類：哪些訊息 webhook 才該回應', () => {
    const line = loadLine();

    // 這一組是迴歸測試。原本的實作把「每一則文字訊息」都當成綁定碼嘗試，
    // 查不到就回「找不到有效的綁定碼」——使用者說聲哈囉就收到那句，看起來像 bot 壞了。
    //
    // 而且這不只是體驗問題：常見問題改由 LINE 的關鍵字自動回應處理之後，
    // webhook 若對一般訊息也回話，關鍵字訊息會收到兩則回覆（我們一則、LINE 一則）。
    // 「不是綁定碼就完全不回應」是兩邊分工能成立的前提。

    test.each([
        ['哈囉'],
        ['如何繳交系學會費'],
        ['hello'],
        ['請問考古題在哪'],
        [''],
        ['   '],
        [null],
        [undefined],
    ])('一般訊息 %s 不觸發回應', (text) => {
        expect(line.classifyMessage(text)).toBe('ignore');
    });

    test.each([
        ['ABCDEFG', '少一碼'],
        ['ABCDEFGHI', '多一碼'],
        ['ABCDEF0G', '含字母表排除的 0'],
        ['ABCDEFOG', '含字母表排除的 O'],
        ['ABCDEF1G', '含字母表排除的 1'],
        ['ABCDEFIG', '含字母表排除的 I'],
        ['ABC DEFG', '中間有空白'],
        ['ABCDEF-G', '含符號'],
    ])('%s（%s）不算綁定碼', (text) => {
        expect(line.looksLikeBindingCode(text)).toBe(false);
        expect(line.classifyMessage(text)).toBe('ignore');
    });

    test('產生出來的碼一定會被認得', () => {
        // 若哪天改了字母表或長度卻忘了同步，這條會先紅
        for (let i = 0; i < 50; i += 1) {
            const code = line.generateBindingCode();
            expect(line.looksLikeBindingCode(code)).toBe(true);
            expect(line.classifyMessage(code)).toBe('binding-attempt');
        }
    });

    test('小寫與前後空白仍算綁定碼（會先正規化）', () => {
        const code = line.generateBindingCode();
        expect(line.classifyMessage(`  ${code.toLowerCase()} `)).toBe('binding-attempt');
    });

    test('webhook 真的有用 classifyMessage 把關', () => {
        // 上面測的都是純函式。函式本身正確、但 route 沒呼叫它的話，
        // 一般訊息照樣會收到「綁定碼無效」——而那些測試仍然全綠。
        // 這裡直接檢查接線，理由同 feedbackAnonymity.test.js。
        const src = fs.readFileSync(
            path.resolve(process.cwd(), 'src/backend/routes/line.js'), 'utf8'
        );

        const handler = /if \(event\.type !== 'message'[\s\S]*?lineBindingCode: code/.exec(src);
        expect(handler).not.toBeNull();

        // 在查資料庫之前就要先擋掉非綁定碼的訊息
        expect(handler[0]).toMatch(/classifyMessage\([\s\S]*?===\s*'ignore'[\s\S]*?return/);
    });
});
