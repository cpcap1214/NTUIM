import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTW from './locales/zh-TW';

// 目前只有 zh-TW 一種語言。之後要加新語言時，在這裡新增一個
// locales/<語系代碼>.js（結構跟 zh-TW.js 一致），並加進 resources 即可。
const resources = {
    'zh-TW': { translation: zhTW },
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'zh-TW',
    fallbackLng: 'zh-TW',
    interpolation: {
        escapeValue: false, // React 本身就會做 escape
    },
});

export default i18n;
