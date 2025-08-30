const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 設定儲存位置和檔名
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = path.join(__dirname, '../../../uploads/temp');
        
        // 根據上傳類型決定目錄
        if (req.baseUrl.includes('exams')) {
            const year = req.body.year || new Date().getFullYear();
            const semester = req.body.semester || '1';
            const courseCode = req.body.courseCode || 'unknown';
            uploadPath = path.join(__dirname, `../../../uploads/exams/${year}/${semester}/${courseCode}`);
        } else if (req.baseUrl.includes('cheat-sheets')) {
            const courseCode = req.body.courseCode || 'unknown';
            uploadPath = path.join(__dirname, `../../../uploads/cheat_sheets/${courseCode}`);
        }

        // 確保目錄存在
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // 產生唯一檔名
        const uniqueSuffix = crypto.randomBytes(6).toString('hex');
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        // 移除特殊字元
        const safeName = basename.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, '_');
        cb(null, `${safeName}_${uniqueSuffix}${ext}`);
    }
});

// 檔案過濾器
const fileFilter = (req, file, cb) => {
    // 允許的檔案類型
    const allowedTypes = process.env.ALLOWED_FILE_TYPES 
        ? process.env.ALLOWED_FILE_TYPES.split(',')
        : ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png'];
    
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`不支援的檔案類型: ${ext}。允許的類型: ${allowedTypes.join(', ')}`), false);
    }
};

// PDF 專用檔案過濾器（管理員上傳）
const pdfFileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('只允許上傳 PDF 檔案'), false);
    }
};

// 建立 multer 實例
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024 // 預設 10MB
    }
});

// 建立專門用於管理員上傳的 multer 實例（只接受 PDF）
const adminUpload = multer({
    storage: storage,
    fileFilter: pdfFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// 處理上傳錯誤的中間件
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'FILE_TOO_LARGE') {
            return res.status(400).json({ error: '檔案大小超過限制' });
        }
        return res.status(400).json({ error: `上傳錯誤: ${error.message}` });
    } else if (error) {
        return res.status(400).json({ error: error.message });
    }
    next();
};

// 清理暫存檔案
const cleanupTempFiles = () => {
    const tempDir = path.join(__dirname, '../../../uploads/temp');
    if (!fs.existsSync(tempDir)) return;

    fs.readdir(tempDir, (err, files) => {
        if (err) {
            console.error('讀取暫存目錄失敗:', err);
            return;
        }

        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24小時

        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                
                // 刪除超過24小時的暫存檔案
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlink(filePath, err => {
                        if (err) console.error('刪除暫存檔案失敗:', err);
                        else console.log('已刪除暫存檔案:', file);
                    });
                }
            });
        });
    });
};

// 每小時清理一次暫存檔案
setInterval(cleanupTempFiles, 60 * 60 * 1000);

module.exports = {
    upload,
    adminUpload,
    handleUploadError,
    cleanupTempFiles
};