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

# 前置檢查：資料庫遷移是否可以順利套用
#
# 這一步刻意放在「建置與複製前端之前」。本腳本有 set -e，而遷移是在後端階段才執行；
# 若等到那時才失敗，前端新版已經複製到 /var/www 且 nginx 已重載，後端卻還是舊的，
# 會留下前後端版本不一致的中間狀態。在這裡先失敗，網站維持完整的舊版本。
echo "🔍 檢查資料庫遷移狀態..."
if [ -f "src/backend/database/ntuim.db" ] && [ -f "src/backend/database/migrate.js" ]; then
    if ! (cd src/backend && npm run migrate --silent -- --status > /dev/null 2>&1); then
        echo "❌ 無法讀取遷移狀態，請先手動檢查："
        echo "   cd src/backend && npm run migrate -- --status"
        exit 1
    fi
    # 帳本是空的但資料表已存在 → 尚未建立基準，直接跑會重跑含 DROP TABLE 的舊遷移
    LEDGER_COUNT=$(cd src/backend && node -e "
        const s=require('sqlite3').verbose();
        const db=new s.Database('./database/ntuim.db', s.OPEN_READONLY);
        db.get(\"SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name='schema_migrations'\", (e,r)=>{
            if (e || !r || r.c === 0) { console.log('0'); db.close(); return; }
            db.get('SELECT COUNT(*) c FROM schema_migrations', (e2,r2)=>{ console.log(e2?'0':String(r2.c)); db.close(); });
        });
    " 2>/dev/null || echo "0")
    if [ "$LEDGER_COUNT" = "0" ]; then
        echo ""
        echo "❌ 尚未建立遷移基準，已中止部署（網站維持原狀，未做任何變更）"
        echo ""
        echo "   這是第一次導入遷移執行器時的必要步驟。現有資料庫裡的舊遷移"
        echo "   （其中含 DROP TABLE）早就人工套用過，直接執行會清空資料表。"
        echo ""
        echo "   請先執行一次，再重新部署："
        echo "     cd src/backend && npm run migrate -- --baseline"
        echo ""
        exit 1
    fi
    echo "✅ 遷移基準已建立（已套用 $LEDGER_COUNT 個遷移）"
fi

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

    # 套用資料庫遷移（在備份之後、重啟後端之前）
    # ⚠️ 首次導入遷移執行器時，必須先在伺服器上手動執行一次：
    #      cd ~/NTUIM/src/backend && npm run migrate -- --baseline
    #    否則這裡會中止，因為舊遷移（含 DROP TABLE）早就人工套用過了
    echo "🗃️ 套用資料庫遷移..."
    npm run migrate
    echo "✅ 資料庫遷移完成"

    # 事後檢查：確認權限系統的資料表真的存在。
    # 光看 schema_migrations 帳本是不夠的——帳本可能因為 --baseline 標記過頭而
    # 顯示「全部已套用」，實際上建表的遷移根本沒跑過，後端會在啟動後才全站報錯。
    echo "🔍 驗證權限資料表..."
    RBAC_TABLES=$(node -e "
        const s=require('sqlite3').verbose();
        const db=new s.Database('./database/ntuim.db', s.OPEN_READONLY);
        db.get(\"SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name IN ('roles','role_permissions','user_roles','modules','module_access')\",
            (e,r)=>{ console.log(e?'0':String(r.c)); db.close(); });
    " 2>/dev/null || echo "0")
    if [ "$RBAC_TABLES" != "5" ]; then
        echo ""
        echo "❌ 權限資料表不完整（找到 $RBAC_TABLES / 5），已中止，不會重啟後端"
        echo "   舊的後端仍在執行，網站維持可用。"
        echo ""
        echo "   最常見原因：--baseline 把尚未執行的遷移一併標記成已套用。"
        echo "   檢查：npm run migrate -- --status"
        echo ""
        exit 1
    fi
    echo "✅ 權限資料表齊全"
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