const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { generateToken } = require('../middleware/auth');

// 註冊
router.post('/register', [
    body('studentId').notEmpty().withMessage('學號為必填'),
    body('username').isLength({ min: 3 }).withMessage('使用者名稱至少3個字元'),
    body('email').isEmail().withMessage('請輸入有效的電子郵件'),
    body('password').isLength({ min: 6 }).withMessage('密碼至少6個字元'),
    body('fullName').notEmpty().withMessage('姓名為必填')
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
                error: `此${field}已被註冊` 
            });
        }

        // 加密密碼
        const passwordHash = await bcrypt.hash(password, 10);

        // 建立使用者
        const user = await User.create({
            studentId,
            username,
            email,
            passwordHash,
            fullName,
            role: 'user',
            hasPaidFee: false
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
                hasPaidFee: user.hasPaidFee
            }
        });
    } catch (error) {
        console.error('註冊錯誤:', error);
        res.status(500).json({ error: '註冊失敗，請稍後再試' });
    }
});

// 登入
router.post('/login', [
    body('username').notEmpty().withMessage('請輸入學號或使用者名稱'),
    body('password').notEmpty().withMessage('請輸入密碼')
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
            return res.status(401).json({ error: '帳號或密碼錯誤' });
        }

        // 驗證密碼
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: '帳號或密碼錯誤' });
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
                hasPaidFee: user.hasPaidFee
            }
        });
    } catch (error) {
        console.error('登入錯誤:', error);
        res.status(500).json({ error: '登入失敗，請稍後再試' });
    }
});

// 修改密碼
router.post('/change-password', [
    body('username').notEmpty(),
    body('oldPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }).withMessage('新密碼至少6個字元')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, oldPassword, newPassword } = req.body;

    try {
        const user = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { studentId: username },
                    { username: username }
                ]
            }
        });

        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        // 驗證舊密碼
        const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: '舊密碼錯誤' });
        }

        // 更新密碼
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: '密碼修改成功' });
    } catch (error) {
        console.error('修改密碼錯誤:', error);
        res.status(500).json({ error: '修改密碼失敗' });
    }
});

module.exports = router;