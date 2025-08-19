// 錯誤處理中間件
const errorHandler = (err, req, res, next) => {
    // 記錄錯誤
    console.error('錯誤時間:', new Date().toISOString());
    console.error('錯誤路徑:', req.path);
    console.error('錯誤詳情:', err);

    // Sequelize 錯誤處理
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: '資料驗證失敗',
            details: err.errors.map(e => ({
                field: e.path,
                message: e.message
            }))
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            error: '資料重複',
            details: err.errors.map(e => ({
                field: e.path,
                value: e.value,
                message: `此 ${e.path} 已存在`
            }))
        });
    }

    if (err.name === 'SequelizeDatabaseError') {
        return res.status(500).json({
            error: '資料庫錯誤',
            message: process.env.NODE_ENV === 'development' ? err.message : '資料庫操作失敗'
        });
    }

    // JWT 錯誤處理
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: '認證失敗',
            message: '無效的認證令牌'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: '認證過期',
            message: '認證令牌已過期，請重新登入'
        });
    }

    // Multer 檔案上傳錯誤
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: '檔案太大',
                message: `檔案大小超過限制 (最大: ${process.env.UPLOAD_MAX_SIZE || '10MB'})`
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: '檔案數量過多',
                message: '一次只能上傳一個檔案'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: '非預期的欄位',
                message: '檔案欄位名稱錯誤'
            });
        }
    }

    // 自定義業務邏輯錯誤
    if (err.status) {
        return res.status(err.status).json({
            error: err.message || '請求錯誤',
            ...(err.details && { details: err.details })
        });
    }

    // 預設錯誤處理
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        error: '伺服器內部錯誤',
        message: isDevelopment ? err.message : '處理請求時發生錯誤',
        ...(isDevelopment && { stack: err.stack })
    });
};

// 404 處理
const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: '找不到資源',
        message: `路徑 ${req.originalUrl} 不存在`,
        method: req.method
    });
};

// 非同步錯誤包裝器
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// 建立自定義錯誤類別
class AppError extends Error {
    constructor(message, status = 500, details = null) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'AppError';
    }
}

class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, details);
        this.name = 'ValidationError';
    }
}

class AuthenticationError extends AppError {
    constructor(message = '認證失敗') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends AppError {
    constructor(message = '權限不足') {
        super(message, 403);
        this.name = 'AuthorizationError';
    }
}

class NotFoundError extends AppError {
    constructor(resource = '資源') {
        super(`找不到指定的${resource}`, 404);
        this.name = 'NotFoundError';
    }
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError
};