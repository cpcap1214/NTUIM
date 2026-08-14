import i18n from '../../../main/js/i18n';
import { 
  formatDate, 
  formatRelativeTime, 
  formatSemester, 
  getCurrentSemester 
} from '../../../main/js/utils/dateUtils';

// formatRelativeTime 與 formatSemester 現在會跟著介面語言變（走 i18n）。
// jsdom 的 navigator.language 是英文，所以不固定語言的話這些斷言會拿到英文字串。
// 這裡明確指定語言，順便讓「切語言後輸出真的會變」成為被測到的行為。
describe('Date Utils', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW');
  });

  describe('formatDate', () => {
    test('formats date string correctly', () => {
      const result = formatDate('2024-03-15');
      expect(result).toBe('2024/03/15');
    });

    test('handles invalid date string', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('invalid-date');
    });

    test('handles empty string', () => {
      const result = formatDate('');
      expect(result).toBe('');
    });
  });

  describe('formatRelativeTime', () => {
    beforeAll(() => {
      // Mock current time to 2024-03-15 12:00:00
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-15T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    test('formats recent time as "剛剛"', () => {
      const result = formatRelativeTime('2024-03-15T11:59:30Z');
      expect(result).toBe('剛剛');
    });

    // 同一個時間點切成英文要拿到英文字串——證明這些輸出真的跟著 i18n 走，
    // 而不是碰巧因為預設語言是中文才通過
    test('切成 en 之後同一個時間點回傳英文', async () => {
      await i18n.changeLanguage('en');
      expect(formatRelativeTime('2024-03-15T11:59:30Z')).toBe('Just now');
      await i18n.changeLanguage('zh-TW');
    });

    test('formats minutes ago', () => {
      const result = formatRelativeTime('2024-03-15T11:55:00Z');
      expect(result).toBe('5 分鐘前');
    });

    test('formats hours ago', () => {
      const result = formatRelativeTime('2024-03-15T10:00:00Z');
      expect(result).toBe('2 小時前');
    });

    test('formats days ago', () => {
      const result = formatRelativeTime('2024-03-13T12:00:00Z');
      expect(result).toBe('2 天前');
    });
  });

  describe('formatSemester', () => {
    test('formats first semester correctly', () => {
      const result = formatSemester('112', '1');
      expect(result).toBe('112 學年 上學期');
    });

    test('formats second semester correctly', () => {
      const result = formatSemester('112', '2');
      expect(result).toBe('112 學年 下學期');
    });

    test('formats summer semester correctly', () => {
      const result = formatSemester('112', '3');
      expect(result).toBe('112 學年 暑期');
    });
  });

  describe('getCurrentSemester', () => {
    test('returns correct semester for September (first semester)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-09-15'));
      
      const result = getCurrentSemester();
      expect(result.year).toBe(2024);
      expect(result.semester).toBe('1');
      
      jest.useRealTimers();
    });

    test('returns correct semester for March (second semester)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-15'));
      
      const result = getCurrentSemester();
      expect(result.year).toBe(2023);
      expect(result.semester).toBe('2');
      
      jest.useRealTimers();
    });
  });
});