/**
 * Calculates a search relevance score:
 * - 4.0: Exact full match
 * - 3.5: Starts with query (prefix match)
 * - 3.0: Word starts with query (word boundary prefix match)
 * - 2.0: Exact substring match anywhere
 * - 1.0: Fuzzy subsequence match (characters in sequence)
 * - 0.0: No match
 */
export function getSearchMatchScore(text: string | null | undefined, query: string): number {
  if (!query || !query.trim()) return 1.0;
  if (!text) return 0.0;

  const cleanText = text.toLowerCase().trim();
  const cleanQuery = query.toLowerCase().trim();

  if (cleanText === cleanQuery) return 4.0;
  if (cleanText.startsWith(cleanQuery)) return 3.5;

  const words = cleanText.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(cleanQuery)) return 3.0;
  }

  if (cleanText.includes(cleanQuery)) return 2.0;

  // Fuzzy match (characters in sequence)
  let queryIdx = 0;
  for (let i = 0; i < cleanText.length && queryIdx < cleanQuery.length; i++) {
    if (cleanText[i] === cleanQuery[queryIdx]) {
      queryIdx++;
    }
  }
  if (queryIdx === cleanQuery.length) return 1.0;

  return 0.0;
}

export function fuzzyMatch(text: string | null | undefined, query: string): boolean {
  return getSearchMatchScore(text, query) > 0;
}

export function getMultiFieldSearchScore(fields: (string | null | undefined)[], query: string): number {
  if (!query || !query.trim()) return 1.0;
  let maxScore = 0.0;
  for (const f of fields) {
    const score = getSearchMatchScore(f, query);
    if (score > maxScore) maxScore = score;
  }
  return maxScore;
}

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(0, 120, 212, ${alpha})`;
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

import {
  addCalendarDays,
  formatDueDateDDMMYYYY,
  formatDueDateDDMMYY,
  getCalendarDateInTimeZone,
  getUserTimeZone,
  isTaskOverdue,
} from './dates.js';

export {
  formatDueDateDDMMYYYY,
  formatDueDateDDMMYY,
  isTaskOverdue,
  getQuickDueDatePresets,
} from './dates.js';

export interface DueDateDisplay {
  label: string;
  formattedDDMMYY: string;
  formattedDDMMYYYY: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
}

export function formatDueDateDisplay(
  dueDate?: string | null,
  isCompleted?: boolean | number,
  dueTimezone?: string | null,
): DueDateDisplay | null {
  if (!dueDate) return null;
  const timeZone = dueTimezone || getUserTimeZone();
  const ddmmyyyy = formatDueDateDDMMYYYY(dueDate, timeZone);
  const ddmmyy = formatDueDateDDMMYY(dueDate, timeZone);
  try {
    const targetDate = getCalendarDateInTimeZone(dueDate, timeZone);
    const todayDate = getCalendarDateInTimeZone(new Date(), timeZone);
    const tomorrowDate = addCalendarDays(todayDate, 1);
    const isToday = targetDate === todayDate;
    const isTomorrow = targetDate === tomorrowDate;
    const overdue = isTaskOverdue(dueDate, isCompleted, timeZone);
    if (isToday) return { label: `Today • ${ddmmyyyy}`, formattedDDMMYY: ddmmyy, formattedDDMMYYYY: ddmmyyyy, isOverdue: false, isToday: true, isTomorrow: false };
    if (isTomorrow) return { label: `Tomorrow • ${ddmmyyyy}`, formattedDDMMYY: ddmmyy, formattedDDMMYYYY: ddmmyyyy, isOverdue: false, isToday: false, isTomorrow: true };
    if (overdue) return { label: `Overdue • ${ddmmyyyy}`, formattedDDMMYY: ddmmyy, formattedDDMMYYYY: ddmmyyyy, isOverdue: true, isToday: false, isTomorrow: false };
    return { label: ddmmyyyy, formattedDDMMYY: ddmmyy, formattedDDMMYYYY: ddmmyyyy, isOverdue: false, isToday: false, isTomorrow: false };
  } catch {
    return { label: ddmmyyyy, formattedDDMMYY: ddmmyy, formattedDDMMYYYY: ddmmyyyy, isOverdue: false, isToday: false, isTomorrow: false };
  }
}

export function formatReminderDisplay(reminderTime?: string | null): string | null {
  if (!reminderTime) return null;
  try {
    const cleaned = reminderTime.replace(' ', 'T');
    const d = new Date(cleaned);
    if (isNaN(d.getTime())) return reminderTime;
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return isToday ? `Today ${timeStr}` : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${timeStr}`;
  } catch {
    return reminderTime;
  }
}
