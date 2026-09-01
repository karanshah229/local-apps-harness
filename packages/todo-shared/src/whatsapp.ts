import { Task, Subtask, List, CustomView, User, WhatsAppMessageStyle, WhatsAppFormatConfig } from './types.js';
import { formatDueDateDDMMYY } from './helpers.js';

export interface WhatsAppFormatOptions extends WhatsAppFormatConfig {}

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
 * Supports 3 styling systems: Modern (default), Executive, Crisp.
 */
export function formatSingleTaskMessage(
  task: Task,
  recipient?: { name?: string; phone?: string },
  subtasks: Subtask[] = [],
  config?: WhatsAppFormatConfig
): string {
  const style: WhatsAppMessageStyle = config?.style || 'modern';
  const includeNotes = config?.includeNotes !== false;

  const star = task.is_important ? ' ⭐' : '';
  const dueInfo = getFriendlyDueText(task.due_date);
  const timeStr = task.reminder_time ? ` at ${task.reminder_time}` : '';
  const listsStr = getTaskListsSummary(task);

  const isGroup = Boolean(task.assignee_is_group);
  const assigneeName = task.assignee_name || (task.assigned_to_user_id ? recipient?.name : undefined);
  const hasAssignee = Boolean(assigneeName && assigneeName !== 'Unassigned' && assigneeName.toLowerCase() !== 'contact' && assigneeName.trim().length > 0);

  let message = '';

  if (style === 'executive') {
    // Executive Style: Structured with divider line
    message += `📌 *${task.title}*${star}\n`;
    message += `━━━━━━━━━━━━━━━\n`;

    if (dueInfo) {
      message += `📅 *Due:* ${dueInfo.text}${timeStr}\n`;
    } else if (task.reminder_time) {
      message += `⏰ *Reminder:* ${task.reminder_time}\n`;
    }

    if (listsStr) {
      const isMulti = listsStr.includes(',');
      message += `📁 *${isMulti ? 'Lists' : 'List'}:* ${listsStr}\n`;
    }

    if (hasAssignee) {
      message += isGroup ? `👥 *Group:* ${assigneeName}\n` : `👤 *Assigned to:* ${assigneeName}\n`;
    }

    if (subtasks && subtasks.length > 0) {
      const completedCount = subtasks.filter((s) => Boolean(s.is_completed)).length;
      message += `\n📋 *Steps (${completedCount}/${subtasks.length}):*\n`;
      subtasks.forEach((st) => {
        const check = st.is_completed ? '[✓]' : '[ ]';
        const title = st.is_completed ? `~${st.title}~` : st.title;
        message += `${check} ${title}\n`;
      });
    }

    if (includeNotes && task.notes && task.notes.trim()) {
      message += `\n📝 *Note:* ${task.notes.trim()}\n`;
    }
  } else if (style === 'crisp') {
    // Crisp Style: Emoji checkboxes ◻️ and ✅ with clean hierarchy
    const statusEmoji = task.is_completed ? '✅' : '📋';
    message += `${statusEmoji} *${task.title}*${star}\n`;

    if (dueInfo) {
      message += `📅 *Due:* ${dueInfo.text}${timeStr}\n`;
    } else if (task.reminder_time) {
      message += `⏰ *Reminder:* ${task.reminder_time}\n`;
    }

    if (listsStr) {
      const isMulti = listsStr.includes(',');
      message += `📁 *${isMulti ? 'Lists' : 'List'}:* ${listsStr}\n`;
    }

    if (hasAssignee) {
      message += isGroup ? `👥 *Group:* ${assigneeName}\n` : `👤 *Assigned to:* ${assigneeName}\n`;
    }

    if (subtasks && subtasks.length > 0) {
      const completedCount = subtasks.filter((s) => Boolean(s.is_completed)).length;
      message += `\n*Steps (${completedCount}/${subtasks.length}):*\n`;
      subtasks.forEach((st) => {
        const icon = st.is_completed ? '✅' : '◻️';
        const title = st.is_completed ? `~${st.title}~` : st.title;
        message += `${icon} ${title}\n`;
      });
    }

    if (includeNotes && task.notes && task.notes.trim()) {
      message += `\n💬 *Note:* ${task.notes.trim()}\n`;
    }
  } else {
    // Modern Style (Default): Notion/Linear aesthetic with ○ and ✓
    message += `*${task.title}*${star}\n`;

    const metaParts: string[] = [];
    if (dueInfo) metaParts.push(`🗓 ${dueInfo.text}${timeStr}`);
    if (listsStr) metaParts.push(`📁 ${listsStr}`);
    if (hasAssignee) metaParts.push(isGroup ? `👥 ${assigneeName}` : `👤 ${assigneeName}`);

    if (metaParts.length > 0) {
      message += `${metaParts.join(' • ')}\n`;
    }

    if (subtasks && subtasks.length > 0) {
      const completedCount = subtasks.filter((s) => Boolean(s.is_completed)).length;
      message += `\n*Steps (${completedCount}/${subtasks.length}):*\n`;
      subtasks.forEach((st) => {
        const bullet = st.is_completed ? '✓' : '○';
        const title = st.is_completed ? `~${st.title}~` : st.title;
        message += `${bullet} ${title}\n`;
      });
    }

    if (includeNotes && task.notes && task.notes.trim()) {
      message += `\n💬 _Note:_ ${task.notes.trim()}\n`;
    }
  }

  return message.trim();
}

/**
 * Format multiple delegated tasks into a clean task list.
 */
export function formatBatchTasksMessage(
  tasks: Task[],
  config?: WhatsAppFormatConfig
): string {
  const style: WhatsAppMessageStyle = config?.style || 'modern';
  const includeNotes = config?.includeNotes !== false;

  const pendingCount = tasks.filter((t) => !t.is_completed).length;
  const completedCount = tasks.filter((t) => Boolean(t.is_completed)).length;

  let header = '';
  if (style === 'executive') {
    header = `📋 *Tasks (${tasks.length})*\n━━━━━━━━━━━━━━━\n`;
    if (completedCount > 0 && pendingCount > 0) {
      header += `_(${pendingCount} pending, ${completedCount} completed)_\n\n`;
    } else {
      header += `\n`;
    }
  } else if (style === 'crisp') {
    header = `📋 *Tasks (${tasks.length})*\n`;
    if (completedCount > 0 && pendingCount > 0) {
      header += `_(${pendingCount} pending, ${completedCount} completed)_\n\n`;
    } else {
      header += `\n`;
    }
  } else {
    header = `*Tasks (${tasks.length})*\n`;
    if (completedCount > 0 && pendingCount > 0) {
      header += `_(${pendingCount} pending, ${completedCount} completed)_\n\n`;
    } else {
      header += `\n`;
    }
  }

  let message = header;

  tasks.forEach((task, index) => {
    const star = task.is_important ? '⭐ ' : '';
    const dueInfo = getFriendlyDueText(task.due_date);
    const listsStr = getTaskListsSummary(task);
    const hasAssignee = Boolean(task.assignee_name && task.assignee_name !== 'Unassigned');

    const tags: string[] = [];
    if (dueInfo) tags.push(`🗓 ${dueInfo.text}`);
    if (listsStr) tags.push(`📁 ${listsStr}`);
    if (hasAssignee) {
      const icon = task.assignee_is_group ? '👥' : '👤';
      tags.push(`${icon} ${task.assignee_name}`);
    }

    if (style === 'executive') {
      const check = task.is_completed ? '[✓]' : '[ ]';
      const title = task.is_completed ? `~${task.title}~` : `*${task.title}*`;
      message += `${index + 1}. ${check} ${star}${title}\n`;
      if (tags.length > 0) {
        message += `   ${tags.join(' • ')}\n`;
      }
    } else if (style === 'crisp') {
      const icon = task.is_completed ? '✅' : '◻️';
      const title = task.is_completed ? `~${task.title}~` : `*${task.title}*`;
      message += `${index + 1}. ${icon} ${star}${title}\n`;
      if (tags.length > 0) {
        message += `   ${tags.join(' • ')}\n`;
      }
    } else {
      const bullet = task.is_completed ? '✓' : '○';
      const title = task.is_completed ? `~${task.title}~` : `*${task.title}*`;
      message += `${bullet} ${star}${title}\n`;
      if (tags.length > 0) {
        message += `   _${tags.join(' • ')}_\n`;
      }
    }

    if (includeNotes && task.notes && task.notes.trim()) {
      message += `   💬 _${task.notes.trim()}_\n`;
    }

    message += `\n`;
  });

  return message.trim();
}

/**
 * Format an entire list of delegated tasks for WhatsApp.
 * Supports Modern, Executive, and Crisp styling systems.
 */
export function formatWholeListMessage(
  list: List | CustomView | { title: string },
  tasks: Task[],
  config?: WhatsAppFormatConfig
): string {
  const style: WhatsAppMessageStyle = config?.style || 'modern';
  const includeNotes = config?.includeNotes !== false;
  const scope = config?.scope || 'all';

  const pending = tasks.filter((t) => !t.is_completed);
  const completed = tasks.filter((t) => Boolean(t.is_completed));

  let header = '';
  if (style === 'executive') {
    header = `📁 *${list.title}*`;
    if (scope === 'pending') {
      header += ` • ${pending.length} pending\n━━━━━━━━━━━━━━━\n\n`;
    } else if (scope === 'current_view') {
      header += ` • ${tasks.length} filtered\n━━━━━━━━━━━━━━━\n\n`;
    } else {
      header += ` (${tasks.length} total)\n━━━━━━━━━━━━━━━\n\n`;
    }
  } else if (style === 'crisp') {
    header = `📁 *${list.title}*`;
    if (scope === 'pending') {
      header += ` (${pending.length} pending)\n\n`;
    } else if (scope === 'current_view') {
      header += ` (${tasks.length} filtered)\n\n`;
    } else {
      header += ` (${tasks.length} total)\n\n`;
    }
  } else {
    // Modern
    header = `📁 *${list.title}*`;
    if (scope === 'pending') {
      header += ` • ${pending.length} pending\n\n`;
    } else if (scope === 'current_view') {
      header += ` • ${tasks.length} filtered\n\n`;
    } else {
      header += ` (${tasks.length} total)\n\n`;
    }
  }

  let message = header;

  if (pending.length > 0) {
    if (scope !== 'pending') {
      message += style === 'executive' ? `*Pending (${pending.length}):*\n` : `*Pending (${pending.length}):*\n`;
    }

    pending.forEach((t) => {
      const star = t.is_important ? '⭐ ' : '';
      const dueInfo = getFriendlyDueText(t.due_date);
      const hasAssignee = Boolean(t.assignee_name && t.assignee_name !== 'Unassigned');

      const tags: string[] = [];
      if (dueInfo) tags.push(`🗓 ${dueInfo.text}`);
      if (hasAssignee) {
        const icon = t.assignee_is_group ? '👥' : '👤';
        tags.push(`${icon} ${t.assignee_name}`);
      }

      if (style === 'executive') {
        const meta = tags.length > 0 ? ` _(${tags.join(' • ')})_` : '';
        message += `[ ] ${star}*${t.title}*${meta}\n`;
      } else if (style === 'crisp') {
        const meta = tags.length > 0 ? ` • ${tags.join(' • ')}` : '';
        message += `◻️ ${star}*${t.title}*${meta}\n`;
      } else {
        // Modern
        const meta = tags.length > 0 ? ` — _${tags.join(' • ')}_` : '';
        message += `○ ${star}${t.title}${meta}\n`;
      }

      if (includeNotes && t.notes && t.notes.trim()) {
        message += `   💬 _${t.notes.trim()}_\n`;
      }
    });
    message += `\n`;
  }

  if (scope !== 'pending' && completed.length > 0) {
    message += `*Completed (${completed.length}):*\n`;
    completed.forEach((t) => {
      if (style === 'executive') {
        message += `[✓] ~${t.title}~\n`;
      } else if (style === 'crisp') {
        message += `✅ ~${t.title}~\n`;
      } else {
        message += `✓ ~${t.title}~\n`;
      }
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
