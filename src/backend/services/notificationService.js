// 決定「誰該收到什麼通知」。怎麼把訊息送出去在 services/lineService.js。
//
// 這一層刻意保持很薄：新增一種通知就是在事件發生的地方多呼叫一次 notifyPermission，
// 不需要註冊、不需要事件匯流排。等真的有五、六種通知、而且需要各自的開關與排程時，
// 再來談抽象層；現在先為三個事件蓋一套外掛框架只會多出沒人維護的程式碼。

const { Op } = require('sequelize');
const { User } = require('../models');
const permissionService = require('./permissionService');
const lineService = require('./lineService');
const { isEnabled } = require('../config/line');

const siteUrl = () => (process.env.FRONTEND_URL || 'https://ntu.im').replace(/\/$/, '');

// 推播給「已綁定 LINE 且持有指定權限」的所有人。
//
// 只掃有綁定的使用者：那是很小的集合（幹部人數），逐一解析權限的成本可以忽略。
// 反過來先撈「所有有權限的人」則要對全站使用者做權限解析。
const notifyPermission = async (permission, text) => {
    if (!isEnabled()) return { skipped: true };

    const bound = await User.findAll({
        where: { lineUserId: { [Op.ne]: null } },
        attributes: ['id', 'username', 'role', 'lineUserId'],
    });
    if (bound.length === 0) return { skipped: true, reason: 'no-bound-users' };

    const recipients = [];
    for (const user of bound) {
        // resolve 會查身分組與權限；bound 很小，逐一查比撈全站再過濾便宜得多
        // eslint-disable-next-line no-await-in-loop
        const resolved = await permissionService.resolve(user);
        if (permissionService.hasPermission(resolved, permission)) {
            recipients.push(user.lineUserId);
        }
    }

    if (recipients.length === 0) return { skipped: true, reason: 'no-recipients' };
    return lineService.multicast(recipients, [lineService.textMessage(text)]);
};

// --- 各事件的訊息 ---------------------------------------------------------
//
// ⚠️ 一律不放評價／回饋的內文。
// 待審的評價還沒被核准公開，一旦推進 LINE 就永久留在 LINE 的伺服器上：
// 日後退出聊天室的人仍保有紀錄，評價被退件或刪除也收不回來。
// 通知的用途是「有事發生，點進去看」，不是在 LINE 上讀完。

const reviewLine = (review) =>
    `${review.courseName}（${review.courseCode}）\n`
    + `教授：${review.professor}\n`
    + `學年期：${review.year - 1911}-${review.semester}`;

const notifyReviewPending = (review) =>
    notifyPermission(
        'courseReviews.moderate',
        `📝 有新的課程評價待審核\n\n${reviewLine(review)}\n\n${siteUrl()}/admin`
    );

const notifyReviewResubmitted = (review) =>
    notifyPermission(
        'courseReviews.moderate',
        `🔁 有被退件的評價重新送出\n\n${reviewLine(review)}\n\n${siteUrl()}/admin`
    );

// 回饋是匿名的，所以訊息裡除了分類什麼都不能有。
//
// ⚠️ 這則通知本身會洩漏「剛剛有人送了回饋」的時間。這個風險在後台的 created_at
// 就已經存在，但推到 LINE 等於把時間資訊散佈給更多人。若日後覺得不妥，
// 作法是改成每小時彙整一次，而不是移除通知。
const notifyFeedbackReceived = (category) =>
    notifyPermission(
        'feedback.manage',
        `💬 有新的匿名回饋（分類：${category}）\n\n${siteUrl()}/admin`
    );

module.exports = {
    notifyPermission,
    notifyReviewPending,
    notifyReviewResubmitted,
    notifyFeedbackReceived,
};
