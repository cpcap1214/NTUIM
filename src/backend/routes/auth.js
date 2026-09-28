const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { checkStudentPaidFee, syncStudentFeeStatus } = require('../services/feeStatusService');
const permissionService = require('../services/permissionService');
const passwordService = require('../services/passwordService');
const mailService = require('../services/mailService');
const { EMAIL_TTL_MS, isWithinResendCooldown } = require('../config/passwordReset');
const { passwordResetLimiter, passwordResetIpLimiter } = require('../middleware/rateLimits');

// 登入／註冊回應裡的使用者資料。帶上解析好的身分組與權限，和 GET /users/profile
// 是同一套欄位——前端拿到這份就能判斷權限，不必再退回去看舊的 role 欄位。
const toAuthUser = async (user) => {
    const plain = user.toJSON();
    const resolved = await permissionService.resolve(plain);
    return {
        id: plain.id,
        username: plain.username,
        email: plain.email,
        fullName: plain.fullName,
        hasPaidFee: plain.hasPaidFee,
        roles: resolved.roles,
        permissions: resolved.permissions,
        isAdmin: resolved.isAdmin,
    };
};

// 註冊
router.post(
    '/register',
    [
        body('studentId')
            .notEmpty()
            .withMessage({ code: 'STUDENT_ID_REQUIRED', message: '學號為必填' }),
        body('username')
            .isLength({ min: 3 })
            .withMessage({ code: 'USERNAME_TOO_SHORT', message: '使用者名稱至少3個字元' }),
        body('email')
            .isEmail()
            .withMessage({ code: 'EMAIL_INVALID', message: '請輸入有效的電子郵件' }),
        body('password')
            .isLength({ min: 6 })
            .withMessage({ code: 'PASSWORD_TOO_SHORT', message: '密碼至少6個字元' }),
        body('fullName')
            .notEmpty()
            .withMessage({ code: 'FULL_NAME_REQUIRED', message: '姓名為必填' }),
    ],
    async (req, res) => {
        // 驗證輸入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { studentId, username, email, password, fullName } = req.body;

        try {
            // 檢查使用者是否已存在
            const existingUser = await User.findOne({
                where: {
                    [require('sequelize').Op.or]: [{ studentId }, { username }, { email }],
                },
            });

            if (existingUser) {
                let field = 'username';
                if (existingUser.studentId === studentId) field = '學號';
                else if (existingUser.email === email) field = '電子郵件';

                return res.status(400).json({
                    error: `此${field}已被註冊`,
                    errorCode: 'FIELD_ALREADY_TAKEN',
                    // 帶插值的訊息除了 code，還要把變數送出去，前端才組得出譯文
                    params: { field },
                });
            }

            // 加密密碼
            const passwordHash = await bcrypt.hash(password, 10);

            const hasPaidFee = await checkStudentPaidFee(studentId);

            // 建立使用者
            const user = await User.create({
                studentId,
                username,
                email,
                passwordHash,
                fullName,
                hasPaidFee,
            });

            // 產生 Token
            const token = generateToken(user);

            res.status(201).json({
                message: '註冊成功',
                token,
                user: await toAuthUser(user),
            });
        } catch (error) {
            console.error('註冊錯誤:', error);
            res.status(500).json({ error: '註冊失敗，請稍後再試', errorCode: 'REGISTER_FAILED' });
        }
    },
);

// 登入
router.post(
    '/login',
    [
        body('username')
            .notEmpty()
            .withMessage({ code: 'IDENTIFIER_REQUIRED', message: '請輸入學號或使用者名稱' }),
        body('password')
            .notEmpty()
            .withMessage({ code: 'PASSWORD_REQUIRED', message: '請輸入密碼' }),
    ],
    async (req, res) => {
        // 驗證輸入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        try {
            // 查找使用者（可用學號或使用者名稱登入）
            const user = await User.findOne({
                where: {
                    [require('sequelize').Op.or]: [{ studentId: username }, { username: username }],
                },
            });

            if (!user) {
                return res
                    .status(401)
                    .json({ error: '帳號或密碼錯誤', errorCode: 'CREDENTIALS_INVALID' });
            }

            // 驗證密碼
            const isValidPassword = await bcrypt.compare(password, user.passwordHash);
            if (!isValidPassword) {
                return res
                    .status(401)
                    .json({ error: '帳號或密碼錯誤', errorCode: 'CREDENTIALS_INVALID' });
            }

            // 繳費狀態以系學會費表為準，登入時同步，回應裡的會員資格才會是最新的
            await syncStudentFeeStatus(user);

            // 想起密碼了：還沒用掉的重設連結作廢，免得它在信箱裡多活半小時
            await passwordService.clearResetToken(user);

            // 產生 Token
            const token = generateToken(user);

            res.json({
                message: '登入成功',
                token,
                user: await toAuthUser(user),
            });
        } catch (error) {
            console.error('登入錯誤:', error);
            res.status(500).json({ error: '登入失敗，請稍後再試', errorCode: 'LOGIN_FAILED' });
        }
    },
);

// 修改密碼（需登入，只能改自己的）
//
// 原本這個端點完全不需要認證：任何人帶著 username + oldPassword 就能改任何帳號的密碼，
// 而且「使用者不存在」(404) 與「舊密碼錯誤」(401) 回應不同，等於一個未認證的
// 帳號枚舉 + 暴力破解介面，加上當時全站沒有任何速率限制。
// 現在改為從 token 取得身分（不再信任 body 裡的 username），並套用 authLimiter。
router.post(
    '/change-password',
    authenticateToken,
    [
        body('oldPassword').notEmpty(),
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage({ code: 'NEW_PASSWORD_TOO_SHORT', message: '新密碼至少6個字元' }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { oldPassword, newPassword } = req.body;

        try {
            const user = await User.findByPk(req.user.id);

            if (!user) {
                return res.status(404).json({ error: '使用者不存在', errorCode: 'USER_NOT_FOUND' });
            }

            // 驗證舊密碼
            const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
            if (!isValidPassword) {
                return res
                    .status(401)
                    .json({ error: '舊密碼錯誤', errorCode: 'OLD_PASSWORD_INVALID' });
            }

            // 更新密碼。這會讓所有既有的登入失效（包含發出這個請求的 token），
            // 所以回傳一個新 token 給本人，他不會被自己踢出去；其他裝置上的登入則全部作廢。
            await passwordService.setPassword(user, newPassword);

            res.json({ message: '密碼修改成功', token: generateToken(user) });
        } catch (error) {
            console.error('修改密碼錯誤:', error);
            res.status(500).json({ error: '修改密碼失敗', errorCode: 'CHANGE_PASSWORD_FAILED' });
        }
    },
);

// ---------------------------------------------------------------------------
// 忘記密碼
// ---------------------------------------------------------------------------

// 不管帳號存不存在，回應一律相同。這個端點不需要登入，
// 回應若有任何差異（內容、狀態碼、甚至回應時間），就能被拿來探測誰在這個網站有帳號。
const FORGOT_RESPONSE = {
    message: '如果這個帳號存在且有登記 Email，重設連結已寄出',
};

// 申請重設：寄一次性連結到註冊時的 Email
router.post(
    '/forgot-password',
    passwordResetIpLimiter,
    passwordResetLimiter,
    [
        body('identifier')
            .trim()
            .notEmpty()
            .withMessage({ code: 'IDENTIFIER_REQUIRED', message: '請輸入學號或使用者名稱' }),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 先回應，查詢與寄信全部在回應之後才做：
        // 「找到帳號 → 寫資料庫 → 連 SMTP」比「查無此人」慢上好幾百毫秒，
        // 等做完才回應的話，光看回應時間就知道帳號存不存在。
        res.json(FORGOT_RESPONSE);

        const identifier = req.body.identifier;
        setImmediate(async () => {
            try {
                const user = await User.findOne({
                    where: {
                        [require('sequelize').Op.or]: [
                            { studentId: identifier },
                            { username: identifier },
                        ],
                    },
                });
                if (!user || !user.email) return;

                // 一分鐘內才寄過就不再寄（連點送出、或同一個人開了兩個分頁）
                if (isWithinResendCooldown(user.passwordResetExpiresAt)) return;

                const { url } = await passwordService.issueResetToken(user, EMAIL_TTL_MS);
                await mailService.sendPasswordResetEmail(user, url, EMAIL_TTL_MS / 60000);
            } catch (error) {
                // 只記錄。使用者已經收到「已寄出」的回應，而且必須如此（理由同上）
                console.error('寄送重設密碼信失敗:', error.message);
            }
        });
    },
);

const RESET_ERRORS = {
    invalid: {
        error: '重設連結無效或已使用過，請重新申請',
        errorCode: 'RESET_TOKEN_INVALID',
    },
    expired: {
        error: '重設連結已過期，請重新申請',
        errorCode: 'RESET_TOKEN_EXPIRED',
    },
};

// 頁面一打開就先檢查連結還能不能用，過期的連結不必等使用者把新密碼填完才發現。
// 一律回 400 而不是 401：前端 api.js 收到 401 會清掉登入狀態並導去登入頁。
// 缺 token 或型別不對，findByResetToken 一律當成 invalid，不另外驗證。
router.post('/reset-password/verify', async (req, res) => {
    try {
        const { status } = await passwordService.findByResetToken(req.body.token);
        if (status !== 'ok') return res.status(400).json(RESET_ERRORS[status]);
        res.json({ valid: true });
    } catch (error) {
        console.error('檢查重設連結錯誤:', error);
        res.status(500).json({ error: '重設密碼失敗', errorCode: 'RESET_PASSWORD_FAILED' });
    }
});

// 用重設連結設定新密碼
router.post(
    '/reset-password',
    [
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage({ code: 'NEW_PASSWORD_TOO_SHORT', message: '新密碼至少6個字元' }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { status, user } = await passwordService.findByResetToken(req.body.token);
            if (status !== 'ok') return res.status(400).json(RESET_ERRORS[status]);

            // 同時清掉重設碼（連結只能用一次）並讓所有既有登入失效。
            // 不自動登入：讓使用者用新密碼登入一次，確認他真的記住了。
            await passwordService.setPassword(user, req.body.newPassword);
            res.json({ message: '密碼已重設，請用新密碼登入' });
        } catch (error) {
            console.error('重設密碼錯誤:', error);
            res.status(500).json({ error: '重設密碼失敗', errorCode: 'RESET_PASSWORD_FAILED' });
        }
    },
);

module.exports = router;
