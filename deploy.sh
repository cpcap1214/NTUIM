#!/bin/bash

# 台大資管系學會網站部署腳本
# 使用方法: ./deploy.sh

set -e

echo "🚀 開始部署台大資管系學會網站..."

# 檢查是否為 root 用戶
if [ "$EUID" -eq 0 ]; then
    echo "❌ 錯誤：請勿使用 root 用戶執行此腳本"
    exit 1
fi

# 確認在正確目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在專案根目錄執行此腳本"
    exit 1
fi

# 拉取最新代碼
echo "📥 拉取最新代碼..."
git pull origin main

# 安裝前端依賴
echo "📦 安裝前端依賴..."
npm install

# 檢查並複製環境變數檔案
if [ -f ".env.production" ]; then
    echo "⚙️ 設定前端生產環境變數..."
    cp .env.production .env.local
elif [ ! -f ".env.local" ]; then
    echo "⚠️ 警告：找不到 .env.production，請確認環境變數設定"
fi

# 建置前端
echo "🔨 建置前端..."
if npm run build 2>/dev/null; then
    echo "✅ 前端建置成功"
    
    # 建立部署目錄
    echo "📁 建立前端部署目錄..."
    sudo mkdir -p /var/www/ntuim
    
    # 複製建置檔案到部署目錄
    echo "📋 複製前端檔案到部署目錄..."
    sudo cp -r build /var/www/ntuim/
    sudo chown -R www-data:www-data /var/www/ntuim
    sudo chmod -R 755 /var/www/ntuim
    
    # 重新載入 nginx
    echo "🔄 重新載入 nginx..."
    sudo systemctl reload nginx
    
    echo "✅ 前端檔案部署完成"
else
    echo "⚠️ 前端建置命令不存在，跳過建置步驟"
fi

# 進入後端目錄
cd src/backend

# 安裝後端依賴
echo "📦 安裝後端依賴..."
npm install --production

# 建立必要目錄
echo "📁 建立上傳目錄..."
sudo mkdir -p /var/www/ntuim/uploads/{exams,cheat_sheets,temp}
sudo chown -R $USER:$USER /var/www/ntuim/uploads
chmod -R 755 /var/www/ntuim/uploads

# 建立日誌目錄
mkdir -p logs

# 複製生產環境配置
if [ ! -f ".env" ]; then
    echo "⚙️ 設定環境變數..."
    cp .env.production .env
    echo "✅ 請檢查並修改 .env 檔案中的設定"
fi

# 資料庫備份與管理
echo "💾 處理資料庫..."

# 建立備份目錄
BACKUP_DIR="database/backups"
mkdir -p "$BACKUP_DIR"

# 如果資料庫存在，先備份
if [ -f "database/ntuim.db" ]; then
    # 產生時間戳記的備份檔名
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/ntuim_backup_${TIMESTAMP}.db"
    
    echo "📦 備份現有資料庫到: $BACKUP_FILE"
    cp "database/ntuim.db" "$BACKUP_FILE"
    
    # 壓縮備份檔案以節省空間
    gzip "$BACKUP_FILE"
    echo "✅ 資料庫備份完成: ${BACKUP_FILE}.gz"
    
    # 保留最近 10 個備份，刪除較舊的
    echo "🧹 清理舊備份檔案..."
    ls -t "$BACKUP_DIR"/ntuim_backup_*.db.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
    
    # 設定資料庫權限
    chmod 664 database/ntuim.db
    echo "✅ 資料庫權限設定完成"
else
    echo "⚠️ 警告：資料庫檔案不存在"
    echo "📝 如果是首次部署，請執行以下命令初始化資料庫："
    echo "   npm run init-db"
    echo "❗ 注意：不會自動建立新資料庫，以避免覆蓋現有資料"
fi

# 檢查 PM2 是否安裝
if ! command -v pm2 &> /dev/null; then
    echo "🔄 安裝 PM2..."
    npm install -g pm2
fi

# 停止舊的 PM2 進程（如果存在）
pm2 delete ntuim-backend 2>/dev/null || echo "沒有舊的後端進程需要停止"

# 使用 PM2 啟動後端
echo "🔄 啟動後端服務..."
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
else
    # 如果沒有 ecosystem.config.js，直接啟動 server.js
    pm2 start server.js --name ntuim-backend --env production
fi

# 儲存 PM2 配置
pm2 save

# 顯示服務狀態
pm2 status

# 回到專案根目錄
cd ../..

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 服務管理命令："
echo "  • 查看狀態: pm2 status"
echo "  • 查看日誌: pm2 logs ntuim-backend"
echo "  • 重新啟動: pm2 restart ntuim-backend"
echo "  • 停止服務: pm2 stop ntuim-backend"
echo ""
echo "🔧 系統設定："
echo "  • 設定開機自動啟動: sudo pm2 startup && pm2 save"
echo "  • 確認網站訪問: https://ntu.im"
echo ""
echo "📊 監控："
echo "  • PM2 網頁監控: pm2 web"
echo "  • 即時日誌: pm2 logs --lines 50"