// 與 LINE Messaging API 溝通的薄層。只負責「怎麼跟 LINE 說話」，
// 「誰該收到什麼」在 services/notificationService.js。
//
// 不需要 @line/bot-sdk：Node 22 有全域 fetch，簽章用內建 crypto，
// 我們只用到三個端點。多一個依賴等於多一份要跟著 LINE 改版的東西。

const { CHANNEL_ACCESS_TOKEN, isEnabled } = require('../config/line');

const API_BASE = 'https://api.line.me/v2/bot';

// multicast 的單次上限是 500 個 userId。目前幹部人數遠低於此，
// 但分批是三行的事，等真的超過才發現會是「有些人莫名收不到通知」。
const MULTICAST_LIMIT = 500;

const request = async (path, body) => {
    if (!isEnabled()) return { skipped: true };

    const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        // LINE 的錯誤內容對除錯很重要（例如 400 會說明是哪個欄位不合法），
        // 但不要讓它中斷呼叫端——推播失敗絕不能影響觸發它的那件事
        const detail = await response.text().catch(() => '');
        throw new Error(`LINE API ${path} 回應 ${response.status}: ${detail}`);
    }

    return response.json().catch(() => ({}));
};

// 純文字訊息。目前所有通知都是純文字——Flex Message 好看但難維護，
// 而且通知的價值在於「有事發生，點進去看」，不在於排版。
const textMessage = (text) => ({ type: 'text', text });

const push = (to, messages) => request('/message/push', { to, messages });

const multicast = async (userIds, messages) => {
    const targets = [...new Set(userIds)].filter(Boolean);
    if (targets.length === 0) return { skipped: true };

    const batches = [];
    for (let i = 0; i < targets.length; i += MULTICAST_LIMIT) {
        batches.push(targets.slice(i, i + MULTICAST_LIMIT));
    }

    // 一批失敗不該影響其他批，所以用 allSettled 而不是 all
    const results = await Promise.allSettled(
        batches.map((batch) => request('/message/multicast', { to: batch, messages }))
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
        console.error('LINE multicast 部分失敗:', failed.map((f) => f.reason?.message).join('; '));
    }
    return { sent: targets.length, failedBatches: failed.length };
};

// 回覆使用者剛送來的訊息。replyToken 只能用一次、且有效期很短（約 30 秒），
// 所以 webhook 裡不要在回覆之前做慢的事。
const reply = (replyToken, messages) => request('/message/reply', { replyToken, messages });

module.exports = { textMessage, push, multicast, reply, MULTICAST_LIMIT };
