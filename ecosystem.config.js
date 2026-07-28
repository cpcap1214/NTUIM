// 注意：JWT_SECRET / SESSION_SECRET 等機密值不可寫在這個檔案裡（會被 git 追蹤）。
// 這些值必須只存在於伺服器上的 src/backend/.env（不進 git），由 server.js 的
// dotenv 讀取。PM2 這裡只放非機密的部署參數。
module.exports = {
  apps: [{
    name: 'ntuim-backend',
    script: './src/backend/server.js',
    cwd: '/home/cpcap1214/NTUIM',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001,
      FRONTEND_URL: 'https://ntu.im',
      UPLOAD_PATH: '/var/www/ntuim/uploads',
      DB_PATH: './database/ntuim.db',
      CORS_ORIGIN: 'https://ntu.im',
      BCRYPT_ROUNDS: 12,
      MAX_FILE_SIZE: 10485760,
      ALLOWED_FILE_TYPES: 'application/pdf'
    }
  }]
};