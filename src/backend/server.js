const express = require('express');
const cors = require('cors');
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
const adminRoutes = require('./routes/admin');

// 引入中間件
const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// 初始化 Express
const app = express();
const PORT = process.env.PORT || 5001;

// 最寬鬆的 CORS - 允許所有來源和方法
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 設定字符編碼
app.use((req, res, next) => {
    res.charset = 'utf-8';
    next();
});

// 靜態檔案服務（用於提供上傳的檔案）
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

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
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/cheat-sheets', cheatSheetRoutes);
app.use('/api/course-reviews', courseReviewRoutes);
app.use('/api/admin', adminRoutes);

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