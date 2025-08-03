import { 
  formatDate, 
  formatRelativeTime, 
  formatSemester, 
  getCurrentSemester 
} from '../../../main/js/utils/dateUtils';

describe('Date Utils', () => {
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