# 部署指南 - 台大資管系學會網站

---

## 🚨 權限系統重構版本的部署程序（一次性，只有這次需要）

這一版包含權限系統重構（身分組 + 模塊控制）、遷移基礎設施、以及一個付費牆漏洞的修補。
**有兩個步驟是 `./deploy.sh` 不會自動處理的**，漏掉會出問題：

1. **必須先建立遷移基準**，否則部署會中止（有防護，不會毀資料）
2. **必須手動更新 nginx 設定**，否則付費牆漏洞仍然存在

以下步驟請「照順序」執行。

### 步驟 0：本地推送

```bash
# 本地
git add .
git commit -m "權限系統重構：身分組、模塊控制、遷移基礎設施、修補 /uploads 漏洞"
git push origin main
```

### 步驟 1：SSH 進伺服器，記下可回滾的版本

```bash
ssh your-server
cd ~/NTUIM

# 記下目前版本，萬一要回滾會用到。請把這串 commit hash 複製下來另外保存
git rev-parse HEAD
```

### 步驟 2：手動備份資料庫（不要只依賴 deploy.sh 的自動備份）

```bash
cd ~/NTUIM/src/backend
mkdir -p database/backups
cp database/ntuim.db "database/backups/before_rbac_$(date +%Y%m%d_%H%M%S).db"
ls -lh database/backups/ | tail -3
```

> 為什麼要多備一份：`deploy.sh` 的自動備份只保留最近 10 個，頻繁部署會被輪替掉。
> 這是重大結構變更，留一份有明確檔名、不會被自動清掉的。

### 步驟 3：拉取新程式碼並建立遷移基準（**關鍵，不可略過**）

```bash
cd ~/NTUIM
git pull origin main

cd src/backend
npm install --production          # 遷移執行器需要用到既有的 sqlite3，通常已安裝

# 先看狀態：此時應顯示 7 個「待套用」
npm run migrate -- --status

# 建立基準：把 001~004 標記為「已套用」但不執行
npm run migrate -- --baseline

# 再看一次：001~004 應變成「已套用」，只剩 005~007 待套用
npm run migrate -- --status
```

**為什麼一定要做這步**：既有資料庫裡的 `001`~`004` 早就人工執行過了，而其中
`001`/`002` **含有 `DROP TABLE`**。若直接讓執行器跑，它會重跑這些檔案把資料表刪掉重建——
**那是合法 SQL，會成功提交，不會有任何錯誤提示**。執行器有內建防護會中止，
`deploy.sh` 也有前置檢查會在「動任何東西之前」就失敗，但仍請主動完成這一步。

### 步驟 4：執行部署

```bash
cd ~/NTUIM
./deploy.sh
```

過程中會看到：
- `✅ 遷移基準已建立（已套用 4 個遷移）` ← 前置檢查通過
- `套用 005_materialize_cpcap_admin.sql ... 成功`
- `套用 006_create_rbac_tables.sql ... 成功`
- `套用 007_backfill_user_roles.js ... 管理員身分組：N 位（...）`

**如果 007 顯示「回填後沒有任何使用者持有管理員身分組」並中止**，代表資料庫裡沒有
`role='admin'` 的帳號。遷移會整個回滾（資料無損），請先執行
`npm run grant-admin -- <你的帳號>` 指定管理員後再重跑 `./deploy.sh`。

### 步驟 5：手動更新 nginx（`deploy.sh` 不會做這件事）

`deploy.sh` 只會 `systemctl reload nginx`，**不會**把 repo 裡的 `nginx.conf` 複製到系統設定。
不做這步的話，付費牆漏洞在正式環境仍然存在（後端已擋，但 nginx 仍直接對外送檔）。

```bash
# 先確認你的站台設定檔實際位置（常見是這兩個之一）
ls -l /etc/nginx/sites-available/

# 備份現有設定
sudo cp /etc/nginx/sites-available/ntuim /etc/nginx/sites-available/ntuim.bak.$(date +%Y%m%d)

# 編輯設定，把 location /uploads/ 那一段改成 deny（可參考 repo 的 nginx.conf）
sudo nano /etc/nginx/sites-available/ntuim
```

要改成：

```nginx
location /uploads/ {
    deny all;
    return 403;
}
```

然後測試並套用：

```bash
sudo nginx -t          # 設定檔語法檢查，一定要先通過
sudo systemctl reload nginx
```

### 步驟 6：驗證

```bash
# 1. 後端有起來
pm2 status
pm2 logs ntuim-backend --lines 30

# 2. 健康檢查
curl -s https://ntu.im/api/health

# 3. 模塊清單（公開端點，應回傳三個模塊）
curl -s https://ntu.im/api/modules

# 4. 付費牆漏洞已封（應為 403 或 404，絕不能是 200 + PDF）
curl -s -o /dev/null -w "%{http_code}\n" https://ntu.im/uploads/exams/

# 5. 考古題列表不再洩漏檔案路徑（應搜不到 filePath）
curl -s "https://ntu.im/api/exams?limit=1" | grep -c "FilePath" || echo "0（正確）"

# 6. 確認管理員身分組有人
cd ~/NTUIM/src/backend && npm run grant-admin -- --list
```

接著用瀏覽器登入管理員帳號，確認：
- 管理員控制台看得到 9 個功能（3×3）
- 「身分組管理」列出管理員／總務／會員三個內建身分組
- 「模塊管理」三個模塊都是「公開」
- 考古題的預覽與下載正常

### 出問題怎麼辦

| 症狀 | 原因 | 處理 |
|---|---|---|
| `❌ 尚未建立遷移基準，已中止部署` | 沒做步驟 3 | 網站**未受影響**（前置檢查在動任何東西前就擋下）。執行 `npm run migrate -- --baseline` 後重跑 `./deploy.sh` |
| 遷移中途失敗 | SQL 或資料問題 | 該檔案的變更**已自動回滾**，帳本不會誤記。看錯誤訊息修正後重跑；資料無損 |
| 回填顯示「沒有任何管理員」 | 資料庫沒有 `role='admin'` 帳號 | 遷移已回滾。`npm run grant-admin -- <帳號>` 後重跑 |
| 後端起不來 | `.env` 的 `JWT_SECRET` 是佔位字串或太短 | `pm2 logs ntuim-backend` 會明確指出。編輯 `src/backend/.env` 填入真正的密鑰（≥32 字元）後 `pm2 restart ntuim-backend` |
| 登入後管理台一片空白／看不到任何功能 | 前端已更新但後端還是舊版（版本不一致） | `pm2 restart ntuim-backend`；若仍如此，看 `pm2 logs` 找後端啟動失敗的原因 |
| 所有人都進不了管理台 | 沒有人持有管理員身分組 | `cd src/backend && npm run grant-admin -- --list` 查看；必要時 `npm run grant-admin -- <帳號>` |
| PDF 預覽壞掉（401/403） | nginx 或後端設定問題 | 確認步驟 5 只擋了 `/uploads/`，**沒有**動到 `/api/` 的 proxy |
| 課程評價/考古題頁面顯示「即將推出」 | 該模塊被設成「限定」 | 管理台 → 模塊管理 → 改成「公開」 |

### 完整回滾

**好消息：程式碼可以直接回滾，資料不會壞。** 這次刻意保留了 `users.role` 與
`can_manage_payouts` 欄位並持續寫入，新的身分組資料表是「純新增」，
所以舊版程式碼在新的資料庫上仍可正常運作。

```bash
cd ~/NTUIM
git checkout <步驟 1 記下的 commit hash>
./deploy.sh
```

回滾後請注意兩件事：
1. **透過新介面指派的身分組不會反映到舊的 `role` 欄位**。若回滾前曾用新介面把某人設為管理員，
   回滾後他會失去權限——用 `npm run grant-admin -- <帳號>` 補回。
2. nginx 的 `/uploads/` 若已改成 deny，回滾程式碼後舊版前端仍然不需要它（舊版也是走 API 取檔），
   可以維持 deny 不動；付費牆漏洞保持關閉狀態。

**只有在資料真的損壞時**才需要還原資料庫（正常情況下用不到，因為遷移是交易式的）：

```bash
cd ~/NTUIM
./restore-db.sh                                    # 列出可用備份
./restore-db.sh before_rbac_20260804_120000.db     # 還原步驟 2 的備份
pm2 restart ntuim-backend
```

---

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

## 🗃️ 資料庫遷移

所有 schema 變更都放在 `src/backend/database/migrations/*.sql`,依檔名數字前綴順序執行,由 `schema_migrations` 表記錄已套用的檔案,同一個檔案不會被套用兩次。`./deploy.sh` 會在備份完資料庫之後自動執行 `npm run migrate`。

```bash
cd src/backend
npm run migrate                # 套用所有尚未執行的遷移
npm run migrate -- --status    # 只查看已套用/待套用,不做任何事
npm run migrate -- --baseline  # 標記現有遷移為已套用但不執行
```

### ⚠️ 首次導入遷移執行器:必須先建立基準

既有資料庫(含正式機)裡的 `001`~`004` 早就人工執行過了,而其中 `001`/`002` **內含 `DROP TABLE`**。若直接執行 `npm run migrate`,它會重跑這些檔案、把資料表刪掉重建——**那是合法 SQL,會成功提交,不會有任何錯誤提示**。

因此每個環境在導入這套機制時,都必須**先執行一次**:

```bash
cd ~/NTUIM/src/backend && npm run migrate -- --baseline
```

執行器有內建防護:偵測到「資料庫已有資料表但帳本是空的」會直接中止並要求你先建立基準,所以正常情況下不會誤觸。但仍請在第一次部署前手動完成這一步。

### 權限救援

若不小心把最後一位管理員降權或刪除,可直接在伺服器上復原:

```bash
cd src/backend
npm run grant-admin -- --list          # 查看目前的管理員
npm run grant-admin -- <username>      # 授予管理員權限
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