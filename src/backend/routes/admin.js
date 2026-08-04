const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Role, sequelize } = require('../models');
const { requirePermission } = require('../middleware/auth');

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
        'role',
        'hasPaidFee',
        'canManagePayouts',
        'created_at',
        'passwordHash'
      ],
      order: [['created_at', 'DESC']]
    });

    // 一次撈出所有身分組指派，避免每個使用者各查一次
    const assignments = await sequelize.query(
      `SELECT ur.user_id AS userId, r.id, r.key, r.name, r.color
       FROM user_roles ur JOIN roles r ON r.id = ur.role_id
       ORDER BY r.priority DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const rolesByUser = assignments.reduce((acc, row) => {
      (acc[row.userId] = acc[row.userId] || []).push({ id: row.id, key: row.key, name: row.name, color: row.color });
      return acc;
    }, {});

    // 自動身分組「會員」不在 user_roles 裡，依繳費狀態補上，介面才看得到
    const memberRole = await Role.findOne({ where: { key: 'member' } });

    // 為了安全，只顯示部分密碼資訊
    const usersWithPasswordDisplay = users.map(user => {
      const userData = user.toJSON();
      // 顯示密碼的前8個字符（這是hash的一部分，不是真實密碼）
      userData.passwordDisplay = userData.passwordHash ?
        userData.passwordHash.substring(0, 8) + '...' : null;
      delete userData.passwordHash; // 不傳送完整的 hash

      userData.roles = rolesByUser[user.id] || [];
      if (userData.hasPaidFee && memberRole && !userData.roles.some((r) => r.key === 'member')) {
        userData.roles.push({
          id: memberRole.id, key: memberRole.key, name: memberRole.name, color: memberRole.color, isAuto: true
        });
      }
      return userData;
    });

    res.json(usersWithPasswordDisplay);
  } catch (error) {
    console.error('獲取用戶失敗:', error);
    res.status(500).json({ error: '獲取用戶資料失敗' });
  }
});

// 更新用戶資料
router.put('/users/:id', requirePermission('users.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, studentId, fullName, hasPaidFee, role, canManagePayouts } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: '找不到用戶' });
    }

    // 防止移除最後一個管理員。
    // users.js 的 PATCH /:id/role 本來就有這個保護，但這條路徑同樣能寫 role 卻沒有，
    // 等於一個現成的繞道——同一件事有兩個寫入點，保護卻只做在其中一邊。
    if (user.role === 'admin' && role && role !== 'admin') {
      const adminCount = await User.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: '無法移除最後一個管理員' });
      }
    }

    // 更新用戶資料
    const updates = {
      username,
      email,
      studentId,
      fullName,
      hasPaidFee,
      role
    };
    // 總務權限是選填欄位，沒帶就維持原值（避免舊版前端漏傳時把權限清掉）
    if (canManagePayouts !== undefined) {
      updates.canManagePayouts = !!canManagePayouts;
    }

    await user.update(updates);

    // 不要把密碼 hash 回傳出去（GET /users 也有特別剝除，這裡保持一致）
    const safeUser = user.toJSON();
    delete safeUser.passwordHash;

    res.json({ message: '用戶資料已更新', user: safeUser });
  } catch (error) {
    console.error('更新用戶失敗:', error);
    res.status(500).json({ error: '更新失敗' });
  }
});

// 更新用戶密碼
router.put('/users/:id/password', requirePermission('users.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: '請提供新密碼' });
    }

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: '找不到用戶' });
    }

    // 加密新密碼
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 更新密碼
    await user.update({
      passwordHash: hashedPassword
    });

    res.json({ message: '密碼已更新' });
  } catch (error) {
    console.error('更新密碼失敗:', error);
    res.status(500).json({ error: '更新密碼失敗' });
  }
});

// 刪除用戶（可選功能）
router.delete('/users/:id', requirePermission('users.manage'), async (req, res) => {
  try {
    const { id } = req.params;

    // 防止把自己刪掉
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: '不能刪除自己的帳號' });
    }

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: '找不到用戶' });
    }

    await user.destroy();
    res.json({ message: '用戶已刪除' });
  } catch (error) {
    console.error('刪除用戶失敗:', error);
    res.status(500).json({ error: '刪除失敗' });
  }
});

module.exports = router;
