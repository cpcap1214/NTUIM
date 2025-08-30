const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const jwt = require('jsonwebtoken');

// 中介軟體：驗證是否為 cpcap 用戶
const verifyCpcap = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '未授權' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    const user = await User.findByPk(decoded.userId);
    
    if (!user || user.username !== 'cpcap') {
      return res.status(403).json({ error: '權限不足' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('驗證錯誤:', error);
    res.status(401).json({ error: '驗證失敗' });
  }
};

// 獲取所有用戶資料
router.get('/users', verifyCpcap, async (req, res) => {
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
        'created_at',
        'passwordHash'
      ],
      order: [['created_at', 'DESC']]
    });

    // 為了安全，只顯示部分密碼資訊
    const usersWithPasswordDisplay = users.map(user => {
      const userData = user.toJSON();
      // 顯示密碼的前8個字符（這是hash的一部分，不是真實密碼）
      userData.passwordDisplay = userData.passwordHash ? 
        userData.passwordHash.substring(0, 8) + '...' : null;
      delete userData.passwordHash; // 不傳送完整的 hash
      return userData;
    });

    res.json(usersWithPasswordDisplay);
  } catch (error) {
    console.error('獲取用戶失敗:', error);
    res.status(500).json({ error: '獲取用戶資料失敗' });
  }
});

// 更新用戶資料
router.put('/users/:id', verifyCpcap, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, studentId, fullName, hasPaidFee, role } = req.body;

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: '找不到用戶' });
    }

    // 更新用戶資料
    await user.update({
      username,
      email,
      studentId,
      fullName,
      hasPaidFee,
      role
    });

    res.json({ message: '用戶資料已更新', user });
  } catch (error) {
    console.error('更新用戶失敗:', error);
    res.status(500).json({ error: '更新失敗' });
  }
});

// 更新用戶密碼
router.put('/users/:id/password', verifyCpcap, async (req, res) => {
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
router.delete('/users/:id', verifyCpcap, async (req, res) => {
  try {
    const { id } = req.params;

    // 防止刪除 cpcap 自己
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