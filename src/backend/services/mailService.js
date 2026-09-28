// 寄信。目前只有一種信：忘記密碼的重設連結。
//
// 設定全部來自環境變數（見 .env.example 與 DEPLOYMENT.md 的「寄信設定」）。
// 沒設定時不丟錯：忘記密碼的端點照樣回成功訊息（它本來就不能透露任何事），
// 只是信不會寄出——開發環境把連結印在 console 方便測試，正式環境記一次警告。

const nodemailer = require('nodemailer');

const REQUIRED = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];

const isEnabled = () => REQUIRED.every((key) => !!process.env[key]);

let transporter = null;
const getTransporter = () => {
    if (!transporter) {
        const port = parseInt(process.env.SMTP_PORT || '465', 10);
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            // 465 是隱式 TLS；587 走 STARTTLS（secure=false 時 nodemailer 會自動升級）
            secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
    }
    return transporter;
};

let warnedDisabled = false;

const escapeHtml = (s) =>
    String(s).replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

// 中英並列：寄信時不知道對方介面用哪種語言，而這封信錯過了就重設不了密碼。
const buildPasswordResetMail = (user, url, ttlMinutes) => {
    const name = user.fullName || user.username;
    const text = [
        `${name} 您好：`,
        '',
        `我們收到重設台大資管系學會網站帳號「${user.username}」密碼的申請。`,
        `請在 ${ttlMinutes} 分鐘內點下列連結設定新密碼（連結只能使用一次）：`,
        '',
        url,
        '',
        '如果這不是您本人的操作，請忽略這封信，您的密碼不會有任何改變。',
        '',
        '---',
        '',
        `Hi ${name},`,
        '',
        `We received a request to reset the password for "${user.username}" on the NTU IM Student Association website.`,
        `Open the link below within ${ttlMinutes} minutes to choose a new password (it can only be used once):`,
        '',
        url,
        '',
        'If you did not request this, you can ignore this email; your password will not change.',
    ].join('\n');

    const safeUrl = escapeHtml(url);
    const html = `
<div style="font-family: sans-serif; line-height: 1.6; max-width: 560px">
  <p>${escapeHtml(name)} 您好：</p>
  <p>我們收到重設帳號「${escapeHtml(user.username)}」密碼的申請。請在 ${ttlMinutes} 分鐘內點下方按鈕設定新密碼，連結只能使用一次。</p>
  <p><a href="${safeUrl}" style="display: inline-block; padding: 10px 20px; background: #1976d2; color: #fff; text-decoration: none; border-radius: 4px">設定新密碼 / Reset password</a></p>
  <p style="color: #666; font-size: 13px">按鈕無法點選時，請複製這個網址到瀏覽器：<br>${safeUrl}</p>
  <p style="color: #666; font-size: 13px">如果這不是您本人的操作，請忽略這封信，您的密碼不會有任何改變。</p>
  <hr style="border: none; border-top: 1px solid #ddd">
  <p style="color: #666; font-size: 13px">We received a request to reset the password for "${escapeHtml(user.username)}". The link above expires in ${ttlMinutes} minutes and can only be used once. If you did not request this, ignore this email.</p>
</div>`;

    return {
        subject: '重設密碼 / Reset your password｜台大資管系學會',
        text,
        html,
    };
};

const sendPasswordResetEmail = async (user, url, ttlMinutes) => {
    if (!isEnabled()) {
        if (process.env.NODE_ENV === 'production') {
            if (!warnedDisabled) {
                console.warn('[寄信] 未設定 SMTP，忘記密碼的信不會寄出。設定方式見 DEPLOYMENT.md');
                warnedDisabled = true;
            }
        } else {
            // 只在開發環境印出連結，正式環境的日誌絕不能出現可用的重設連結
            console.log(`[寄信停用・開發模式] ${user.username} 的重設連結：${url}`);
        }
        return { skipped: true };
    }

    const mail = buildPasswordResetMail(user, url, ttlMinutes);
    await getTransporter().sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: user.email,
        ...mail,
    });
    return { sent: true };
};

module.exports = { isEnabled, sendPasswordResetEmail, buildPasswordResetMail };
