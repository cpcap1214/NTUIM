#!/bin/bash

# 台大資管系學會網站 - 考古題系統雙檔案功能部署腳本
# 執行前請確認：
# 1. 已經 git push 最新程式碼到遠端倉庫
# 2. 已經備份重要的考古題資料

echo "🚀 開始部署考古題雙檔案系統更新..."

# 1. 進入專案目錄
cd ~/NTUIM || exit 1
echo "📂 進入專案目錄: $(pwd)"

# 2. 拉取最新程式碼
echo "📥 拉取最新程式碼..."
git pull origin main

# 3. 停止後端服務
echo "🛑 停止後端服務..."
pm2 stop ntuim-backend

# 4. 備份現有資料庫（可選但建議）
echo "💾 備份現有資料庫..."
cp src/backend/database/ntuim.db src/backend/database/ntuim.db.backup.$(date +%Y%m%d_%H%M%S)

# 5. 執行資料庫結構更新
echo "🗄️ 更新資料庫結構..."
# 註：此檔已移入遷移目錄並改由遷移執行器管理（database/migrations/001_update_exams_table.sql）。
# 這支一次性腳本保留作為歷史紀錄；新的部署請改用 deploy.sh，它會自動執行 npm run migrate。
sqlite3 src/backend/database/ntuim.db < src/backend/database/migrations/001_update_exams_table.sql

# 6. 驗證資料庫結構
echo "✅ 驗證資料庫結構..."
sqlite3 src/backend/database/ntuim.db ".schema exams"

# 7. 重新啟動後端服務
echo "🔄 重新啟動後端服務..."
pm2 start ntuim-backend

# 8. 檢查服務狀態
echo "📊 檢查服務狀態..."
pm2 status ntuim-backend

# 9. 檢查後端日誌
echo "📋 檢查後端日誌 (最後 10 行)..."
pm2 logs ntuim-backend --lines 10

echo "🎉 部署完成！"
echo "📝 請測試以下功能："
echo "   1. 管理員上傳考古題（題目檔案 + 可選答案檔案）"
echo "   2. 學生瀏覽和下載考古題"
echo "   3. 預覽功能是否正常運作"

echo ""
echo "🔍 如果遇到問題，請檢查："
echo "   - pm2 logs ntuim-backend"
echo "   - 資料庫檔案權限"
echo "   - 上傳目錄權限"