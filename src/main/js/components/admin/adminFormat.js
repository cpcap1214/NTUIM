// 後台各分頁共用的顯示格式。
//
// 投稿／發放時間一律顯示台北時間、24 時制。不指定 timeZone 的話會跟著
// 瀏覽器的時區跑，總務在國外對帳就會看到差 8 小時的時間——而畫面上
// 完全看不出那是時區造成的，只會覺得資料怪怪的。
//
// 這兩個常數原本寫在 AdminPage.js 的模組層級，被撥款與課程評價審核
// 兩個分頁使用。分頁拆出去之後放在這裡，避免各自複製一份而漸行漸遠。
export const TAIPEI_DATE = {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
};

export const TAIPEI_TIME = {
    timeZone: 'Asia/Taipei',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
};
