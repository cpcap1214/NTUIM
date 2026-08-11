import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LOCALES, REFERENCE_LANGUAGE, resolveLanguage } from './locales';

// 使用者手動選過的語言存在這裡。存在就一律優先於瀏覽器語系——
// 使用者明確表達過的偏好不該被瀏覽器設定蓋掉。
const STORAGE_KEY = 'lang';

const readStoredLanguage = () => {
    try {
        return resolveLanguage(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
        // 無痕模式或封鎖 storage 時直接當作沒設定過
        return null;
    }
};

const detectLanguage = () => {
    const stored = readStoredLanguage();
    if (stored) return stored;

    // navigator.languages 是使用者在瀏覽器裡排好的偏好順序，比 navigator.language 準
    const candidates = (typeof navigator !== 'undefined'
        && (navigator.languages || [navigator.language])) || [];
    for (const candidate of candidates) {
        const resolved = resolveLanguage(candidate);
        if (resolved) return resolved;
    }
    return REFERENCE_LANGUAGE;
};

const resources = Object.fromEntries(
    Object.entries(LOCALES).map(([code, translation]) => [code, { translation }])
);

i18n.use(initReactI18next).init({
    resources,
    lng: detectLanguage(),
    // 參考語系同時是 fallback：其他語言缺 key 時回退到它，
    // 不會顯示成 key 本身或空白（見 locales/index.js 的說明）
    fallbackLng: REFERENCE_LANGUAGE,
    interpolation: {
        escapeValue: false, // React 本身就會做 escape
    },
});

// 切換語言並記住選擇。元件只要用 useTranslation()，
// i18next 會在 languageChanged 時讓它們重繪，不需要自己訂閱。
export const changeLanguage = (code) => {
    const resolved = resolveLanguage(code) || REFERENCE_LANGUAGE;
    try {
        localStorage.setItem(STORAGE_KEY, resolved);
    } catch (error) {
        // 存不進去就只在這個分頁生效，不影響切換本身
    }
    return i18n.changeLanguage(resolved);
};

export default i18n;
