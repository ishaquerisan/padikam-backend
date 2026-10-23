import { calculateStreaks, daysBetween, getLocalizedDateString, getYesterdayDateString } from './date.utils';

describe('Date & Streak Utilities', () => {
  it('should format date for Asia/Kolkata timezone properly', () => {
    const fixedDate = new Date('2026-10-21T12:00:00Z');
    const str = getLocalizedDateString('Asia/Kolkata', fixedDate);
    expect(str).toBe('2026-10-21');
  });

  it('should calculate yesterday correctly', () => {
    const fixedDate = new Date('2026-10-21T12:00:00Z');
    const yesterday = getYesterdayDateString('Asia/Kolkata', fixedDate);
    expect(yesterday).toBe('2026-10-20');
  });

  it('should compute days between two dates', () => {
    expect(daysBetween('2026-10-20', '2026-10-21')).toBe(1);
    expect(daysBetween('2026-10-15', '2026-10-20')).toBe(5);
  });

  it('should calculate active streak correctly when completed today', () => {
    const dates = ['2026-10-21', '2026-10-20', '2026-10-19'];
    const { currentStreak, longestStreak } = calculateStreaks(dates, '2026-10-21', '2026-10-20');
    expect(currentStreak).toBe(3);
    expect(longestStreak).toBe(3);
  });

  it('should preserve streak if completed yesterday but not yet today', () => {
    const dates = ['2026-10-20', '2026-10-19', '2026-10-18'];
    const { currentStreak } = calculateStreaks(dates, '2026-10-21', '2026-10-20');
    expect(currentStreak).toBe(3);
  });

  it('should reset streak to 0 if a full day was skipped', () => {
    const dates = ['2026-10-18', '2026-10-17'];
    const { currentStreak, longestStreak } = calculateStreaks(dates, '2026-10-21', '2026-10-20');
    expect(currentStreak).toBe(0);
    expect(longestStreak).toBe(2);
  });
});
