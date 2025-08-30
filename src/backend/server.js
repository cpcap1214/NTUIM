const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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

// 中間件設定
// 最寬鬆的 CORS 設定 - 允許任何來源
const corsOptions = {
    origin: '*',  // 允許所有來源
    credentials: false,  // 關閉 credentials 以相容 origin: '*'
    methods: '*',  // 允許所有方法
    allowedHeaders: '*'  // 允許所有標頭
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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