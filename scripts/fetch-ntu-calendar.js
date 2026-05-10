/**
 * Build-time NTU calendar fetcher.
 * 抓取台大 OWA 公開行事曆 ICS、解析後寫入 JSON。
 * 在 `npm run build` 之前自動執行（見 package.json 的 prebuild）。
 * 若網路不通、保留原本 JSON，不讓建置失敗。
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ICS_URL =
  'https://mail.ntu.edu.tw/owa/calendar/231111d435d54d41908fa9c59d0812a3@ntu.edu.tw/4576890d12e040bab4ab864c413aa2be12994112486015644960/calendar.ics';

const OUTPUT = path.join(
  __dirname,
  '..',
  'src',
  'main',
  'resources',
  'data',
  'ntuCalendar.json'
);

const FETCH_TIMEOUT_MS = 10000;
// 寫入兩份資料：
// - upcoming：未來最近 N 件（給「近期行程」列表）
// - all：未來所有事件（給月曆格子標點，含跨月份切換）
const UPCOMING_MAX = 30;

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: FETCH_TIMEOUT_MS }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    });
    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', reject);
  });
}

function unfoldICS(text) {
  // RFC 5545 line folding：CRLF + 空白/Tab 表示續行
  return text.replace(/\r?\n[ \t]/g, '');
}

function parseICSDate(value) {
  // 格式可能：20260518 或 20260518T120000Z
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function parseICS(text) {
  const lines = unfoldICS(text).split(/\r?\n/);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT') {
      if (current && current.date && current.title) {
        events.push(current);
      }
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const keyPart = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1);
      const key = keyPart.split(';')[0];

      if (key === 'DTSTART') {
        current.date = parseICSDate(value);
      } else if (key === 'SUMMARY') {
        current.title = value
          .replace(/\\,/g, ',')
          .replace(/\\;/g, ';')
          .replace(/\\n/gi, ' ')
          .replace(/\\\\/g, '\\')
          .trim();
      } else if (key === 'TRANSP') {
        current.transparent = value === 'TRANSPARENT';
      }
    }
  }
  return events;
}

function classifyEvent(title) {
  // 補課日 — 雖然名稱含「假」字但其實要上課，不算放假
  if (/補課/.test(title) || /影響.*課程/.test(title)) return 'highlight';

  // 學生最重要：選課與學籍相關截止（不能錯過）
  if (/(停修|加退選|補選|休學|退學)/.test(title)) return 'critical';

  // 「假期」：國定假日 + 寒暑假 + 春節 + 補假
  // 1. 標明 (放假日)
  // 2. 補假
  // 3. 春節相關（除夕、小年夜、年初一/二/三放假）
  // 4. 寒休、調整放假、連假
  // 5. 寒暑假開始
  const isHoliday =
    /\(放假日\)/.test(title) ||
    /補假/.test(title) ||
    /年初[一二三四五]放假/.test(title) ||
    /(除夕|小年夜)/.test(title) ||
    /^寒休/.test(title) ||
    /^調整放假/.test(title) ||
    /連假/.test(title) ||
    /(暑假|寒假).*開始/.test(title);
  if (isHoliday) return 'holiday';

  // 重要學期事件
  if (/(期中考|期末考|考試開始|畢業典禮|開學|新生.*典禮|上課.*(開始|結束)|學期.*(開始|結束))/.test(title)) {
    return 'highlight';
  }

  // 一般申請截止（次要）
  if (/(申請截止|報名截止|繳費截止|繳交.*截止)/.test(title)) return 'highlight';
  return 'normal';
}

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log(`[ntu-cal] 抓取 ICS：${ICS_URL}`);
  let raw;
  try {
    raw = await fetchURL(ICS_URL);
  } catch (e) {
    console.warn(`[ntu-cal] 抓取失敗（${e.message}），保留現有 JSON`);
    if (!fs.existsSync(OUTPUT)) {
      // 第一次建置且沒有網路：寫入空陣列免得 import 失敗
      fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
      fs.writeFileSync(OUTPUT, JSON.stringify({ updatedAt: null, events: [] }, null, 2));
      console.log(`[ntu-cal] 寫入空 JSON：${OUTPUT}`);
    }
    return;
  }

  const allEvents = parseICS(raw);
  const today = todayISO();

  const futureSorted = allEvents
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: e.date,
      title: e.title,
      kind: classifyEvent(e.title),
    }));

  const upcoming = futureSorted.slice(0, UPCOMING_MAX);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(
    OUTPUT,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        events: futureSorted, // 完整未來事件（給月曆使用）
        upcoming, // 近期前 N 件（給列表使用）
      },
      null,
      2
    )
  );

  console.log(
    `[ntu-cal] 完成：解析 ${allEvents.length} 件、未來 ${futureSorted.length} 件、近期列表 ${upcoming.length} 件 → ${OUTPUT}`
  );
}

main().catch((e) => {
  console.error('[ntu-cal] 未預期錯誤：', e);
  process.exit(0); // 即使失敗也讓 build 繼續
});
