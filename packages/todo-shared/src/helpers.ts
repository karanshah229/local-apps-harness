export function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const cleanText = (text || '').toLowerCase();
  const cleanQuery = query.toLowerCase().trim();
  if (cleanText.includes(cleanQuery)) return true;

  let queryIdx = 0;
  for (let i = 0; i < cleanText.length && queryIdx < cleanQuery.length; i++) {
    if (cleanText[i] === cleanQuery[queryIdx]) {
      queryIdx++;
    }
  }
  return queryIdx === cleanQuery.length;
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

export interface DueDateDisplay {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
}

export function formatDueDateDisplay(dueDate?: string | null): DueDateDisplay | null {
  if (!dueDate) return null;
  try {
    const parts = dueDate.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(d);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const formatted = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      if (diffDays === 0) return { label: 'Today', isOverdue: false, isToday: true, isTomorrow: false };
      if (diffDays === 1) return { label: 'Tomorrow', isOverdue: false, isToday: false, isTomorrow: true };
      if (diffDays < 0) return { label: `Overdue, ${formatted}`, isOverdue: true, isToday: false, isTomorrow: false };
      return { label: formatted, isOverdue: false, isToday: false, isTomorrow: false };
    }
    return { label: dueDate, isOverdue: false, isToday: false, isTomorrow: false };
  } catch {
    return { label: dueDate, isOverdue: false, isToday: false, isTomorrow: false };
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
