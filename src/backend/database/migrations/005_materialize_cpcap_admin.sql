-- 把寫死在程式碼裡的 cpcap 超級管理員後門「實體化」成資料。
--
-- 背景：全站有 11 處（後端 5、前端 6）判斷式寫著
--   user.role === 'admin' || user.username === 'cpcap'
-- 這個 username 後門有兩個問題：
--   1. 任何環境只要 cpcap 這個使用者名稱尚未被註冊，搶註冊的人就直接取得最高權限
--      （database/init.js 從不建立這個帳號）
--   2. 權限來源有兩個，無法用身分組系統統一管理
--
-- 移除程式碼判斷之前，必須先確保該帳號的 role 真的是 admin，
-- 否則在 cpcap 的 role 不是 admin 的環境（正式機狀態未知）會把人鎖在門外。
-- 這個 UPDATE 讓「移除後門」成為行為上的 no-op。
--
-- 若該帳號不存在則不做任何事（不主動建立帳號——用腳本指定密碼的超級管理員
-- 比原本的漏洞更糟）。冪等，可重複執行。

UPDATE users SET role = 'admin' WHERE username = 'cpcap' AND role != 'admin';
