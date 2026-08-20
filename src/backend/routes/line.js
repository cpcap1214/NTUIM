const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const lineService = require('../services/lineService');
const {
    isEnabled,
    verifySignature,
    generateBindingCode,
    bindingCodeExpiry,
    isBindingCodeExpired,
    normalizeBindingCode,
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
                { lineUserId: null },
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

    const code = normalizeBindingCode(event.message.text);
    const user = await User.findOne({ where: { lineBindingCode: code } });

    if (!user || isBindingCodeExpired(user.lineBindingExpiresAt)) {
        await lineService.reply(event.replyToken, [
            lineService.textMessage(`找不到有效的綁定碼（可能已過期）。\n\n${HELP_TEXT}`),
        ]);
        return;
    }

    // 一個 LINE 帳號只能綁一個系統帳號（資料表有 partial unique index 把關）。
    // 先清掉同一個 lineUserId 的舊綁定，否則寫入會撞索引而整個失敗——
    // 使用者換帳號重綁是合理操作，不該被擋。
    await User.update({ lineUserId: null }, { where: { lineUserId, id: { [Op.ne]: user.id } } });

    await user.update({
        lineUserId,
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
        await user.update({ lineUserId: null, lineBindingCode: null, lineBindingExpiresAt: null });
        res.json({ message: '已解除綁定' });
    } catch (error) {
        console.error('解除 LINE 綁定錯誤:', error);
        res.status(500).json(errorResponse('LINE_UNBIND_FAILED', '解除綁定失敗'));
    }
});

module.exports = router;
