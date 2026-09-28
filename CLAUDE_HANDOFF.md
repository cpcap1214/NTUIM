# Claude Code 交接文件

給在**另一台裝置**上接手這個專案的 Claude Code。開工前先讀完這份，再依需要讀 `HANDOVER.md`（給人看的系學會交接手冊）與 `DEPLOYMENT.md`（部署）。

> `CLAUDE.md` 在 `.gitignore` 裡（維護者刻意不進版控），所以這份用另一個檔名，才能跟著 git 到新裝置。
> 舊裝置上的 Claude 記憶資料夾是空的，沒有需要搬移的內容。

最後更新：2026-09-29

---

## 1. 專案一句話

台大資管系學會網站。前端 React（CRA + MUI + react-i18next，中英雙語）在 `src/main/js/`；後端 Express + Sequelize + SQLite 在 `src/backend/`（**有自己的 `package.json`**）。正式站 `https://ntu.im`，pm2 + nginx，用 `./deploy.sh` 部署。

## 2. 新裝置環境建置

```bash
node -v                      # 舊裝置是 v22.17.0
npm install                  # 根目錄（前端）
cd src/backend && npm install   # 後端要另外裝
```

**後端 `.env`**（不進 git）：複製 `src/backend/.env.example` 成 `src/backend/.env`。`JWT_SECRET` 必須 ≥ 32 字元且不是佔位字串，否則 `server.js` 啟動就退出：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**資料庫：從舊裝置複製，不要從頭建。**
- `src/backend/database/ntuim.db` 在 `.gitignore` 裡，要手動從舊裝置拷過來（約 8 MB）。
  - 複製前先停掉舊裝置的後端，或用 `VACUUM INTO` 產生快照（見第 6 節）。資料庫開 WAL，只拷 `.db` 可能漏掉還在 `-wal` 裡的交易。
- ⚠️ **從頭建的路徑是壞的**（既有問題，非本輪造成，已實測確認）：`npm run init-db` 用的 `schema.sql` 已經含有 `can_manage_payouts`、`is_paid` 等欄位，接著跑 `migrate -- --baseline` → `migrate` 時會在 `004_add_payout_tracking.sql` 以 `duplicate column name` 失敗。修它是另一件事，目前不要走這條路。
- `uploads/` 也不進版控，舊裝置上是空的；考古題 PDF 的預覽/下載在本機會 404，屬正常。

**啟動**

```bash
cd src/backend && npm run dev     # nodemon，port 5000
npm start                         # 根目錄，port 3000；API 位址來自 .env.development 的 REACT_APP_API_URL
```

本機資料庫裡的測試帳號（`init.js` 種的）：`admin/admin123`（管理員）、`guest/guest123`（無身分組、未繳費）。`test_user` 的本機密碼不是 `test123`，要用就在後台替它重設。

## 3. 上一個 commit 做了什麼

兩件事一起 commit：權限系統收尾、忘記密碼重設。

### 3.1 權限系統收尾（身分組 RBAC）

- **授權只看身分組**（`user_roles` + `role_permissions`），權限 key 定義在 `src/backend/config/permissions.js`。
  - `users.role` 與 `users.can_manage_payouts` 已停用，程式碼完全不讀寫。欄位留在資料庫只為程式碼回滾。
  - 唯一例外是 `init.js` 的種子資料：全新資料庫的 migration 007 要靠它找第一位管理員。
- **管理員**＝持有任一帶 `*` 權限的身分組，不綁 `key='admin'`。「不可移除最後一位管理員」統一走 `permissionService.countSuperusers()`。
- `015_finalize_rbac.js`：補種內建身分組、檢查至少一位管理員、列出新舊欄位不一致的帳號（只列不改）。
- `database/grant-admin.js` 改成寫 `user_roles`。舊版只寫 `role` 欄位，執行成功卻沒有效果。
- 前端權限判斷一律 `useAuth().hasPermission('<key>')`。
  - 後台門禁與導覽列的管理選單共用 `src/main/js/config/adminConsole.js`。
  - 拒絕畫面統一用 `components/common/PermissionDenied.js`。
  - 身分組標籤統一用 `components/common/RoleChip.js`（帶 `data-testid="role-chip"`）。
  - 權限名稱放在語系檔 `permissions.<ns>.<action>` 與 `permissionGroups.*`。
- 修掉的 bug：`UserAdminPanel` 點別人的「編輯」會編到自己那一列（`setEditingId(currentUser.id)`）。

### 3.2 忘記密碼（Email 自助重設 + 管理員產生連結）

| 部分 | 位置 |
|---|---|
| 資料欄位 | `migrations/016_add_password_reset.sql`：`password_reset_token_hash`、`password_reset_expires_at`、`password_changed_at` |
| 純規則（可測） | `src/backend/config/passwordReset.js`：token 產生／hash、TTL（Email 30 分、管理員 24 小時）、重寄冷卻 60 秒、`isTokenRevoked` |
| 改密碼的唯一入口 | `src/backend/services/passwordService.js`（`setPassword` 會設 `password_changed_at` 並清掉重設碼） |
| 寄信 | `src/backend/services/mailService.js`（nodemailer；沒設 SMTP 時開發環境把連結印在 console） |
| 端點 | `POST /api/auth/forgot-password`、`/reset-password/verify`、`/reset-password`；`POST /api/admin/users/:id/password-reset-link` |
| 限流 | `middleware/rateLimits.js`：依帳號每小時 3 次、依 IP 每小時 20 次 |
| 前端 | `pages/ForgotPasswordPage.js`、`pages/ResetPasswordPage.js`；登入頁「忘記密碼？」；後台「重設密碼」對話框上方的「產生重設連結」 |

設計重點：
- **不透露帳號是否存在**：`forgot-password` 先回應，查詢與寄信在回應之後才做。
- **改密碼後舊登入全部失效**：`middleware/auth.js` 比對 JWT 的 `iat` 與 `password_changed_at`，較早的回 401 `AUTH_TOKEN_REVOKED`。
  - `change-password` 與「管理員改自己的密碼」會回傳新 token，本人不會被登出。
- **token 放在網址 `#` 後面**，不進伺服器紀錄；頁面讀完就從網址列清掉。
- **敏感欄位不外洩**：API 回應統一用 `models` 的 `SENSITIVE_USER_FIELDS` 與 `toSafeUser()`，排除密碼 hash、重設碼、LINE 綁定碼。

## 4. 設定並測試 Email 自助重設

### 4.1 不設 SMTP，在本機測（最快）

1. **先快照資料庫**，測完才能還原（第 6 節）。
2. 以開發模式啟動後端。
   - ⚠️ 使用者自己常開著 `npm run dev` 佔用 5000 埠——**不要關掉它**，另開一個埠：

   ```bash
   cd src/backend
   PORT=5055 NODE_ENV=development node server.js > /tmp/reset-test.log 2>&1 &
   ```

   Windows 上請改用 Claude 的背景執行，log 寫到 scratchpad。
3. 用 curl 走一遍（`B=localhost:5055/api`）：

   ```bash
   # 申請：存在與不存在的帳號回應必須完全相同
   curl -s -X POST $B/auth/forgot-password -H 'Content-Type: application/json' -d '{"identifier":"guest"}'
   curl -s -X POST $B/auth/forgot-password -H 'Content-Type: application/json' -d '{"identifier":"nobody"}'

   # 連結印在後端 log：[寄信停用・開發模式] guest 的重設連結：http://localhost:3000/reset-password#token=...
   T=$(grep -o "token=[A-Za-z0-9_%-]*" /tmp/reset-test.log | tail -1 | cut -d= -f2)

   curl -s -X POST $B/auth/reset-password/verify -H 'Content-Type: application/json' -d "{\"token\":\"$T\"}"          # {"valid":true}
   curl -s -X POST $B/auth/reset-password -H 'Content-Type: application/json' -d "{\"token\":\"$T\",\"newPassword\":\"newpass456\"}"
   curl -s -X POST $B/auth/reset-password -H 'Content-Type: application/json' -d "{\"token\":\"$T\",\"newPassword\":\"again789\"}"  # 第二次 → RESET_TOKEN_INVALID
   ```

4. 應該成立的事（上一輪全部實測通過）：
   - 重設前拿到的 token 打 `/api/users/profile` → 401 `AUTH_TOKEN_REVOKED`；舊密碼登入失敗，新密碼成功。
   - 60 秒內重複申請不會產生新連結。
   - 同一帳號第 4 次申請 → 429 `PASSWORD_RESET_RATE_LIMITED`。
     - 計數在**記憶體**裡，重啟後端才會清；測到被擋就重啟。
   - 管理員 `POST /api/admin/users/<id>/password-reset-link` 回 `{ url, expiresAt }`；非管理員 → 403。
   - 管理員產生的 24 小時連結還沒用掉時，使用者自己申請仍會寄信（修過的 bug，有測試守著）。
   - 有待用連結的人正常登入後，該連結失效。
5. 前端流程：開 `http://localhost:3000/forgot-password` 申請，把 log 裡的連結貼到瀏覽器，設定新密碼後應回到登入頁並顯示「密碼已更新」。**這一步上一輪沒有在瀏覽器實測過。**
6. 測完停掉 5055 的伺服器並還原資料庫（第 6 節）。

### 4.2 真的寄信（需要 SMTP 帳密）

上一輪**沒有**實測過真的寄信。帳密要向使用者要，**絕對不要寫進任何會 commit 的檔案**。

1. 用系學會 Google Workspace 帳號（如 `imsa@ntu.im`）開兩步驟驗證，到 <https://myaccount.google.com/apppasswords> 產生應用程式密碼。
2. 在 `src/backend/.env` 加上：

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=imsa@ntu.im
   SMTP_PASS=<應用程式密碼>
   MAIL_FROM="台大資管系學會 <imsa@ntu.im>"
   ```

3. 重啟後端。拿一個 Email 是使用者自己信箱的帳號申請重設，確認信件中英內容、按鈕連結都對。
   - 連結的網域來自 `FRONTEND_URL`（本機是 `http://localhost:3000`）。
4. 失敗時後端 log 會有 `寄送重設密碼信失敗: <原因>`。
   - 使用者看到的永遠是「已寄出」，這是刻意的。
5. 正式機的設定步驟在 `DEPLOYMENT.md` 的「寄信設定」。

## 5. 尚未完成／已知問題

- [ ] **真的寄信**沒有驗證過（第 4.2 節）。
- [ ] 以下 UI 沒有在瀏覽器實際點過，只有元件測試與 API 測試：
  - 權限相關：導覽列管理選單、RoleChip 顏色對比、英文介面的權限名稱
  - 重設相關：兩個重設頁面、後台的產生連結對話框
- [ ] 全新資料庫建置在 migration 004 失敗（第 2 節）。
- [ ] 考古題管理表格的「預覽／下載」呼叫的 API 要求 `exams.download`，所以只有 `exams.manage` 的身分組點預覽會 403。要不要讓 manage 隱含 download 是產品決定，還沒問過使用者。
- [ ] `GET /api/admin/users` 還會回 `passwordDisplay`（密碼 hash 前 8 碼），前端沒用到，可以移除。
- [ ] 使用者管理有兩套平行 API（`/api/admin/users*` 與 `/api/users*`），`UserAdminPanel` 用裸 `fetch` 打前者。
- [ ] 後端 `npm test`（jest）沒有任何測試檔；後端的純邏輯測試放在前端測試套件裡（`src/test/unit/backend/`）。
- [ ] 部署到正式機時：`./deploy.sh` 會自動跑 015 與 016。要看 015 印出的核對清單，並照 `DEPLOYMENT.md` 設定 SMTP。

## 6. 在這個專案工作的慣例與地雷

**溝通與程式碼風格**
- 用繁體中文回覆；程式碼註解用中文，寫「為什麼」而不是「做什麼」，密度比照周圍程式碼。
- Commit message：`類型: 說明`（新增／修改／修正／修復／文件），內文說明原因與驗證方式，結尾加 `Co-Authored-By` 行。只在使用者要求時才 commit。

**commit 前必跑（和 CI 一樣）**

```bash
npm run format:check
npm run lint                       # 包含測試檔，要 0 error 0 warning
CI=true npx react-scripts test --watchAll=false
npx react-scripts build
```

**i18n**
- `zh-TW.js` 與 `en.js` 的 key 必須完全一致（`i18n.test.js`）；`template.js` 是自動衍生的，不用改。
- 後端每個 `errorCode` 兩個語系都要有譯文（`i18nCoverage.test.js` 會掃後端原始碼）。
- key 不要含 `.`（i18next 會當成巢狀路徑）。權限名稱因此是 `permissions.users.manage.label` 的巢狀結構。

**測試**
- CRA 的 jest 設定 `resetMocks: true`：寫在 `jest.mock` factory 裡的 `mockResolvedValue` 每個測試前會被清掉，要在測試裡設定。
- `components/common` 的 barrel 會載入 `ErrorBoundary` → 初始化 i18n。mock 掉 `react-i18next` 的測試會因此爆掉。頁面與面板裡請直接 import 元件檔（例如 `../common/RoleChip`）。
- `AdminPage.test.js` 把整個 `utils` barrel mock 成只有 `translateApiError`，其他工具函式請從子模組 import（例如 `utils/permissions`）。
- ESLint 的 testing-library 規則禁止 `.closest()` 之類的 DOM 存取；用 `getAllByRole('row')` + `within()` 或 `data-testid`。

**資料庫**
- 遷移：`cd src/backend && npm run migrate`（`--status` 只看狀態）。
  - `schema_migrations` 帳本記錄已套用的檔案；`.js` 遷移用來做需要條件判斷的事。
  - 001/002 含 `DROP TABLE`，絕不能重跑。
- SQLite 開 WAL。要快照請用：

  ```bash
  node -e "const s=require('sqlite3');const d=new s.Database('database/ntuim.db');d.run(\"VACUUM INTO '<絕對路徑>/snapshot.db'\",e=>{console.log(e||'ok');d.close()})"
  ```

  使用者的 dev server 開著時不要直接覆蓋 `.db` 檔；要還原就用 SQL 把改過的列改回快照的值。
- 快照、測試用的腳本都放 scratchpad，不要放進專案。

**Windows 環境**
- Git Bash 裡用 heredoc 餵 Python、內含正規表示式或引號時很容易被 shell 改壞。長一點的批次編輯請把腳本寫成檔案再執行。
- 在專案根目錄 `grep -r` 會掃進 `node_modules` 而逾時，改用 Grep 工具。
- 在 `src/backend` 跑 `npm install` 會把 `package-lock.json` 改成 4 格縮排，整份變成 diff。裝完用 `JSON.stringify(obj, null, 2)` 轉回 2 格。
- `.gitattributes` 讓工作區一律 LF。

**會出事的地方**
- 前端 `services/api.js` 收到 **401** 會清掉登入並導去登入頁。
  - 「權限不足」一律回 403。
  - 使用者輸入錯誤（例如重設碼無效）回 400。
- 會改密碼的程式碼一律走 `passwordService.setPassword`，不要直接寫 `passwordHash`。
- 回傳使用者資料一律經過 `toSafeUser()` 或 `exclude: SENSITIVE_USER_FIELDS`。
- 新增後台分頁要回去補 `config/adminConsole.js` 的 `PERMISSION_TO_TAB`，否則只有該權限的人進不了控制台。
