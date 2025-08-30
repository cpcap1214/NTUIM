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
      JWT_SECRET: 'ntuim-super-secure-jwt-secret-key-2025',
      UPLOAD_PATH: '/var/www/ntuim/uploads',
      DB_PATH: './database/ntuim.db',
      CORS_ORIGIN: 'https://ntu.im',
      SESSION_SECRET: 'ntuim-session-secret-2025',
      BCRYPT_ROUNDS: 12,
      MAX_FILE_SIZE: 10485760,
      ALLOWED_FILE_TYPES: 'application/pdf'
    }
  }]
};