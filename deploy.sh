#!/bin/bash

# 台大資管系學會網站部署腳本
# 使用方法: ./deploy.sh

set -e

echo "🚀 開始部署台大資管系學會網站..."

# 確認在正確目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在專案根目錄執行此腳本"
    exit 1
fi

# 安裝前端依賴
echo "📦 安裝前端依賴..."
npm install

# 建置前端
echo "🔨 建置前端..."
npm run build

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

# 確保資料庫檔案存在且有正確權限
if [ -f "database/ntuim.db" ]; then
    chmod 664 database/ntuim.db
    echo "✅ 資料庫權限設定完成"
else
    echo "⚠️ 警告：資料庫檔案不存在，請先執行 npm run init-db"
fi

# 停止舊的 PM2 進程（如果存在）
pm2 delete ntuim-backend 2>/dev/null || echo "沒有舊的後端進程需要停止"

# 使用 PM2 啟動後端
echo "🔄 啟動後端服務..."
pm2 start ecosystem.config.js --env production

# 顯示服務狀態
pm2 status

echo "✅ 部署完成！"
echo ""
echo "📋 接下來請執行："
echo "1. 檢查服務狀態: pm2 status"
echo "2. 查看日誌: pm2 logs ntuim-backend"
echo "3. 設定開機自動啟動: pm2 startup && pm2 save"
echo "4. 確認網站可以正常訪問: https://ntu.im"
echo ""
echo "🔧 如果需要重新啟動服務："
echo "   pm2 restart ntuim-backend"