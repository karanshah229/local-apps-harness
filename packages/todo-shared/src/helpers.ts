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

/**
 * Formats a YYYY-MM-DD date string into DD-MM-YYYY format.
 * E.g., '2026-07-08' -> '08-07-2026'
 */
export function formatDueDateDDMMYYYY(dueDate?: string | null): string {
  if (!dueDate) return '';
  try {
    const parts = dueDate.split('-');
    if (parts.length === 3) {
      const year = parts[0].trim();
      const month = parts[1].trim().padStart(2, '0');
      const day = parts[2].trim().padStart(2, '0');
      const yyyy = year.length === 2 ? `20${year}` : year;
      return `${day}-${month}-${yyyy}`;
    }
    return dueDate;
  } catch {
    return dueDate || '';
  }
}

/**
 * Formats a YYYY-MM-DD date string into DD-MM-YY format.
 * E.g., '2026-07-08' -> '08-07-26'
 */
export function formatDueDateDDMMYY(dueDate?: string | null): string {
  if (!dueDate) return '';
  try {
    const parts = dueDate.split('-');
    if (parts.length === 3) {
      const year = parts[0].trim();
      const month = parts[1].trim().padStart(2, '0');
      const day = parts[2].trim().padStart(2, '0');
      const yy = year.length === 4 ? year.slice(2) : year;
      return `${day}-${month}-${yy}`;
    }
    return dueDate;
  } catch {
    return dueDate || '';
  }
}

/**
 * Checks if a task is overdue (due_date is in the past and task is not completed).
 */
export function isTaskOverdue(dueDate?: string | null, isCompleted?: boolean | number): boolean {
  if (!dueDate || isCompleted) return false;
  const todayStr = new Date().toISOString().split('T')[0];
  return dueDate < todayStr;
}

export interface DueDateDisplay {
  label: string;
  formattedDDMMYY: string;
  formattedDDMMYYYY: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
}

export function formatDueDateDisplay(dueDate?: string | null, isCompleted?: boolean | number): DueDateDisplay | null {
  if (!dueDate) return null;
  const ddmmyyyy = formatDueDateDDMMYYYY(dueDate);
  const ddmmyy = formatDueDateDDMMYY(dueDate);
  try {
    const parts = dueDate.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(d);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const isOverdue = !isCompleted && diffDays < 0;
      const isToday = diffDays === 0;
      const isTomorrow = diffDays === 1;

      if (isToday) {
        return { label: `Today • ${ddmmyyyy}`, formattedDDMMYY: ddmmyy, formattedDDMMYYYY: ddmmyyyy, isOverdue: false, isToday: true, isTomorrow: false };
      }
      if (isTomorrow) {
        return { label: `Tomorrow • ${ddmmyyyy}`, formattedDDMMYY: ddmmyy, formattedDDMMYYYY: ddmmyyyy, isOverdue: false, isToday: false, isTomorrow: true };
      }
      if (isOverdue) {
        return { label: `Overdue • ${ddmmyyyy}`, formattedDDMMYY: ddmmyy, formattedDDMMYYYY: ddmmyyyy, isOverdue: true, isToday: false, isTomorrow: false };
      }
      return { label: ddmmyyyy, formattedDDMMYY: ddmmyy, formattedDDMMYYYY: ddmmyyyy, isOverdue: false, isToday: false, isTomorrow: false };
    }
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

export function getQuickDueDatePresets() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const nextMonday = new Date();
  const day = nextMonday.getDay();
  const diff = nextMonday.getDate() + (day === 0 ? 1 : 8 - day);
  nextMonday.setDate(diff);
  const nextMondayStr = nextMonday.toISOString().split('T')[0];

  return {
    today: todayStr,
    tomorrow: tomorrowStr,
    nextMonday: nextMondayStr,
    todayFormatted: today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    tomorrowFormatted: tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    nextMondayFormatted: nextMonday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  };
}
