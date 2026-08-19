import i18n from '../i18n';

// 統一處理後端 API 錯誤訊息：優先用後端回傳的 errorCode 去語言檔查翻譯，
// 找不到 errorCode 時退回舊格式（express-validator 的 { code, message } 或純字串），
// 最後才用預設訊息。之後其他功能的後端錯誤改用 errorCode 後，都可以直接呼叫這支。
export const translateApiError = (err, fallback) => {
    const defaultFallback = fallback || i18n.t('errors.GENERIC_SUBMIT_FAILED');
    if (!err) return defaultFallback;

    if (err.errorCode) {
        // params 是後端對帶插值的訊息額外送出的變數（例如 { field }、{ name }）。
        // 沒有它的話，像「此{{field}}已被註冊」這種譯文會留著佔位符，
        // 而後端的中文原文又只在 defaultValue 裡，切成英文就看不到正確內容。
        return i18n.t(`errors.${err.errorCode}`, {
            ...(err.params || {}),
            defaultValue: err.error || defaultFallback,
        });
    }

    const firstError = err.errors?.[0];
    if (firstError) {
        const msg = firstError.msg;
        if (msg && typeof msg === 'object' && msg.code) {
            // params 讓譯文可以插值（例如字數門檻的 {{min}} / {{max}}）。
            // 少了它，語言檔就得把數字寫死，改門檻時四份文案要同步改——
            // 漏一份的症狀是「錯誤訊息說至少 5 字，但伺服器實際要 50」。
            return i18n.t(`errors.${msg.code}`, {
                ...(msg.params || {}),
                defaultValue: msg.message || defaultFallback,
            });
        }
        if (typeof msg === 'string') return msg;
    }

    if (err.error) return err.error;

    return defaultFallback;
};
