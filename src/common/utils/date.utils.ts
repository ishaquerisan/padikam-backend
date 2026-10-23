import { DEFAULT_TIMEZONE } from '../constants/app.constants';

/**
 * Returns current calendar date (YYYY-MM-DD) formatted according to the user's timezone.
 */
export function getLocalizedDateString(timeZone: string = DEFAULT_TIMEZONE, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // outputs YYYY-MM-DD
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    return date.toISOString().split('T')[0];
  }
}

/**
 * Returns yesterday's calendar date (YYYY-MM-DD) according to the user's timezone.
 */
export function getYesterdayDateString(timeZone: string = DEFAULT_TIMEZONE, fromDate?: Date): string {
  const d = fromDate ? new Date(fromDate) : new Date();
  d.setDate(d.getDate() - 1);
  return getLocalizedDateString(timeZone, d);
}

/**
 * Computes difference in calendar days between two YYYY-MM-DD strings.
 */
export function daysBetween(dateStrA: string, dateStrB: string): number {
  const a = new Date(`${dateStrA}T00:00:00Z`).getTime();
  const b = new Date(`${dateStrB}T00:00:00Z`).getTime();
  const diffMs = Math.abs(b - a);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates current streak and longest streak from completed lesson dates.
 * A streak breaks if more than 1 calendar day is skipped.
 */
export function calculateStreaks(completedDates: string[], todayStr: string, yesterdayStr: string): { currentStreak: number; longestStreak: number } {
  if (!completedDates || completedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort descending
  const uniqueSortedDates = Array.from(new Set(completedDates)).sort((a, b) => b.localeCompare(a));

  // Determine if active today or yesterday
  const hasToday = uniqueSortedDates.includes(todayStr);
  const hasYesterday = uniqueSortedDates.includes(yesterdayStr);

  let currentStreak = 0;
  if (hasToday || hasYesterday) {
    let checkDate = new Date(`${hasToday ? todayStr : yesterdayStr}T00:00:00Z`);
    for (const dStr of uniqueSortedDates) {
      const currentTargetStr = checkDate.toISOString().split('T')[0];
      if (dStr === currentTargetStr) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dStr < currentTargetStr) {
        // Skipped a day
        break;
      }
    }
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  // Sort ascending for longest streak calculation
  const ascDates = [...uniqueSortedDates].reverse();
  for (let i = 0; i < ascDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(`${ascDates[i - 1]}T00:00:00Z`);
      const currDate = new Date(`${ascDates[i]}T00:00:00Z`);
      const diff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  return { currentStreak, longestStreak: Math.max(currentStreak, longestStreak) };
}
