const express = require('express');
const router = express.Router();
const { User, toSafeUser } = require('../models');
const { requirePermission, generateToken } = require('../middleware/auth');
const passwordService = require('../services/passwordService');
const { ADMIN_TTL_MS } = require('../config/passwordReset');
const permissionService = require('../services/permissionService');

// 這個檔案原本自己實作了一套平行的認證堆疊（verifyAdminAccess），與共用的
// authenticateToken + requireAdmin 有多處行為差異：載入 user 時沒有限制欄位（連
// passwordHash 都塞進 req.user）、req.user 是 Sequelize instance 而非純物件、
// token 過期會被壓成通用的 401「驗證失敗」而不是可辨識的「認證令牌已過期」。
// 現已全部改用共用中介層，authenticateToken 在 server.js 掛載此路由時統一套用。

// 獲取所有用戶資料
router.get('/users', requirePermission('users.manage'), async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: [
                'id',
                'username',
                'email',
                'studentId',
                'fullName',
                'hasPaidFee',
                'created_at',
                'passwordHash',
            ],
            order: [['created_at', 'DESC']],
        });

        // 身分組（含依繳費狀態推導的「會員」）一次批次查好，避免每個使用者各查一次
        const rolesByUser = await permissionService.getRolesForUsers(users);

        // 為了安全，只顯示部分密碼資訊
        const usersWithPasswordDisplay = users.map((user) => {
            const userData = user.toJSON();
            // 顯示密碼的前8個字符（這是hash的一部分，不是真實密碼）
            userData.passwordDisplay = userData.passwordHash
                ? userData.passwordHash.substring(0, 8) + '...'
                : null;
            delete userData.passwordHash; // 不傳送完整的 hash

            userData.roles = rolesByUser[user.id] || [];
            return userData;
        });

        res.json(usersWithPasswordDisplay);
    } catch (error) {
        console.error('獲取用戶失敗:', error);
        res.status(500).json({ error: '獲取用戶資料失敗', errorCode: 'FETCH_USER_FAILED' });
    }
});

// 更新用戶資料
router.put('/users/:id', requirePermission('users.manage'), async (req, res) => {
    try {
        const { id } = req.params;
        // 只接受基本資料與繳費狀態。身分組走 PUT /api/users/:id/roles
        // （那裡有「不可指派自動身分組」與「不可移除最後一位管理員」的把關）。
        // 舊版前端若還送 role / canManagePayouts 會被直接忽略——那兩個欄位已沒有授權作用。
        const { username, email, studentId, fullName, hasPaidFee } = req.body;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: '找不到用戶', errorCode: 'USER_NOT_FOUND' });
        }

        const updates = { username, email, studentId, fullName, hasPaidFee };

        await user.update(updates);

        res.json({ message: '用戶資料已更新', user: toSafeUser(user) });
    } catch (error) {
        console.error('更新用戶失敗:', error);
        res.status(500).json({ error: '更新失敗', errorCode: 'UPDATE_FAILED_GENERIC' });
    }
});

// 更新用戶密碼
router.put('/users/:id/password', requirePermission('users.manage'), async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password) {
            return res
                .status(400)
                .json({ error: '請提供新密碼', errorCode: 'NEW_PASSWORD_REQUIRED' });
        }

        // 和註冊、自助重設同一條規則。原本這裡完全沒有長度限制
        if (String(password).length < 6) {
            return res
                .status(400)
                .json({ error: '新密碼至少6個字元', errorCode: 'NEW_PASSWORD_TOO_SHORT' });
        }

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: '找不到用戶', errorCode: 'USER_NOT_FOUND' });
        }

        // 會讓對方所有既有的登入失效——管理員替人重設密碼，通常就是因為帳號可能外洩了
        await passwordService.setPassword(user, password);

        // 改的是自己：附上新 token，前端換掉之後才不會把自己登出
        res.json({
            message: '密碼已更新',
            ...(user.id === req.user.id ? { token: generateToken(user) } : {}),
        });
    } catch (error) {
        console.error('更新密碼失敗:', error);
        res.status(500).json({ error: '更新密碼失敗', errorCode: 'UPDATE_PASSWORD_FAILED' });
    }
});

// 產生重設密碼連結（給 Email 打錯、收不到信的人）。
//
// 管理員把連結轉交給本人，由本人自己設定新密碼——比起「直接設定新密碼」，
// 管理員不必知道、也不必透過任何管道傳送別人的密碼。
// 不寄信：會走到這一步，就是因為寄信這條路不通。
router.post(
    '/users/:id/password-reset-link',
    requirePermission('users.manage'),
    async (req, res) => {
        try {
            const user = await User.findByPk(req.params.id);
            if (!user) {
                return res.status(404).json({ error: '找不到用戶', errorCode: 'USER_NOT_FOUND' });
            }

            const { url, expiresAt } = await passwordService.issueResetToken(user, ADMIN_TTL_MS);
            console.log(
                `[重設連結] ${req.user.username}(id=${req.user.id}) 替 ${user.username}(id=${user.id}) 產生了重設連結`,
            );
            res.json({ url, expiresAt });
        } catch (error) {
            console.error('產生重設連結失敗:', error);
            res.status(500).json({
                error: '產生重設連結失敗',
                errorCode: 'RESET_LINK_CREATE_FAILED',
            });
        }
    },
);

// 刪除用戶（可選功能）
router.delete('/users/:id', requirePermission('users.manage'), async (req, res) => {
    try {
        const { id } = req.params;

        // 防止把自己刪掉
        if (req.user.id === parseInt(id)) {
            return res
                .status(400)
                .json({ error: '不能刪除自己的帳號', errorCode: 'CANNOT_DELETE_SELF' });
        }

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: '找不到用戶', errorCode: 'USER_NOT_FOUND' });
        }

        // users.js 的 DELETE 有這個保護，這條路徑原本沒有——同一件事兩個入口，
        // 保護卻只做在其中一邊，等於一個現成的繞道。
        if (
            (await permissionService.isSuperuser(user.id)) &&
            (await permissionService.countSuperusers({ exceptUserId: user.id })) === 0
        ) {
            return res.status(400).json({
                error: '無法刪除最後一個管理員',
                errorCode: 'CANNOT_DELETE_LAST_ADMIN',
            });
        }

        await user.destroy();
        res.json({ message: '用戶已刪除' });
    } catch (error) {
        console.error('刪除用戶失敗:', error);
        res.status(500).json({ error: '刪除失敗', errorCode: 'DELETE_FAILED_GENERIC' });
    }
});

module.exports = router;
