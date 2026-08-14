const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { checkStudentPaidFee } = require('../services/feeStatusService');

// 註冊
router.post('/register', [
    body('studentId').notEmpty().withMessage({ code: 'STUDENT_ID_REQUIRED', message: '學號為必填' }),
    body('username').isLength({ min: 3 }).withMessage({ code: 'USERNAME_TOO_SHORT', message: '使用者名稱至少3個字元' }),
    body('email').isEmail().withMessage({ code: 'EMAIL_INVALID', message: '請輸入有效的電子郵件' }),
    body('password').isLength({ min: 6 }).withMessage({ code: 'PASSWORD_TOO_SHORT', message: '密碼至少6個字元' }),
    body('fullName').notEmpty().withMessage({ code: 'FULL_NAME_REQUIRED', message: '姓名為必填' })
], async (req, res) => {
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
                [require('sequelize').Op.or]: [
                    { studentId },
                    { username },
                    { email }
                ]
            }
        });

        if (existingUser) {
            let field = 'username';
            if (existingUser.studentId === studentId) field = '學號';
            else if (existingUser.email === email) field = '電子郵件';
            
            return res.status(400).json({ 
                error: `此${field}已被註冊`,
                errorCode: 'FIELD_ALREADY_TAKEN',
                // 帶插值的訊息除了 code，還要把變數送出去，前端才組得出譯文
                params: { field } 
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
            role: 'user',
            hasPaidFee
        });

        // 產生 Token
        const token = generateToken(user);

        res.status(201).json({
            message: '註冊成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                hasPaidFee: user.hasPaidFee,
                canManagePayouts: user.canManagePayouts
            }
        });
    } catch (error) {
        console.error('註冊錯誤:', error);
        res.status(500).json({ error: '註冊失敗，請稍後再試', errorCode: 'REGISTER_FAILED' });
    }
});

// 登入
router.post('/login', [
    body('username').notEmpty().withMessage({ code: 'IDENTIFIER_REQUIRED', message: '請輸入學號或使用者名稱' }),
    body('password').notEmpty().withMessage({ code: 'PASSWORD_REQUIRED', message: '請輸入密碼' })
], async (req, res) => {
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
                [require('sequelize').Op.or]: [
                    { studentId: username },
                    { username: username }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({ error: '帳號或密碼錯誤', errorCode: 'CREDENTIALS_INVALID' });
        }

        // 驗證密碼
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: '帳號或密碼錯誤', errorCode: 'CREDENTIALS_INVALID' });
        }

        // 產生 Token
        const token = generateToken(user);

        res.json({
            message: '登入成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                hasPaidFee: user.hasPaidFee,
                canManagePayouts: user.canManagePayouts
            }
        });
    } catch (error) {
        console.error('登入錯誤:', error);
        res.status(500).json({ error: '登入失敗，請稍後再試', errorCode: 'LOGIN_FAILED' });
    }
});

// 修改密碼（需登入，只能改自己的）
//
// 原本這個端點完全不需要認證：任何人帶著 username + oldPassword 就能改任何帳號的密碼，
// 而且「使用者不存在」(404) 與「舊密碼錯誤」(401) 回應不同，等於一個未認證的
// 帳號枚舉 + 暴力破解介面，加上當時全站沒有任何速率限制。
// 現在改為從 token 取得身分（不再信任 body 裡的 username），並套用 authLimiter。
router.post('/change-password', authenticateToken, [
    body('oldPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }).withMessage({ code: 'NEW_PASSWORD_TOO_SHORT', message: '新密碼至少6個字元' })
], async (req, res) => {
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
            return res.status(401).json({ error: '舊密碼錯誤', errorCode: 'OLD_PASSWORD_INVALID' });
        }

        // 更新密碼
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: '密碼修改成功' });
    } catch (error) {
        console.error('修改密碼錯誤:', error);
        res.status(500).json({ error: '修改密碼失敗', errorCode: 'CHANGE_PASSWORD_FAILED' });
    }
});

module.exports = router;
