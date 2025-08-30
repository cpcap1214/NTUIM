# Linux 主機部署指南

## 🚀 部署步驟

### 1. 在 Linux 主機上準備環境

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Node.js (建議使用 NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 驗證安裝
node --version  # 應該 >= 14.0.0
npm --version

# 安裝 PM2 (生產環境進程管理)
sudo npm install -g pm2

# 安裝 Nginx (作為反向代理)
sudo apt install nginx -y
```

### 2. 克隆並設置專案

```bash
# 克隆專案
git clone <your-repo-url> ntuim-website
cd ntuim-website

# 安裝前端依賴並建置
npm install
npm run build

# 安裝後端依賴
cd src/backend
npm install

# 初始化資料庫
npm run init-db
```

### 3. 設定環境變數

```bash
# 在 src/backend/ 目錄下建立 .env 檔案
cd src/backend
cat > .env << 'EOF'
NODE_ENV=production
PORT=5001
FRONTEND_URL=http://your-domain.com
JWT_SECRET=your-super-secure-jwt-secret-key-here
UPLOAD_PATH=/var/www/ntuim/uploads
EOF
```

### 4. 設定資料庫和檔案權限

```bash
# 建立上傳目錄
sudo mkdir -p /var/www/ntuim/uploads/{exams,cheat_sheets,temp}
sudo chown -R $USER:$USER /var/www/ntuim/uploads
chmod -R 755 /var/www/ntuim/uploads

# 設定資料庫權限
chmod 664 database/ntuim.db
```

### 5. 設定 Nginx 反向代理

```bash
# 建立 Nginx 配置檔案
sudo tee /etc/nginx/sites-available/ntuim << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 替換為您的域名

    # 前端靜態檔案
    location / {
        root /path/to/ntuim-website/build;  # 替換為實際路徑
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 後端 API
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 上傳檔案服務
    location /uploads/ {
        alias /var/www/ntuim/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 啟用站點
sudo ln -s /etc/nginx/sites-available/ntuim /etc/nginx/sites-enabled/
sudo nginx -t  # 測試配置
sudo systemctl reload nginx
```

### 6. 使用 PM2 啟動後端服務

```bash
# 在 src/backend 目錄下
cd src/backend

# 使用 PM2 啟動
pm2 start server.js --name "ntuim-backend"

# 設定開機自動啟動
pm2 startup
pm2 save
```

### 7. 設定防火牆和安全性

```bash
# 開啟必要的端口
sudo ufw allow 22   # SSH
sudo ufw allow 80   # HTTP
sudo ufw allow 443  # HTTPS (如果使用 SSL)
sudo ufw enable

# 設定 SSL (推薦使用 Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 🔄 日常維護指令

```bash
# 查看後端服務狀態
pm2 status
pm2 logs ntuim-backend

# 重啟後端服務
pm2 restart ntuim-backend

# 更新程式碼
git pull origin main
npm run build  # 重新建置前端
pm2 restart ntuim-backend  # 重啟後端

# 備份資料庫
cp src/backend/database/ntuim.db backup/ntuim_$(date +%Y%m%d_%H%M%S).db
```

## ⚠️ 重要注意事項

1. **環境變數**：確保 `.env` 檔案設定正確的生產環境變數
2. **資料庫**：SQLite 檔案權限設定正確
3. **上傳目錄**：確保有足夠的磁碟空間和正確權限
4. **域名設定**：修改 Nginx 配置中的域名
5. **SSL 憑證**：生產環境建議使用 HTTPS
6. **定期備份**：設定自動備份資料庫和上傳檔案

## 🚨 故障排除

- **502 Bad Gateway**：檢查後端服務是否運行 `pm2 status`
- **檔案上傳失敗**：檢查上傳目錄權限
- **資料庫錯誤**：檢查 SQLite 檔案權限
- **API 無法存取**：檢查 Nginx 配置和防火牆設定