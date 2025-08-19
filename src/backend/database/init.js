const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 資料庫檔案路徑
const DB_PATH = path.join(__dirname, 'ntuim.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// 初始化資料庫
function initDatabase() {
    return new Promise((resolve, reject) => {
        // 建立或開啟資料庫
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('無法開啟資料庫:', err);
                reject(err);
                return;
            }
            console.log('已連接到 SQLite 資料庫');
        });

        // 讀取 schema.sql
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        
        // 檢查是否已有 users 表
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
            if (err) {
                console.error('檢查資料表失敗:', err);
                reject(err);
                return;
            }
            
            if (row) {
                console.log('資料庫已存在，跳過架構建立');
                insertTestData(db)
                    .then(() => {
                        db.close();
                        resolve();
                    })
                    .catch(reject);
                return;
            }
            
            // 執行 schema
            db.exec(schema, (err) => {
                if (err) {
                    console.error('執行 schema 失敗:', err);
                    reject(err);
                    return;
                }
                console.log('資料庫架構建立成功');
                
                // 插入測試資料
                insertTestData(db)
                    .then(() => {
                        db.close();
                        resolve();
                    })
                    .catch(reject);
            });
        });
    });
}

// 插入測試資料
function insertTestData(db) {
    return new Promise((resolve, reject) => {
        const bcrypt = require('bcryptjs');
        
        // 建立測試使用者
        const testUsers = [
            {
                student_id: 'B09705001',
                username: 'admin',
                email: 'admin@ntu.edu.tw',
                password: 'admin123',
                full_name: '系統管理員',
                role: 'admin',
                has_paid_fee: true
            },
            {
                student_id: 'B09705002',
                username: 'test_user',
                email: 'test@ntu.edu.tw',
                password: 'test123',
                full_name: '測試使用者',
                role: 'member',
                has_paid_fee: true
            },
            {
                student_id: 'B09705003',
                username: 'guest',
                email: 'guest@ntu.edu.tw',
                password: 'guest123',
                full_name: '訪客使用者',
                role: 'user',
                has_paid_fee: false
            }
        ];

        // 插入使用者
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO users 
            (student_id, username, email, password_hash, full_name, role, has_paid_fee)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        testUsers.forEach(user => {
            const passwordHash = bcrypt.hashSync(user.password, 10);
            stmt.run(
                user.student_id,
                user.username,
                user.email,
                passwordHash,
                user.full_name,
                user.role,
                user.has_paid_fee
            );
        });

        stmt.finalize();
        
        console.log('測試資料插入成功');
        resolve();
    });
}

// 如果直接執行此檔案，則初始化資料庫
if (require.main === module) {
    initDatabase()
        .then(() => {
            console.log('資料庫初始化完成');
            process.exit(0);
        })
        .catch(err => {
            console.error('資料庫初始化失敗:', err);
            process.exit(1);
        });
}

module.exports = { initDatabase, DB_PATH };