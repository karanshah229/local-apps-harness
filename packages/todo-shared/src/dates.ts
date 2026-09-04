const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function getDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return values;
}

function getCalendarParts(date: Date, timeZone: string) {
  const parts = getDateTimeParts(date, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function toDateString(parts: { year: number; month: number; day: number }): string {
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = getDateTimeParts(instant, timeZone);
  const asUtcWallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtcWallClock - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Converts a local calendar date/time in an IANA timezone into a UTC ISO instant. */
export function zonedDateTimeToUtcIso(
  dateString: string,
  timeZone: string = getUserTimeZone(),
  hour = 23,
  minute = 59,
  second = 59,
  millisecond = 999,
): string {
  const parts = parseDateOnly(dateString);
  if (!parts) throw new Error(`Invalid calendar date: ${dateString}`);
  const desiredWallClock = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second, millisecond);
  let instantMs = desiredWallClock;
  for (let i = 0; i < 3; i += 1) {
    instantMs = desiredWallClock - getTimeZoneOffsetMs(new Date(instantMs), timeZone);
  }
  return new Date(instantMs).toISOString();
}

export function getCalendarDateInTimeZone(value: string | Date, timeZone: string = getUserTimeZone()): string {
  const raw = value instanceof Date ? value.toISOString() : String(value).trim();
  const legacy = parseDateOnly(raw);
  if (legacy) return toDateString(legacy);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return toDateString(getCalendarParts(parsed, timeZone));
}

export function getDueDateInstant(dueDate?: string | null, dueTimezone?: string | null): Date | null {
  if (!dueDate) return null;
  const raw = String(dueDate).trim();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime()) && raw.includes('T')) return parsed;
  const dateOnly = raw.slice(0, 10);
  try {
    return new Date(zonedDateTimeToUtcIso(dateOnly, dueTimezone || getUserTimeZone()));
  } catch {
    return null;
  }
}

export function formatDueDateDDMMYYYY(dueDate?: string | null, timeZone?: string | null): string {
  if (!dueDate) return '';
  const date = getCalendarDateInTimeZone(dueDate, timeZone || getUserTimeZone());
  const parts = date.split('-');
  if (parts.length !== 3) return String(dueDate);
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function formatDueDateDDMMYY(dueDate?: string | null, timeZone?: string | null): string {
  if (!dueDate) return '';
  const date = getCalendarDateInTimeZone(dueDate, timeZone || getUserTimeZone());
  const parts = date.split('-');
  if (parts.length !== 3) return String(dueDate);
  return `${parts[2]}-${parts[1]}-${parts[0].slice(-2)}`;
}

export function isTaskOverdue(dueDate?: string | null, isCompleted?: boolean | number, dueTimezone?: string | null): boolean {
  if (!dueDate || isCompleted) return false;
  const instant = getDueDateInstant(dueDate, dueTimezone);
  return Boolean(instant && instant.getTime() < Date.now());
}

export function addCalendarDays(dateString: string, days: number): string {
  const parts = parseDateOnly(dateString);
  if (!parts) return dateString;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
}

export function getQuickDueDatePresets(timeZone: string = getUserTimeZone()) {
  const today = toDateString(getCalendarParts(new Date(), timeZone));
  const tomorrow = addCalendarDays(today, 1);
  const todayParts = parseDateOnly(today)!;
  const dayOfWeek = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day)).getUTCDay();
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = addCalendarDays(today, daysUntilNextMonday);
  return {
    timeZone,
    today: zonedDateTimeToUtcIso(today, timeZone),
    tomorrow: zonedDateTimeToUtcIso(tomorrow, timeZone),
    nextMonday: zonedDateTimeToUtcIso(nextMonday, timeZone),
    todayFormatted: formatDueDateDDMMYY(today, timeZone),
    tomorrowFormatted: formatDueDateDDMMYY(tomorrow, timeZone),
    nextMondayFormatted: formatDueDateDDMMYY(nextMonday, timeZone),
  };
}
