# 交接手冊

系學會幹部每年輪替，這份文件是「把網站的控制權完整交給下一個人」的清單與步驟。

放在版控裡而不是 `docs/`（那個目錄被 `.gitignore` 排除），是為了讓它跟著程式碼一起交接，不會隨著離任者的電腦消失。

---

## ⚠️ 這份文件不包含密碼與金鑰

**任何密碼、channel secret、access token、SSH 私鑰都不要寫進這個檔案。**

一旦 commit，它就永久留在 git 歷史裡——之後把檔案刪掉也救不回來，除非改寫整個歷史。密鑰請用系學會約定的方式保管（密碼管理器、或口頭／另外的加密管道交接），這裡只寫「東西在哪、怎麼換」。

---

## 交接檢查清單

依序執行。**最後一項（移除離任者權限）務必等到新人確認全部都能運作之後再做**——先移除再發現新人進不去，就沒有人能修了。

- [ ] LINE Developers Console：provider 與 channel **兩層都要**加入新人為 Admin
- [ ] LINE Official Account Manager（`manage.line.biz`）：這是**另一套**權限，要單獨加
- [ ] 重新簽發 LINE channel secret 與 access token，更新伺服器 `.env` 並重啟
- [ ] 清掉離任幹部的 `users.line_user_id`（否則畢業後仍會收到通知）
- [ ] 伺服器 SSH 存取（新人的公鑰加入、確認能登入並重啟服務）
- [ ] GitHub 儲存庫權限
- [ ] 網域 `ntu.im` 的管理權
- [ ] 站內管理員帳號與身分組（後台 → 身分組管理）
- [ ] 確認新人能獨立完成一次部署（`./deploy.sh`）
- [ ] **最後**：移除離任者的所有存取權

---

## LINE：帳號與交接

### 為什麼要特別小心

LINE 有兩條**不可逆**的限制：

1. **developer account 與 Business ID 的綁定是永久的、一對一的**，事後無法更換
2. **channel 無法搬到其他 provider**

所以用個人 LINE 帳號建立的 provider，那個人畢業之後只能「再加別的 Admin」，永遠拿不回擁有者身分。

### 首次建立：完整步驟

⚠️ **步驟 3 的 provider 選擇不可逆**，開始前先確認步驟 1 用對帳號。

#### 步驟 1：用共用信箱註冊 LINE Business ID

到 [LINE Business ID 註冊頁](https://account.line.biz/signup)，選「**以電子郵件帳號註冊**」，用系學會的共用信箱（例如 `imsa@ntu.im`）。

**不要用個人 LINE 帳號註冊。** developer account 與 Business ID 的綁定是永久的、一對一的，事後無法更換。

#### 步驟 2：建立 LINE 官方帳號

在 [LINE Official Account Manager](https://manage.line.biz/) 建立官方帳號。這是使用者實際加為好友的那個帳號。

- 名稱：系學會的對外名稱
- 這一步還不會產生任何 API 金鑰

#### 步驟 3：啟用 Messaging API，並選擇 provider ← **不可逆**

在 Official Account Manager 裡：**設定 → Messaging API → 啟用**。

過程中要選一個 provider（沒有就當場建一個，名稱用組織名如 `NTU IM Student Association`，**不要用個人名義**）。

> **這個指派是永久的，之後無法更改。** channel 也無法搬到別的 provider。選錯只能砍掉整個官方帳號重來。

#### 步驟 4：關閉自動回覆與問候語

**還在 Official Account Manager**：設定 → 回應設定

- **自動回應訊息：停用**
- **加入好友的歡迎訊息：停用**

不關的話，LINE 內建的罐頭回覆會蓋掉我們 bot 自己的回覆——使用者傳綁定碼過來，收到的會是「感謝加入好友」而不是綁定結果。

#### 步驟 5：取得兩個金鑰

到 [LINE Developers Console](https://developers.line.biz/console/)，用同一個帳號登入，找到剛才那個 channel：

| 位置 | 取得 |
|---|---|
| Basic settings 分頁 | **Channel secret** |
| Messaging API 分頁 | **Channel access token**（長期有效版，按 Issue 產生） |

順便把 Basic settings 的通知信箱改成職務信箱。

#### 步驟 6：填進伺服器並重啟 ← **必須在步驟 7 之前**

```bash
ssh <你的帳號>@ntu.im
vim ~/NTUIM/src/backend/.env
```

加上這兩行（值填步驟 5 拿到的）：

```
LINE_CHANNEL_ACCESS_TOKEN=（貼上）
LINE_CHANNEL_SECRET=（貼上）
```

然後重啟並確認：

```bash
pm2 restart ntuim-backend
curl -s localhost:5000/api/health
```

> **順序不能顛倒。** 下一步的 Verify 按鈕會對我們的 webhook 發一個真實請求，而 `src/backend/config/line.js` 在沒有 `LINE_CHANNEL_SECRET` 時一律讓驗簽失敗（回 401）。金鑰還沒填就按 Verify，**一定會失敗**，而錯誤訊息不會告訴你原因是「伺服器那邊還沒設定」。

#### 步驟 7：設定 webhook 並驗證

回到 Developers Console 的 Messaging API 分頁：

1. **Webhook URL** 填 `https://ntu.im/api/line/webhook`
2. 按 **Verify** —— 應該顯示成功（失敗的話回頭檢查步驟 6）
3. 開啟 **Use webhook**

nginx 不需要另外設定，既有的 `location ^~ /api/` 已經涵蓋這條路徑。

#### 步驟 8：加好友並實測綁定

1. 用 Messaging API 分頁的 **QR code** 把 bot 加為好友
2. 到網站的管理員控制台 → LINE 通知 → **產生綁定碼**
3. 把那 8 碼傳給 bot
4. 應該收到「綁定成功」與你的帳號名稱

沒反應的話看伺服器日誌：`pm2 logs ntuim-backend --lines 50`

#### 步驟 9：加入其他 Admin

最後才做這步，確認整套能運作之後。詳見下一節。

### 權限要設兩層，而且是兩套後台

Provider 的角色與 channel 的角色是**獨立的**——給了 provider Admin 不等於給了底下 channel 的 Admin。

| 層級 | 角色 |
|---|---|
| Provider | Admin（完全控制、可刪 provider、可加人）／ Member（僅能看名稱） |
| Channel | Admin（所有設定）／ Member（僅看基本資訊）／ Tester（測試開發中的 channel） |

而 **LINE Official Account Manager（`manage.line.biz`）需要另外設定存取權限**。只處理其中一邊是最常見的疏漏，結果是「能改 webhook 但不能改官方帳號的名稱和頭像」，或反過來。

### 至少三個 Admin，而且不會同時畢業

官方建議「grant admin roles to several developers for each provider and each channel」。建議組合：

1. 系學會共用帳號（永久）
2. 現任資訊部長（實際操作者）
3. 一位不同年級的幹部（避免同屆一起畢業）

### 兩個會咬人的陷阱

**邀請信只是送達管道，不是身分綁定。** 權限給的是「接受邀請時當下登入的那個 developer account」，不一定是收信的帳號。用共用信箱收邀請、卻在個人帳號登入狀態下點下去，權限就跑到個人帳號了，而且只能重邀一次。**接受前先確認自己登入的是哪個帳號。**

**從 provider 移除開發者時，若勾選「同時從底下的 channel 移除」，可能讓 channel 變成零個 Admin。** 零個 Admin 等於失去控制權。移除前先確認還有其他 channel Admin。

### 交接時一定要輪替金鑰

**`LINE_CHANNEL_SECRET` 是 webhook 的驗簽金鑰。** 持有它的人可以偽造 webhook 事件，**把任意 LINE 帳號綁到任意系統帳號上**（見 `src/backend/routes/line.js` 的綁定流程）。離任者的筆記或舊 `.env` 備份裡若留著它，那就是一條實質後門。

`LINE_CHANNEL_ACCESS_TOKEN` 則能用系學會官方帳號的名義發訊息給所有好友。

兩個都要在 Console 重新簽發，然後：

```bash
# 順序不能顛倒：先更新 .env 再重啟，否則舊 token 失效期間推播會全數失敗
vim ~/NTUIM/src/backend/.env       # 更新 LINE_CHANNEL_SECRET 與 LINE_CHANNEL_ACCESS_TOKEN
pm2 restart ntuim-backend
curl -s localhost:5000/api/health  # 應回 {"status":"OK",...}
```

驗證：用舊 secret 簽的 webhook 請求應該開始回 401。

### 清掉離任幹部的 LINE 綁定

`users.line_user_id` 是通知的收件位址。沒清掉的話，離任者**畢業後仍會繼續收到待審核通知，內含後台連結**。

**後台 → LINE 通知 → 已綁定的成員 → 解除綁定**（需 `users.manage` 權限）。

那個清單也會顯示每個人的**綁定時間**與**實際收得到哪些通知**：

- 綁定時間能分辨哪些是上一屆留下來的（舊資料顯示「未知」，因為那個欄位是後來才加的，沒有回填假時間）
- 「收不到任何通知」的標記代表那個人綁了但沒有對應的審核權限——這也是「我綁了為什麼沒收到通知」的答案

> 解除他人綁定時對方**不會收到任何提示**，只會從此不再收到通知。

介面壞掉時的備援：

```bash
cd ~/NTUIM/src/backend
sqlite3 database/ntuim.db "UPDATE users SET line_user_id = NULL, line_bound_at = NULL, line_binding_code = NULL, line_binding_expires_at = NULL WHERE username = '離任者帳號';"
```

### LINE 相關設定放在哪

| 項目 | 位置 |
|---|---|
| 金鑰（真值） | 伺服器 `src/backend/.env`（**gitignored**） |
| 設定範本 | `src/backend/.env.production`（版控中，只有 `CHANGE_ME` 佔位符） |
| Webhook URL | `https://ntu.im/api/line/webhook` |
| 程式碼 | `src/backend/routes/line.js`、`src/backend/config/line.js`、`src/backend/services/lineService.js`、`src/backend/services/notificationService.js` |

Console 上還要確認：**開啟 Use webhook**、**關閉自動回覆訊息**（否則會蓋掉 bot 自己的回覆）。

兩個金鑰未設定時，整套 LINE 通知會安靜停用，不影響網站其他功能——所以可以先部署、之後再慢慢設定。

---

## 站內管理員帳號

⚠️ **交接前務必確認這一項。** `src/backend/database/init.js` 內建了 `admin` / `admin123`，而 `admin` 帳號在身分組系統裡持有 `*` 萬用權限。若正式站是用 `init.js` 初始化且沒改過密碼，任何人都能登入後台。

```bash
curl -s -X POST https://ntu.im/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | head -c 200
```

回傳 token 就代表密碼還是預設值，**立刻改掉**。

其餘的權限調整在後台 → 身分組管理。救援用的 CLI（所有管理員都被鎖在外面時）：

```bash
cd ~/NTUIM/src/backend
node database/grant-admin.js --list        # 列出目前的管理員
node database/grant-admin.js <username>    # 授予管理員權限
```

---

## 其他項目

> 以下尚未整理成完整步驟。**不要把這份文件當成已經寫完** —— 一份「看起來完整但其實有洞」的交接文件比沒有更危險。交接時請一併補上。

- **伺服器 SSH**：主機在 `ntu.im`（140.112.106.45）。新人公鑰加入、舊人移除的實際步驟待補。
- **GitHub**：儲存庫權限的轉移方式待補。
- **網域 `ntu.im`**：註冊商、續約時間、管理帳號待補。
- **部署**：目前的部署流程見 `DEPLOYMENT.md` 與 `deploy.sh`。已知陷阱：`deploy.sh` 第 85 行的 `cp -r build /var/www/ntuim/` 在目標已存在時會複製成 `build/build`，症狀是「部署成功但畫面沒變」。

---

## 交接後的驗收

新人請獨立完成以下每一項（離任者不在旁邊）：

1. SSH 登入伺服器，`pm2 status` 看得到 `ntuim-backend`
2. 用**共用帳號**登入 LINE Developers Console，改得動 webhook URL
3. 用共用帳號進得去 LINE Official Account Manager
4. 在後台產生 LINE 綁定碼、傳給 bot、完成綁定
5. 送出一則測試評價，確認收得到 LINE 通知（測完記得刪除）
6. 完整跑一次 `./deploy.sh` 並確認網站正常

**六項全部通過之後**，才移除離任者的存取權。
