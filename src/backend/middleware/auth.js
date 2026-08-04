const jwt = require('jsonwebtoken');
const { User } = require('../models');
const permissionService = require('../services/permissionService');

// 全站唯一的管理員判斷。原本這一行（含 `|| user?.username === 'cpcap'` 的後門）
// 在後端被複製了 5 份、前端 6 份；後門已於 migration 005 實體化成 role='admin' 後移除，
// 因為只要那個使用者名稱在某個環境尚未被註冊，搶註冊的人就能直接取得最高權限。
const hasAdminAccess = (user) => user?.role === 'admin';


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

        // 解析身分組與權限掛到 req.user 上（Phase 2：只是備好，還沒有任何地方強制執行）
        const resolved = await permissionService.resolve(req.user);
        req.user.roles = resolved.roles;
        req.user.permissions = resolved.permissions;
        req.user.rawPermissions = resolved.rawPermissions;
        req.permissions = resolved;

        // 影子模式：在切換強制執行之前，先確認新舊兩套判斷結果一致。
        // 這是在任何東西依賴身分組之前、證明回填正確性最便宜的方法。
        // Phase 3 完成、觀察數日無警告後即可移除。
        if (resolved.isAdmin !== hasAdminAccess(req.user)) {
            console.warn(
                `[權限影子模式] 判斷不一致 user=${req.user.username}(id=${req.user.id}) ` +
                `舊(role='admin')=${hasAdminAccess(req.user)} 新(身分組)=${resolved.isAdmin}`
            );
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: '認證令牌已過期' });
        }
        return res.status(403).json({ error: '無效的認證令牌' });
    }
};

// 把 ?token= 轉成 Authorization 標頭。
// PDF 預覽是用 window.open 開新分頁，沒辦法帶自訂標頭，只能把 token 放在網址上。
// 這段原本寫在各個預覽路由裡（inline），但掛載層級的中介層會跑在它「之前」，
// 導致後面的模塊檢查看不到身分。提升到最前面統一處理。
const tokenFromQuery = (req, res, next) => {
    if (req.query.token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
};

// 選擇性認證：有帶有效 token 就解析身分，沒帶或無效就當成匿名繼續往下走，不擋。
// 公開端點也需要知道「你是誰」——例如某個模塊被限定給管理員測試時，
// 管理員打公開的 GET /api/exams 也必須被認出來，否則會被當成匿名擋掉。
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId, {
            attributes: ['id', 'username', 'email', 'role', 'hasPaidFee', 'canManagePayouts']
        });
        if (user) {
            req.user = user.toJSON();
            const resolved = await permissionService.resolve(req.user);
            req.user.roles = resolved.roles;
            req.user.permissions = resolved.permissions;
            req.permissions = resolved;
        }
    } catch (error) {
        // 過期或無效的 token 一律視同未登入，不在這裡回錯——
        // 這些是公開端點，匿名本來就該能用
    }
    next();
};

// 要求該模塊對此使用者開放。未開放時一律 403（不可 401，會把使用者登出）。
const requireModuleAccess = (moduleKey) => async (req, res, next) => {
    try {
        const allowed = await permissionService.canAccessModule(req.user, req.permissions, moduleKey);
        if (!allowed) {
            return res.status(403).json({
                error: '此功能尚未開放',
                errorCode: 'MODULE_NOT_AVAILABLE',
                module: moduleKey
            });
        }
        next();
    } catch (error) {
        console.error('模塊權限檢查錯誤:', error);
        next(error);
    }
};

// 要求持有某個權限。取代原本的 requireAdmin / requirePayoutManager / requirePaidMember。
//
// 一律回 403，絕不可回 401：前端 services/api.js 收到 401 會清空 localStorage
// 並強制導向 /login，等於把使用者登出。
// 同理不帶 requirePayment 欄位，那會觸發 api.js 的原生 alert()。
const requirePermission = (permission) => (req, res, next) => {
    if (!permissionService.hasPermission(req.permissions, permission)) {
        return res.status(403).json({ error: '權限不足', requiredPermission: permission });
    }
    next();
};

// 資源擁有者或持有指定權限（取代散落在各 handler 內的 8 個 inline 檢查）
const isOwnerOrHasPermission = (req, ownerId, permission) =>
    req.user?.id === ownerId || permissionService.hasPermission(req.permissions, permission);

// 註：原本的 requirePaidMember 已移除。「已繳費」現在是「會員」自動身分組，
// 而該身分組持有 exams.download 權限，所以考古題預覽/下載改用
// requirePermission('exams.download')，行為完全相同。
// 留著第二條通往同一個判斷的路徑，只會讓兩者日後產生分歧。

// 檢查是否為該使用者本人，或持有用戶管理權限。
// 只讀 req.params，刻意不再退回 req.body.userId：那個退路一旦被用在 POST 路由上，
// 呼叫端就能自己在 body 裡宣稱自己是資源擁有者，是個等著被踩的洞。
const requireOwnerOrAdmin = (paramName = 'id') => {
    return (req, res, next) => {
        const resourceUserId = req.params[paramName];

        if (permissionService.hasPermission(req.permissions, 'users.manage')
            || req.user.id === parseInt(resourceUserId)) {
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
    optionalAuth,
    tokenFromQuery,
    requireModuleAccess,
    requirePermission,
    isOwnerOrHasPermission,
    requireOwnerOrAdmin,
    hasAdminAccess,
    generateToken,
    refreshToken
};
