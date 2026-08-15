const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 必要的安全設定檢查：缺少強密鑰、或忘記替換 .env.production 佔位字串時，直接拒絕啟動
const isPlaceholderSecret = /^CHANGE_ME/i.test(process.env.JWT_SECRET || '');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || isPlaceholderSecret) {
    console.error('啟動失敗：環境變數 JWT_SECRET 未設定、長度不足（至少需 32 字元），或仍是 .env.production 裡的佔位字串');
    console.error('請在 .env 中設定一組隨機產生的高強度密鑰後再啟動伺服器');
    console.error('可用指令產生：node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    process.exit(1);
}

// 引入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const examRoutes = require('./routes/exams');
const cheatSheetRoutes = require('./routes/cheatSheets');
const courseReviewRoutes = require('./routes/courseReviews');
const courseCatalogRoutes = require('./routes/courseCatalog');
const moduleRoutes = require('./routes/modules');
const roleRoutes = require('./routes/roles');
const adminRoutes = require('./routes/admin');
const announcementRoutes = require('./routes/announcements');

// 引入中間件
const { authenticateToken, optionalAuth, tokenFromQuery, requireModuleAccess } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// 初始化 Express
const app = express();
const PORT = process.env.PORT || 5001;

// 安全標頭。helmet 與 express-rate-limit 一直都在 package.json 裡卻從未被套用。
// 關閉 CSP 與 CORP：前端是由 nginx 另外服務的獨立來源，而 /uploads 的 PDF 需要被
// 前端以 <iframe>/window.open 內嵌，預設的 CSP 與跨來源資源政策會把這些擋掉。
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false
}));

// 最寬鬆的 CORS - 允許所有來源和方法
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 認證相關端點的速率限制：登入/註冊/改密碼都是猜密碼與帳號枚舉的目標，
// 在此之前完全沒有任何節流。只套用在 /api/auth，不影響一般瀏覽與檔案下載。
// 上限刻意不設太低：校園網路常有大量使用者共用同一個對外 IP，
// 而 express-rate-limit 預設是以 IP 計數，設太嚴會誤擋正常登入。
// 100 次/15 分鐘足以擋掉暴力破解（原本是完全無限制），又不至於影響正常使用。
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '嘗試次數過多，請稍後再試' }
});

// 設定字符編碼
app.use((req, res, next) => {
    res.charset = 'utf-8';
    next();
});

// ⚠️ 這裡原本是：app.use('/uploads', express.static(...))
//
// 已移除。它把整個 uploads 目錄無條件公開，配合當時公開的 GET /api/exams
// （沒有欄位白名單、直接回傳 question_file_path），任何人不必登入、不必繳費，
// 只要列出考古題就能拿到檔案路徑再直接下載——付費牆等同虛設（已實測重現）。
//
// 檔案一律只能透過有認證的端點取得：
//   GET /api/exams/:id/preview|download/...   （需 exams.download 權限）
//   GET /api/cheat-sheets/:id/preview|download（需登入）
// 這些端點會自行讀檔並串流回應，不需要靜態服務。
// 注意：nginx.conf 的 location /uploads/ 也必須一併移除，否則正式環境仍然繞得過去。

// 建立上傳目錄
const uploadDirs = [
    path.join(__dirname, '../../uploads/exams'),
    path.join(__dirname, '../../uploads/cheat_sheets'),
    path.join(__dirname, '../../uploads/temp')
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`建立目錄: ${dir}`);
    }
});

// API 路由
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// 模組 ↔ 路由的對應集中在這裡一處，不散落到各 route 檔。
// 中介層順序很重要：
//   tokenFromQuery → 先把 ?token= 搬進標頭（PDF 預覽用 window.open，帶不了標頭）
//   optionalAuth   → 認出身分但不強制登入（公開端點也要知道你是誰，管理員才能在模組未公開時測試）
//   requireModuleAccess → 模組未開放就 403
app.use('/api/exams', tokenFromQuery, optionalAuth, requireModuleAccess('exams'), examRoutes);
app.use('/api/cheat-sheets', tokenFromQuery, optionalAuth, requireModuleAccess('cheatSheets'), cheatSheetRoutes);
app.use('/api/course-reviews', optionalAuth, requireModuleAccess('courseReviews'), courseReviewRoutes);
// 課程目錄只服務「寫課程評價」表單的課程搜尋，歸屬於 courseReviews 模組
app.use('/api/course-catalog', optionalAuth, requireModuleAccess('courseReviews'), courseCatalogRoutes);
// 模組清單本身是公開端點（內部用 optionalAuth）：登出的訪客也需要知道
// 導覽列該顯示哪些項目，不能要求認證
app.use('/api/modules', moduleRoutes);
app.use('/api/roles', authenticateToken, roleRoutes);
// 公告同樣不能在這裡要求認證：訪客也看得到公告。
// 路由檔內部前台端點用 optionalAuth、管理端點各自掛 authenticateToken + requirePermission。
app.use('/api/announcements', announcementRoutes);

// admin 路由原本完全沒掛 authenticateToken（它自己有一套平行的認證實作），
// 現在統一走共用中介層，路由檔內各自再用 requirePermission 檢查權限
app.use('/api/admin', authenticateToken, adminRoutes);

// 健康檢查端點
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        cors: 'ALLOW_ALL',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// 錯誤處理中間件
app.use(errorHandler);

// 啟動伺服器
const server = app.listen(PORT, () => {
    console.log(`伺服器運行於 http://localhost:${PORT}`);
    console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS: 允許所有來源 (*)`);
});

// 優雅關閉
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信號，準備關閉伺服器...');
    server.close(() => {
        console.log('伺服器已關閉');
        process.exit(0);
    });
});

module.exports = app;