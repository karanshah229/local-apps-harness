import { Task, ViewSortConfig, SortField, SortDirection } from './types.js';
import { addCalendarDays, getCalendarDateInTimeZone, getDueDateInstant, getUserTimeZone, isTaskOverdue } from './dates.js';

export const DEFAULT_SORT_CONFIG: ViewSortConfig = {
  field: 'smart',
  direction: 'asc',
};

export const SORT_OPTIONS: Array<{
  id: SortField;
  label: string;
  description: string;
  defaultDirection: SortDirection;
  ascLabel: string;
  descLabel: string;
}> = [
  {
    id: 'smart',
    label: 'Smart Sort',
    description: 'Overdue → Next 3 days → Important → Backlog',
    defaultDirection: 'asc',
    ascLabel: 'Default priority',
    descLabel: 'Reverse priority',
  },
  {
    id: 'due_date',
    label: 'Due Date',
    description: 'Sort by deadline',
    defaultDirection: 'asc',
    ascLabel: 'Earliest first',
    descLabel: 'Latest first',
  },
  {
    id: 'created_at',
    label: 'Creation Date',
    description: 'Sort by date added',
    defaultDirection: 'desc',
    ascLabel: 'Oldest first',
    descLabel: 'Newest first',
  },
  {
    id: 'title',
    label: 'Alphabetical',
    description: 'Sort by task name',
    defaultDirection: 'asc',
    ascLabel: 'A to Z',
    descLabel: 'Z to A',
  },
];

export function getSortDisplayLabel(config?: ViewSortConfig): string {
  if (!config || config.field === 'smart') return 'Smart Sort';
  const opt = SORT_OPTIONS.find((o) => o.id === config.field);
  if (!opt) return 'Smart Sort';
  const dirLabel = config.direction === 'asc' ? opt.ascLabel : opt.descLabel;
  return `${opt.label} (${dirLabel})`;
}

export function sortTasks(tasks: Task[], sortConfig: ViewSortConfig = DEFAULT_SORT_CONFIG): Task[] {
  const { field, direction } = sortConfig;
  const multiplier = direction === 'desc' ? -1 : 1;

  const now = new Date();
  const timeZone = getUserTimeZone();
  const todayStr = getCalendarDateInTimeZone(now, timeZone);
  const next3DaysStr = addCalendarDays(todayStr, 3);

  return [...tasks].sort((a, b) => {
    if (field === 'smart') {
      // Helper function to get smart tier (0 to 3)
      // Tier 0: overdue tasks; Tier 1: due today through the next 3 calendar days
      // Tier 1: Due in next 3 days (today <= due_date <= next3DaysStr)
      // Tier 2: Important tasks (is_important = 1)
      // Tier 3: Rest of tasks
      const getTier = (t: Task): number => {
        if (isTaskOverdue(t.due_date, t.is_completed, t.due_timezone)) return 0;
        const date = t.due_date ? getCalendarDateInTimeZone(t.due_date, t.due_timezone || timeZone) : '';
        if (date >= todayStr && date <= next3DaysStr) return 1;
        if (t.is_important) return 2;
        return 3;
      };

      const tierA = getTier(a);
      const tierB = getTier(b);

      if (tierA !== tierB) {
        return (tierA - tierB) * multiplier;
      }

      // Tier 0: Overdue - earliest overdue first
      if (tierA === 0) {
        const dateA = getDueDateInstant(a.due_date, a.due_timezone)?.getTime() || 0;
        const dateB = getDueDateInstant(b.due_date, b.due_timezone)?.getTime() || 0;
        if (dateA !== dateB) return (dateA - dateB) * multiplier;
        return (b.id || 0) - (a.id || 0);
      }

      // Tier 1: Due next 3 days - soonest due first
      if (tierA === 1) {
        const dateA = getDueDateInstant(a.due_date, a.due_timezone)?.getTime() || 0;
        const dateB = getDueDateInstant(b.due_date, b.due_timezone)?.getTime() || 0;
        if (dateA !== dateB) return (dateA - dateB) * multiplier;
        if ((b.is_important ? 1 : 0) !== (a.is_important ? 1 : 0)) {
          return (b.is_important ? 1 : 0) - (a.is_important ? 1 : 0);
        }
        return (b.id || 0) - (a.id || 0);
      }

      // Tier 2: Important - dated tasks first, then newest
      if (tierA === 2) {
        if (a.due_date && b.due_date) return ((getDueDateInstant(a.due_date, a.due_timezone)?.getTime() || 0) - (getDueDateInstant(b.due_date, b.due_timezone)?.getTime() || 0)) * multiplier;
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        const createdA = a.created_at || '';
        const createdB = b.created_at || '';
        if (createdA !== createdB) return createdB.localeCompare(createdA) * multiplier;
        return (b.id || 0) - (a.id || 0);
      }

      // Tier 3: Rest of backlog - dated tasks first, then newest
      if (a.due_date && b.due_date) return ((getDueDateInstant(a.due_date, a.due_timezone)?.getTime() || 0) - (getDueDateInstant(b.due_date, b.due_timezone)?.getTime() || 0)) * multiplier;
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      const createdA = a.created_at || '';
      const createdB = b.created_at || '';
      if (createdA !== createdB) return createdB.localeCompare(createdA) * multiplier;
      return (b.id || 0) - (a.id || 0);
    }

    if (field === 'due_date') {
      if (a.due_date && b.due_date) {
        return ((getDueDateInstant(a.due_date, a.due_timezone)?.getTime() || 0) - (getDueDateInstant(b.due_date, b.due_timezone)?.getTime() || 0)) * multiplier;
      }
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      return (b.id || 0) - (a.id || 0);
    }

    if (field === 'created_at') {
      const createdA = a.created_at || '';
      const createdB = b.created_at || '';
      if (createdA !== createdB) {
        return createdA.localeCompare(createdB) * multiplier;
      }
      return ((a.id || 0) - (b.id || 0)) * multiplier;
    }

    if (field === 'title') {
      const titleA = (a.title || '').trim().toLowerCase();
      const titleB = (b.title || '').trim().toLowerCase();
      return titleA.localeCompare(titleB) * multiplier;
    }

    return 0;
  });
}
