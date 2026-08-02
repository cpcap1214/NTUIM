const jwt = require('jsonwebtoken');
const { User } = require('../models');

const hasAdminAccess = (user) => user?.role === 'admin' || user?.username === 'cpcap';

// 總務權限：管理員一律有；另外可單獨授予總務部的人，讓他們不需要完整管理員權限
// 就能管理回饋金發放（看不到、也改不了使用者管理與評價審核等其他後台功能）
const hasPayoutAccess = (user) => hasAdminAccess(user) || user?.canManagePayouts === true;

// JWT 認證中間件
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: '未提供認證令牌' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 從資料庫獲取使用者資訊
        const user = await User.findByPk(decoded.userId, {
            attributes: ['id', 'username', 'email', 'role', 'hasPaidFee', 'canManagePayouts']
        });

        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        req.user = user.toJSON();
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: '認證令牌已過期' });
        }
        return res.status(403).json({ error: '無效的認證令牌' });
    }
};

// 檢查是否為管理員
const requireAdmin = (req, res, next) => {
    if (!hasAdminAccess(req.user)) {
        return res.status(403).json({ error: '需要管理員權限' });
    }
    next();
};

// 檢查是否可管理回饋金發放（總務部或管理員）
const requirePayoutManager = (req, res, next) => {
    if (!hasPayoutAccess(req.user)) {
        return res.status(403).json({ error: '需要總務或管理員權限' });
    }
    next();
};

// 檢查是否已繳會費
const requirePaidMember = (req, res, next) => {
    if (!req.user.hasPaidFee && !hasAdminAccess(req.user)) {
        return res.status(403).json({ 
            error: '此功能需要繳交系學會費',
            requirePayment: true 
        });
    }
    next();
};

// 檢查是否為資源擁有者或管理員
const requireOwnerOrAdmin = (paramName = 'id') => {
    return (req, res, next) => {
        const resourceUserId = req.params[paramName] || req.body.userId;
        
        if (hasAdminAccess(req.user) || req.user.id === parseInt(resourceUserId)) {
            next();
        } else {
            res.status(403).json({ error: '無權限執行此操作' });
        }
    };
};

// 產生 JWT Token
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role
    };

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// 重新整理 Token
const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ error: '未提供重新整理令牌' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);

        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        const newToken = generateToken(user);
        res.json({ token: newToken });
    } catch (error) {
        res.status(403).json({ error: '無效的重新整理令牌' });
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requirePayoutManager,
    requirePaidMember,
    requireOwnerOrAdmin,
    hasPayoutAccess,
    generateToken,
    refreshToken
};
