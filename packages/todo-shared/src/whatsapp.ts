import { Task, Subtask, List, User } from './types.js';

export const DEFAULT_APP_BASE_URL = 'https://kamdhenu-todo.local/todo';

export interface WhatsAppFormatOptions {
  baseUrl?: string;
  appScheme?: string;
}

/**
 * Parses and returns a human-friendly due date string with overdue status warnings.
 */
export function getFriendlyDueText(dueDateStr?: string | null): { text: string; isOverdue: boolean } | null {
  if (!dueDateStr) return null;

  try {
    const raw = String(dueDateStr).trim();
    const datePart = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length < 3) {
      return { text: raw, isOverdue: false };
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const targetDate = new Date(year, month, day);
    if (isNaN(targetDate.getTime())) {
      return { text: raw, isOverdue: false };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffMs = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const formattedShort = `${monthNames[targetDate.getMonth()]} ${targetDate.getDate()}`;
    const formattedWithDay = `${dayNames[targetDate.getDay()]}, ${formattedShort}`;

    if (diffDays < 0) {
      if (diffDays === -1) {
        return { text: '⚠️ Overdue (Yesterday)', isOverdue: true };
      }
      return { text: `⚠️ Overdue (${formattedShort})`, isOverdue: true };
    }
    if (diffDays === 0) {
      return { text: 'Today', isOverdue: false };
    }
    if (diffDays === 1) {
      return { text: 'Tomorrow', isOverdue: false };
    }
    if (diffDays > 1 && diffDays <= 6) {
      return { text: formattedWithDay, isOverdue: false };
    }
    if (targetDate.getFullYear() === today.getFullYear()) {
      return { text: formattedShort, isOverdue: false };
    }
    return { text: `${formattedShort}, ${targetDate.getFullYear()}`, isOverdue: false };
  } catch {
    return { text: String(dueDateStr), isOverdue: false };
  }
}

/**
 * Formats comma-separated list names if task belongs to multiple lists.
 */
export function getTaskListsSummary(task: Task): string | null {
  if (task.lists && Array.isArray(task.lists) && task.lists.length > 0) {
    const names = task.lists.map((l) => l.title).filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }
  if (task.list_title) return task.list_title;
  return null;
}

/**
 * Format a single task into a concise, actionable WhatsApp message.
 */
export function formatSingleTaskMessage(
  task: Task,
  recipient?: { name?: string; phone?: string },
  subtasks: Subtask[] = [],
  options?: WhatsAppFormatOptions
): string {
  const baseUrl = options?.baseUrl || DEFAULT_APP_BASE_URL;
  const star = task.is_important ? ' ⭐' : '';
  const statusEmoji = task.is_completed ? '✅' : '📋';

  let message = `${statusEmoji} *${task.title}*${star}\n`;

  // Due date with overdue alert
  const dueInfo = getFriendlyDueText(task.due_date);
  if (dueInfo) {
    const timeStr = task.reminder_time ? ` at ${task.reminder_time}` : '';
    message += `📅 *Due:* ${dueInfo.text}${timeStr}\n`;
  } else if (task.reminder_time) {
    message += `⏰ *Reminder:* ${task.reminder_time}\n`;
  }

  // Lists (multi-list support)
  const listsStr = getTaskListsSummary(task);
  if (listsStr) {
    const isMulti = listsStr.includes(',');
    message += `📁 *${isMulti ? 'Lists' : 'List'}:* ${listsStr}\n`;
  }

  // Assignee
  const assigneeName = recipient?.name || task.assignee_name;
  if (assigneeName && assigneeName !== 'Unassigned') {
    message += `👤 *Assigned to:* ${assigneeName}\n`;
  }

  // Checklist / Steps
  if (subtasks && subtasks.length > 0) {
    const completedCount = subtasks.filter((s) => Boolean(s.is_completed)).length;
    message += `\n▫️ *Steps (${completedCount}/${subtasks.length}):*\n`;

    const maxToShow = subtasks.length <= 5 ? subtasks.length : 4;
    const slice = subtasks.slice(0, maxToShow);

    slice.forEach((st) => {
      const icon = st.is_completed ? '✅' : '⬜';
      message += `${icon} ${st.title}\n`;
    });

    if (subtasks.length > maxToShow) {
      const remaining = subtasks.length - maxToShow;
      message += `_...and ${remaining} more steps in app_\n`;
    }
  }

  // Notes (concise)
  if (task.notes && task.notes.trim()) {
    const cleanNotes = task.notes.trim();
    const preview = cleanNotes.length > 120 ? `${cleanNotes.slice(0, 117)}...` : cleanNotes;
    message += `\n💬 *Note:* "${preview}"\n`;
  }

  message += `\n🔗 *Open task:* ${baseUrl}/task/${task.id}`;

  return message;
}

/**
 * Format multiple selected tasks into a succinct digest.
 */
export function formatBatchTasksMessage(
  tasks: Task[],
  options?: WhatsAppFormatOptions
): string {
  const baseUrl = options?.baseUrl || DEFAULT_APP_BASE_URL;
  const pendingCount = tasks.filter((t) => !t.is_completed).length;
  const completedCount = tasks.filter((t) => Boolean(t.is_completed)).length;

  let header = `📋 *Kamdhenu ToDo • ${tasks.length} Tasks Shared*\n`;
  if (completedCount > 0 && pendingCount > 0) {
    header += `_(${pendingCount} pending, ${completedCount} completed)_\n\n`;
  } else {
    header += `\n`;
  }

  let message = header;

  tasks.forEach((task, index) => {
    const status = task.is_completed ? '✅' : '⬜';
    const star = task.is_important ? '⭐ ' : '';
    const title = task.is_completed ? `~${task.title}~` : `*${task.title}*`;

    message += `${index + 1}. ${status} ${star}${title}\n`;

    const tags: string[] = [];

    const dueInfo = getFriendlyDueText(task.due_date);
    if (dueInfo) {
      tags.push(`📅 ${dueInfo.text}`);
    }

    const listsStr = getTaskListsSummary(task);
    if (listsStr) {
      tags.push(`📁 ${listsStr}`);
    }

    if (task.assignee_name && task.assignee_name !== 'Unassigned') {
      tags.push(`👤 ${task.assignee_name}`);
    }

    if (tags.length > 0) {
      message += `   ${tags.join(' • ')}\n`;
    }

    message += `\n`;
  });

  message += `🔗 *Open in app:* ${baseUrl}`;

  return message.trim();
}

export interface WhatsAppListFormatOptions extends WhatsAppFormatOptions {
  scope?: 'pending' | 'all' | 'current_view';
}

/**
 * Format an entire list or filtered scope into a succinct summary for team/group sharing.
 */
export function formatWholeListMessage(
  list: List,
  tasks: Task[],
  options?: WhatsAppListFormatOptions
): string {
  const baseUrl = options?.baseUrl || DEFAULT_APP_BASE_URL;
  const scope = options?.scope || 'all';

  const pending = tasks.filter((t) => !t.is_completed);
  const completed = tasks.filter((t) => Boolean(t.is_completed));

  let header = `📁 *List: ${list.title}*`;
  if (scope === 'pending') {
    header += ` • Pending Tasks (${pending.length})\n\n`;
  } else if (scope === 'current_view') {
    header += ` • Filtered Tasks (${tasks.length})\n\n`;
  } else {
    header += ` (${tasks.length} total)\n\n`;
  }

  let message = header;

  if (pending.length > 0) {
    if (scope !== 'pending') {
      message += `*Pending (${pending.length}):*\n`;
    }
    pending.forEach((t) => {
      const star = t.is_important ? '⭐ ' : '';
      const tags: string[] = [];

      const dueInfo = getFriendlyDueText(t.due_date);
      if (dueInfo) tags.push(`📅 ${dueInfo.text}`);
      if (t.assignee_name && t.assignee_name !== 'Unassigned') tags.push(`👤 ${t.assignee_name}`);

      const meta = tags.length > 0 ? ` (${tags.join(' • ')})` : '';
      message += `• ⬜ ${star}*${t.title}*${meta}\n`;
    });
    message += `\n`;
  }

  if (scope !== 'pending' && completed.length > 0) {
    message += `*Completed (${completed.length}):*\n`;
    completed.forEach((t) => {
      message += `• ✅ ~${t.title}~\n`;
    });
    message += `\n`;
  }

  message += `🔗 *Open list:* ${baseUrl}/list/${list.id}`;

  return message.trim();
}

export function generateWhatsAppWebLink(phone: string, message: string): string {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message || '');
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

export function generateWhatsAppDeepLink(phone: string, message: string): string {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message || '');
  if (cleanPhone) {
    return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `whatsapp://send?text=${encodedText}`;
}

