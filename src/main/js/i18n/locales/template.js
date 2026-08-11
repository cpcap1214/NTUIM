// 新增語言用的模板：與參考語系（zh-TW）結構完全相同、值一律空字串。
//
// 這是「衍生」出來的，不是另一份要手動維護的檔案——參考語系加了 key，模板就自動有，
// 不可能漏掉或過期。手寫一份平行的檔案在 600 多個 key 的規模下必然會漂移。
//
// 開新語言的做法：
//   1. npm run i18n:template > src/main/js/i18n/locales/<語系代碼>.js
//      （會印出填空用的骨架）
//   2. 把每個空字串填上譯文
//   3. 到 locales/index.js 的 LOCALES 與 SUPPORTED_LANGUAGES 各加一筆
//
// 填到一半也能上線：i18next 的 fallbackLng 會讓還沒翻的 key 顯示參考語系的內容。
// 但 src/test/unit/i18n.test.js 會要求正式註冊的語系 key 必須齊全。

import reference from './zh-TW';

const blankify = (node) => {
    if (typeof node === 'string') return '';
    // 陣列要保持是陣列。少了這一條，Object.fromEntries 會把 ['a','b'] 變成
    // { 0: '', 1: '' }，key 路徑從 metricTexts.quality 變成 metricTexts.quality.0，
    // 結構就跟參考語系對不上了。
    if (Array.isArray(node)) return node.map(blankify);
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, blankify(value)]));
};

const template = blankify(reference);

export default template;
