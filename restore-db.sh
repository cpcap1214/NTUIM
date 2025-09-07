#!/bin/bash

# 資料庫還原腳本
# 使用方法: ./restore-db.sh [備份檔案名稱]

set -e

echo "🔄 台大資管系學會網站 - 資料庫還原工具"
echo ""

# 切換到後端目錄
cd src/backend

# 備份目錄
BACKUP_DIR="database/backups"

# 檢查備份目錄是否存在
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ 錯誤：備份目錄不存在"
    exit 1
fi

# 如果沒有提供參數，列出可用的備份
if [ $# -eq 0 ]; then
    echo "📋 可用的備份檔案："
    echo ""
    
    # 列出所有備份檔案
    if ls "$BACKUP_DIR"/ntuim_backup_*.db.gz 1> /dev/null 2>&1; then
        ls -lht "$BACKUP_DIR"/ntuim_backup_*.db.gz | head -20 | awk '{print NR". " $9 " (" $5 ")"}'
        echo ""
        echo "使用方法: ./restore-db.sh <備份檔案名稱>"
        echo "範例: ./restore-db.sh ntuim_backup_20250107_143000.db.gz"
    else
        echo "❌ 沒有找到任何備份檔案"
        exit 1
    fi
    exit 0
fi

BACKUP_FILE="$1"

# 如果只提供檔名，加上完整路徑
if [[ ! "$BACKUP_FILE" == */* ]]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
fi

# 檢查備份檔案是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 錯誤：備份檔案不存在: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  警告：此操作將覆蓋現有的資料庫！"
echo "📦 準備還原: $BACKUP_FILE"
echo ""
read -p "確定要繼續嗎？(yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

# 先備份當前資料庫
if [ -f "database/ntuim.db" ]; then
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    CURRENT_BACKUP="$BACKUP_DIR/ntuim_before_restore_${TIMESTAMP}.db"
    echo "💾 備份當前資料庫到: $CURRENT_BACKUP"
    cp "database/ntuim.db" "$CURRENT_BACKUP"
    gzip "$CURRENT_BACKUP"
    echo "✅ 當前資料庫已備份"
fi

# 解壓縮並還原資料庫
echo "🔄 開始還原資料庫..."
TEMP_FILE="/tmp/ntuim_restore_$(date +%s).db"

# 解壓縮備份檔案
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

# 檢查解壓縮的檔案是否為有效的 SQLite 資料庫
if ! sqlite3 "$TEMP_FILE" "SELECT COUNT(*) FROM sqlite_master;" > /dev/null 2>&1; then
    echo "❌ 錯誤：備份檔案不是有效的 SQLite 資料庫"
    rm -f "$TEMP_FILE"
    exit 1
fi

# 替換資料庫檔案
mv "$TEMP_FILE" "database/ntuim.db"

# 設定正確的權限
chmod 664 "database/ntuim.db"

echo "✅ 資料庫還原成功！"
echo ""
echo "📊 資料庫統計："
echo "- 使用者數量: $(sqlite3 database/ntuim.db "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "N/A")"
echo "- 考古題數量: $(sqlite3 database/ntuim.db "SELECT COUNT(*) FROM exams;" 2>/dev/null || echo "N/A")"
echo "- 大抄數量: $(sqlite3 database/ntuim.db "SELECT COUNT(*) FROM cheat_sheets;" 2>/dev/null || echo "N/A")"
echo "- 課程評價數量: $(sqlite3 database/ntuim.db "SELECT COUNT(*) FROM course_reviews;" 2>/dev/null || echo "N/A")"
echo ""
echo "🔧 後續步驟："
echo "1. 重新啟動後端服務: pm2 restart ntuim-backend"
echo "2. 檢查網站功能是否正常"
echo ""