import { Task, Subtask, List, User } from './types.js';
import { formatDueDateDDMMYY } from './helpers.js';

export interface WhatsAppFormatOptions {
  scope?: 'pending' | 'all' | 'current_view';
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
    const ddmmyy = formatDueDateDDMMYY(datePart);

    if (diffDays < 0) {
      if (diffDays === -1) {
        return { text: `⚠️ Overdue (Yesterday • ${ddmmyy})`, isOverdue: true };
      }
      return { text: `⚠️ Overdue (${ddmmyy})`, isOverdue: true };
    }
    if (diffDays === 0) {
      return { text: `Today (${ddmmyy})`, isOverdue: false };
    }
    if (diffDays === 1) {
      return { text: `Tomorrow (${ddmmyy})`, isOverdue: false };
    }
    return { text: ddmmyy, isOverdue: false };
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
 * Format a single delegated task into a clean, direct WhatsApp message.
 * Pure task details with no external links or app references.
 */
export function formatSingleTaskMessage(
  task: Task,
  recipient?: { name?: string; phone?: string },
  subtasks: Subtask[] = []
): string {
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

  // Lists
  const listsStr = getTaskListsSummary(task);
  if (listsStr) {
    const isMulti = listsStr.includes(',');
    message += `📁 *${isMulti ? 'Lists' : 'List'}:* ${listsStr}\n`;
  }

  // Assignee
  const isGroup = Boolean(task.assignee_is_group);
  const assigneeName = recipient?.name || task.assignee_name;
  if (assigneeName && assigneeName !== 'Unassigned') {
    if (isGroup) {
      message += `👥 *Group:* ${assigneeName}\n`;
    } else {
      message += `👤 *Assigned to:* ${assigneeName}\n`;
    }
  }

  // Checklist / Steps (full list of steps)
  if (subtasks && subtasks.length > 0) {
    const completedCount = subtasks.filter((s) => Boolean(s.is_completed)).length;
    message += `\n▫️ *Steps (${completedCount}/${subtasks.length}):*\n`;

    subtasks.forEach((st) => {
      const icon = st.is_completed ? '✅' : '⬜';
      message += `${icon} ${st.title}\n`;
    });
  }

  // Notes
  if (task.notes && task.notes.trim()) {
    message += `\n💬 *Note:* ${task.notes.trim()}\n`;
  }

  return message.trim();
}

/**
 * Format multiple delegated tasks into a clean task list.
 * Pure task details with no external links or app references.
 */
export function formatBatchTasksMessage(
  tasks: Task[]
): string {
  const pendingCount = tasks.filter((t) => !t.is_completed).length;
  const completedCount = tasks.filter((t) => Boolean(t.is_completed)).length;

  let header = `📋 *Tasks (${tasks.length})*\n`;
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
      const icon = task.assignee_is_group ? '👥' : '👤';
      tags.push(`${icon} ${task.assignee_name}`);
    }

    if (tags.length > 0) {
      message += `   ${tags.join(' • ')}\n`;
    }

    message += `\n`;
  });

  return message.trim();
}

export type WhatsAppListFormatOptions = WhatsAppFormatOptions;

/**
 * Format an entire list of delegated tasks for WhatsApp.
 * Pure task details with no external links or app references.
 */
export function formatWholeListMessage(
  list: List,
  tasks: Task[],
  options?: WhatsAppListFormatOptions
): string {
  const scope = options?.scope || 'all';

  const pending = tasks.filter((t) => !t.is_completed);
  const completed = tasks.filter((t) => Boolean(t.is_completed));

  let header = `📁 *${list.title}*`;
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
      if (t.assignee_name && t.assignee_name !== 'Unassigned') {
        const icon = t.assignee_is_group ? '👥' : '👤';
        tags.push(`${icon} ${t.assignee_name}`);
      }

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
