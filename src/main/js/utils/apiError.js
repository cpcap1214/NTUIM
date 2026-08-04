import i18n from '../i18n';

// 統一處理後端 API 錯誤訊息：優先用後端回傳的 errorCode 去語言檔查翻譯，
// 找不到 errorCode 時退回舊格式（express-validator 的 { code, message } 或純字串），
// 最後才用預設訊息。之後其他功能的後端錯誤改用 errorCode 後，都可以直接呼叫這支。
export const translateApiError = (err, fallback) => {
    const defaultFallback = fallback || i18n.t('errors.GENERIC_SUBMIT_FAILED');
    if (!err) return defaultFallback;

    if (err.errorCode) {
        return i18n.t(`errors.${err.errorCode}`, { defaultValue: err.error || defaultFallback });
    }

    const firstError = err.errors?.[0];
    if (firstError) {
        const msg = firstError.msg;
        if (msg && typeof msg === 'object' && msg.code) {
            return i18n.t(`errors.${msg.code}`, { defaultValue: msg.message || defaultFallback });
        }
        if (typeof msg === 'string') return msg;
    }

    if (err.error) return err.error;

    return defaultFallback;
};
