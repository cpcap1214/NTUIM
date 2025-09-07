# 部署指南 - 台大資管系學會網站

## ⚠️ 重要：資料庫管理

### 資料庫檔案說明
- `src/backend/database/ntuim.db` - **已被 .gitignore 忽略，不會推送到 git**
- 本地和遠端的資料庫是獨立的，不會互相覆蓋

### 部署流程

#### 1. 首次部署（遠端伺服器上沒有資料庫）
```bash
# SSH 到伺服器
ssh your-server

# 拉取程式碼
git pull origin main

# 執行部署腳本
./deploy.sh

# 初始化資料庫（只在首次需要）
cd src/backend
npm run init-db
```

#### 2. 更新部署（保留遠端資料庫）
```bash
# 在本地開發完成後
git add .
git commit -m "你的更新內容"
git push origin main

# SSH 到伺服器
ssh your-server

# 執行部署（會自動備份遠端資料庫）
./deploy.sh
```

## 📦 資料庫備份與還原

### 自動備份
- 每次執行 `./deploy.sh` 會自動備份
- 備份位置：`src/backend/database/backups/`
- 格式：`ntuim_backup_YYYYMMDD_HHMMSS.db.gz`

### 手動備份（在伺服器上）
```bash
cd src/backend
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
cp database/ntuim.db database/backups/ntuim_manual_${TIMESTAMP}.db
gzip database/backups/ntuim_manual_${TIMESTAMP}.db
```

### 還原資料庫
```bash
# 列出可用備份
./restore-db.sh

# 還原特定備份
./restore-db.sh ntuim_backup_20250107_143000.db.gz
```

## 🔄 資料庫同步（如需要）

### 從遠端下載資料庫到本地（小心使用）
```bash
# 在本地執行
scp user@server:/path/to/src/backend/database/ntuim.db ./src/backend/database/ntuim_from_server.db
```

### 從本地上傳資料庫到遠端（非常小心使用）
```bash
# 先備份遠端資料庫
ssh user@server "cd /path/to/project && ./deploy.sh"

# 上傳本地資料庫
scp ./src/backend/database/ntuim.db user@server:/path/to/src/backend/database/ntuim_new.db

# 在伺服器上替換
ssh user@server "cd /path/to/src/backend && mv database/ntuim_new.db database/ntuim.db"
```

## ✅ 最佳實踐

1. **永遠不要**將資料庫檔案加入 git
2. **總是**在修改資料庫前備份
3. **定期**下載遠端備份到本地保存
4. **測試**還原流程確保備份可用

## 🚨 緊急情況

如果不小心覆蓋了資料庫：
1. 立即停止所有操作
2. 使用 `./restore-db.sh` 查看可用備份
3. 選擇最近的備份進行還原
4. 重啟後端服務：`pm2 restart ntuim-backend`