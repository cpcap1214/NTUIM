const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const lineService = require('../services/lineService');
const permissionService = require('../services/permissionService');
const {
    isEnabled,
    verifySignature,
    generateBindingCode,
    bindingCodeExpiry,
    isBindingCodeExpired,
    normalizeBindingCode,
    classifyMessage,
    CODE_TTL_MS,
} = require('../config/line');

const errorResponse = (errorCode, message) => ({ error: message, errorCode });

// ---------------------------------------------------------------------------
// Webhook（由 LINE 的伺服器呼叫）
// ---------------------------------------------------------------------------
//
// ⚠️ 這支端點不可以掛 authenticateToken——呼叫方是 LINE，沒有我們的 token。
//    取而代之的驗證是 X-Line-Signature，那是唯一能證明請求真的來自 LINE 的東西。
//
// ⚠️ 必須很快回 200。LINE 會對失敗的 webhook 重試，連續失敗會自動把 webhook 停用，
//    而且停用之後不會有任何通知——症狀是「bot 某天開始就不理人了」。
//    所以先回應、再處理事件，處理過程的錯誤只記錄不影響回應。
router.post('/webhook', async (req, res) => {
    // rawBody 由 server.js 的 express.json({ verify }) 保存。
    // 用解析後的物件重新 stringify 是行不通的——鍵順序與逸出方式都可能與原文不同。
    if (!verifySignature(req.rawBody, req.get('X-Line-Signature'))) {
        return res.status(401).json(errorResponse('LINE_BAD_SIGNATURE', '簽章驗證失敗'));
    }

    // 先回應。events 為空是 LINE 後台「Verify」按鈕的行為，也走這條。
    res.status(200).json({ ok: true });

    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    for (const event of events) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await handleEvent(event);
        } catch (error) {
            console.error('處理 LINE 事件錯誤:', error);
        }
    }
});

const HELP_TEXT = '請在系學會網站的管理員控制台產生綁定碼，再把那 8 碼傳到這裡完成綁定。';

const handleEvent = async (event) => {
    const lineUserId = event?.source?.userId;

    // 封鎖／解除好友後推播只會一直失敗，綁定留著沒有意義。
    // 使用者之後想再收通知，重新加好友並綁定即可。
    if (event.type === 'unfollow') {
        if (lineUserId) {
            await User.update(
                { lineUserId: null, lineBoundAt: null },
                { where: { lineUserId } }
            );
        }
        return;
    }

    if (event.type === 'follow') {
        await lineService.reply(event.replyToken, [
            lineService.textMessage(`歡迎！這裡是台大資管系學會的通知機器人。\n\n${HELP_TEXT}`),
        ]);
        return;
    }

    if (event.type !== 'message' || event.message?.type !== 'text') return;

    // 不像綁定碼就完全不回應——常見問題交給 LINE 的關鍵字自動回應處理
    // （設定方式見 HANDOVER.md）。
    //
    // ⚠️ 這裡若對一般訊息回了任何東西，關鍵字訊息就會收到兩則回覆：
    //    我們一則、LINE 的自動回應一則。兩邊互不重疊是這個分工能成立的前提。
    if (classifyMessage(event.message.text) === 'ignore') return;

    const code = normalizeBindingCode(event.message.text);
    const user = await User.findOne({ where: { lineBindingCode: code } });

    if (!user || isBindingCodeExpired(user.lineBindingExpiresAt)) {
        // 格式對但查不到或已過期才回這句。打錯碼的人一定要有回饋，
        // 否則他只會一直重傳同一組失效的碼。
        await lineService.reply(event.replyToken, [
            lineService.textMessage(`綁定碼無效或已過期。\n\n${HELP_TEXT}`),
        ]);
        return;
    }

    // 一個 LINE 帳號只能綁一個系統帳號（資料表有 partial unique index 把關）。
    // 先清掉同一個 lineUserId 的舊綁定，否則寫入會撞索引而整個失敗——
    // 使用者換帳號重綁是合理操作，不該被擋。
    await User.update({ lineUserId: null, lineBoundAt: null }, { where: { lineUserId, id: { [Op.ne]: user.id } } });

    await user.update({
        lineUserId,
        lineBoundAt: new Date(),
        lineBindingCode: null,
        lineBindingExpiresAt: null,
    });

    await lineService.reply(event.replyToken, [
        lineService.textMessage(`綁定成功！\n帳號：${user.username}\n\n之後有待審核的項目會在這裡通知你。`),
    ]);
};

// ---------------------------------------------------------------------------
// 綁定管理（由網站呼叫，需登入）
// ---------------------------------------------------------------------------
//
// ⚠️ line_user_id 是「通知位址」，不是身分憑證。
//    不要用它來授權任何操作——LINE 訊息沒有經過我們的登入流程，
//    把它當成身分等於開一個繞過網站認證的操作管道。

router.get('/binding', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['lineUserId', 'lineBindingCode', 'lineBindingExpiresAt'],
        });

        const codeValid = user.lineBindingCode && !isBindingCodeExpired(user.lineBindingExpiresAt);
        res.json({
            data: {
                enabled: isEnabled(),
                bound: Boolean(user.lineUserId),
                // 只回傳還有效的碼，過期的碼回傳出去只會讓畫面顯示一個沒用的東西
                bindingCode: codeValid ? user.lineBindingCode : null,
                expiresAt: codeValid ? user.lineBindingExpiresAt : null,
            },
        });
    } catch (error) {
        console.error('取得 LINE 綁定狀態錯誤:', error);
        res.status(500).json(errorResponse('LINE_BINDING_FETCH_FAILED', '取得綁定狀態失敗'));
    }
});

router.post('/binding-code', authenticateToken, async (req, res) => {
    if (!isEnabled()) {
        return res.status(503).json(errorResponse('LINE_NOT_CONFIGURED', 'LINE 通知尚未設定'));
    }

    try {
        const user = await User.findByPk(req.user.id);
        const code = generateBindingCode();
        const expiresAt = bindingCodeExpiry();

        // 覆蓋舊碼：同一個人同時只該有一組有效的碼
        await user.update({ lineBindingCode: code, lineBindingExpiresAt: expiresAt });

        res.json({ data: { bindingCode: code, expiresAt, ttlMs: CODE_TTL_MS } });
    } catch (error) {
        console.error('產生 LINE 綁定碼錯誤:', error);
        res.status(500).json(errorResponse('LINE_BINDING_CODE_FAILED', '產生綁定碼失敗'));
    }
});

router.delete('/binding', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        await user.update({ lineUserId: null, lineBoundAt: null, lineBindingCode: null, lineBindingExpiresAt: null });
        res.json({ message: '已解除綁定' });
    } catch (error) {
        console.error('解除 LINE 綁定錯誤:', error);
        res.status(500).json(errorResponse('LINE_UNBIND_FAILED', '解除綁定失敗'));
    }
});

// ---------------------------------------------------------------------------
// 綁定名單管理（需 users.manage）
// ---------------------------------------------------------------------------
//
// 用 users.manage 而不是另開一個 line.manage：持有它的人在「用戶管理」裡本來就
// 看得到姓名、學號、Email，為「誰綁了 LINE」這種更少的資訊另設權限，
// 只是多一個要記得設定的東西。

const manageUsers = [authenticateToken, requirePermission('users.manage')];

// 通知類型 → 所需權限。與 services/notificationService.js 用的是同一組判斷，
// 改那邊的話這裡也要跟著改（兩邊都只有這一處，刻意不抽共用模組——
// 一個兩筆的對照表抽成模組，讀的人反而要多跳一次檔案）。
const NOTIFY_KINDS = [
    { key: 'courseReviews', permission: 'courseReviews.moderate' },
    { key: 'feedback', permission: 'feedback.manage' },
];

router.get('/bindings', ...manageUsers, async (req, res) => {
    try {
        const bound = await User.findAll({
            where: { lineUserId: { [Op.ne]: null } },
            attributes: ['id', 'username', 'fullName', 'role', 'lineBoundAt'],
            order: [['line_bound_at', 'DESC'], ['id', 'ASC']],
        });

        const data = [];
        for (const user of bound) {
            // 已綁定的人數很少（幹部規模），逐一解析權限的成本可以忽略
            // eslint-disable-next-line no-await-in-loop
            const resolved = await permissionService.resolve(user);
            data.push({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                // 既有綁定沒有時間可考，回 null，前端顯示為「未知」
                boundAt: user.lineBoundAt,
                // 這個人「實際上」收得到哪些通知。
                // 沒有這一欄的話，「綁了卻沒有審核權限」在畫面上完全看不出來，
                // 只會被當成 bot 壞掉——那是最常見的疑問。
                notifies: NOTIFY_KINDS
                    .filter((k) => permissionService.hasPermission(resolved, k.permission))
                    .map((k) => k.key),
                // ⚠️ 刻意不回傳 lineUserId。前端沒有任何用途需要它，
                //    而它是 LINE 平台上的使用者識別碼——能少送就少送。
            });
        }

        res.json({ data });
    } catch (error) {
        console.error('取得 LINE 綁定名單錯誤:', error);
        res.status(500).json(errorResponse('LINE_BINDINGS_FETCH_FAILED', '取得綁定名單失敗'));
    }
});

// 替他人解除綁定。主要用途是交接：離任幹部若沒自己解綁，
// 畢業後仍會繼續收到待審核通知（內含後台連結）。
router.delete('/bindings/:userId', ...manageUsers, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user) {
            return res.status(404).json(errorResponse('USER_NOT_FOUND', '找不到該使用者'));
        }

        await user.update({
            lineUserId: null,
            lineBoundAt: null,
            lineBindingCode: null,
            lineBindingExpiresAt: null,
        });

        res.json({ message: '已解除該使用者的綁定' });
    } catch (error) {
        console.error('解除他人 LINE 綁定錯誤:', error);
        res.status(500).json(errorResponse('LINE_UNBIND_OTHER_FAILED', '解除綁定失敗'));
    }
});

module.exports = router;
