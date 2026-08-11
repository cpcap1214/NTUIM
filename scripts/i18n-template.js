// 印出新增語言用的填空骨架。
//
//   npm run i18n:template > src/main/js/i18n/locales/ja.js
//
// 內容是參考語系（zh-TW）的完整 key 結構、值全部留空，另外把原檔的註解一併帶過來——
// 那些註解解釋了「index 0 保留不用」「這個是簡寫格式專用」之類的規則，
// 翻譯的人看不到會填錯。
//
// 為什麼用文字處理而不是 import：語系檔是 ES module，而這支腳本是給 node 直接跑的。
// 為了一個一次性的產生器去掛 babel 不划算，而語系檔的內容就是一個純物件字面值，
// 逐行改寫很穩定。若哪天格式變複雜（例如值裡出現多行樣板字串），這裡會需要重寫。

const fs = require('fs');
const path = require('path');

const REFERENCE_PATH = path.join(__dirname, '../src/main/js/i18n/locales/zh-TW.js');

const source = fs.readFileSync(REFERENCE_PATH, 'utf8');

const out = source
    .split('\n')
    .map((line) => {
        // 檔案開頭的說明是給 zh-TW 用的，換成給新語言的說明
        if (line.startsWith('// ')) return null;
        if (line.startsWith('const zhTW = {')) return 'const translations = {';
        if (line.startsWith('export default zhTW;')) return 'export default translations;';

        // key: '值'  →  key: ''
        const scalar = line.match(/^(\s*[\w'"[\]-]+:\s*)'(?:[^'\\]|\\.)*'(,?)\s*$/);
        if (scalar) return `${scalar[1]}''${scalar[2]}`;

        // key: ['', 'a', 'b']  →  key: ['', '', '']
        const array = line.match(/^(\s*[\w'"-]+:\s*)\[(.*)\](,?)\s*$/);
        if (array) {
            const count = array[2].split(',').length;
            return `${array[1]}[${Array(count).fill("''").join(', ')}]${array[3]}`;
        }

        return line;
    })
    .filter((line) => line !== null)
    .join('\n');

process.stdout.write(
    '// <語言名稱> translations.\n'
    + '//\n'
    + '// 每個空字串都要填。key 結構必須與參考語系 zh-TW 完全一致——\n'
    + '// src/test/unit/i18n.test.js 會擋下任何缺少、多餘或空白的 key。\n'
    + '// 填完後到 locales/index.js 的 LOCALES 與 SUPPORTED_LANGUAGES 各加一筆。\n'
    + out
);
