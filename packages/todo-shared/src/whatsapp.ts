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
  const includeAssignee = config?.includeAssignee !== false;
  const includeImportant = config?.includeImportant !== false;
  const includeSteps = config?.includeSteps !== false;
  const includeDueDate = config?.includeDueDate !== false;

  const importantSuffix = (includeImportant && task.is_important) ? ' (Important)' : '';
  const dueInfo = includeDueDate ? getFriendlyDueText(task.due_date) : null;
  const timeStr = (includeDueDate && task.reminder_time) ? ` at ${task.reminder_time}` : '';
  const listsStr = getTaskListsSummary(task);

  const isGroup = Boolean(task.assignee_is_group);
  const assigneeName = task.assignee_name || (task.assigned_to_user_id ? recipient?.name : undefined);
  const isSelf = task.assigned_to_user_id === 1 ||
    assigneeName?.toLowerCase() === 'you' ||
    assigneeName?.toLowerCase() === 'self' ||
    assigneeName?.toLowerCase() === 'me';
  const hasAssignee = Boolean(assigneeName && assigneeName !== 'Unassigned' && assigneeName.toLowerCase() !== 'contact' && assigneeName.trim().length > 0);
  const shouldIncludeAssignee = includeAssignee && hasAssignee && !isGroup && !isSelf;

  let message = '';

  if (style === 'executive') {
    // Executive Style: Structured with divider line
    message += `📌 *${task.title}*${importantSuffix}\n`;
    message += `━━━━━━━━━━━━━━━\n`;

    if (includeDueDate) {
      if (dueInfo) {
        message += `📅 *Due:* ${dueInfo.text}${timeStr}\n`;
      } else if (task.reminder_time) {
        message += `⏰ *Reminder:* ${task.reminder_time}\n`;
      }
    }

    if (listsStr) {
      const isMulti = listsStr.includes(',');
      message += `📁 *${isMulti ? 'Lists' : 'List'}:* ${listsStr}\n`;
    }

    if (shouldIncludeAssignee) {
      message += `👤 *Assigned to:* ${assigneeName}\n`;
    }

    if (includeSteps && subtasks && subtasks.length > 0) {
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
    message += `${statusEmoji} *${task.title}*${importantSuffix}\n`;

    if (includeDueDate) {
      if (dueInfo) {
        message += `📅 *Due:* ${dueInfo.text}${timeStr}\n`;
      } else if (task.reminder_time) {
        message += `⏰ *Reminder:* ${task.reminder_time}\n`;
      }
    }

    if (listsStr) {
      const isMulti = listsStr.includes(',');
      message += `📁 *${isMulti ? 'Lists' : 'List'}:* ${listsStr}\n`;
    }

    if (shouldIncludeAssignee) {
      message += `👤 *Assigned to:* ${assigneeName}\n`;
    }

    if (includeSteps && subtasks && subtasks.length > 0) {
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
    message += `*${task.title}*${importantSuffix}\n`;

    const metaParts: string[] = [];
    if (includeDueDate && dueInfo) metaParts.push(`🗓 ${dueInfo.text}${timeStr}`);
    if (listsStr) metaParts.push(`📁 ${listsStr}`);
    if (shouldIncludeAssignee) metaParts.push(`👤 ${assigneeName}`);

    if (metaParts.length > 0) {
      message += `${metaParts.join(' • ')}\n`;
    }

    if (includeSteps && subtasks && subtasks.length > 0) {
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
  const includeAssignee = config?.includeAssignee !== false;
  const includeImportant = config?.includeImportant !== false;
  const includeDueDate = config?.includeDueDate !== false;

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
    const importantSuffix = (includeImportant && task.is_important) ? ' (Important)' : '';
    const dueInfo = includeDueDate ? getFriendlyDueText(task.due_date) : null;
    const listsStr = getTaskListsSummary(task);
    const isGroup = Boolean(task.assignee_is_group);
    const isSelf = task.assigned_to_user_id === 1 ||
      task.assignee_name?.toLowerCase() === 'you' ||
      task.assignee_name?.toLowerCase() === 'self' ||
      task.assignee_name?.toLowerCase() === 'me';
    const hasAssignee = Boolean(task.assignee_name && task.assignee_name !== 'Unassigned' && task.assignee_name.toLowerCase() !== 'contact' && task.assignee_name.trim().length > 0);
    const shouldIncludeAssignee = includeAssignee && hasAssignee && !isGroup && !isSelf;

    const tags: string[] = [];
    if (includeDueDate && dueInfo) tags.push(`🗓 ${dueInfo.text}`);
    if (listsStr) tags.push(`📁 ${listsStr}`);
    if (shouldIncludeAssignee) {
      tags.push(`👤 ${task.assignee_name}`);
    }

    if (style === 'executive') {
      const check = task.is_completed ? '[✓]' : '[ ]';
      const title = task.is_completed ? `~${task.title}~` : `*${task.title}*`;
      message += `${index + 1}. ${check} ${title}${importantSuffix}\n`;
      if (tags.length > 0) {
        message += `   ${tags.join(' • ')}\n`;
      }
    } else if (style === 'crisp') {
      const icon = task.is_completed ? '✅' : '◻️';
      const title = task.is_completed ? `~${task.title}~` : `*${task.title}*`;
      message += `${index + 1}. ${icon} ${title}${importantSuffix}\n`;
      if (tags.length > 0) {
        message += `   ${tags.join(' • ')}\n`;
      }
    } else {
      const bullet = task.is_completed ? '✓' : '○';
      const title = task.is_completed ? `~${task.title}~` : `*${task.title}*`;
      message += `${bullet} ${title}${importantSuffix}\n`;
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
  const includeAssignee = config?.includeAssignee !== false;
  const includeImportant = config?.includeImportant !== false;
  const includeDueDate = config?.includeDueDate !== false;
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
      const importantSuffix = (includeImportant && t.is_important) ? ' (Important)' : '';
      const dueInfo = includeDueDate ? getFriendlyDueText(t.due_date) : null;
      const isGroup = Boolean(t.assignee_is_group);
      const isSelf = t.assigned_to_user_id === 1 ||
        t.assignee_name?.toLowerCase() === 'you' ||
        t.assignee_name?.toLowerCase() === 'self' ||
        t.assignee_name?.toLowerCase() === 'me';
      const hasAssignee = Boolean(t.assignee_name && t.assignee_name !== 'Unassigned' && t.assignee_name.toLowerCase() !== 'contact' && t.assignee_name.trim().length > 0);
      const shouldIncludeAssignee = includeAssignee && hasAssignee && !isGroup && !isSelf;

      const tags: string[] = [];
      if (includeDueDate && dueInfo) tags.push(`🗓 ${dueInfo.text}`);
      if (shouldIncludeAssignee) {
        tags.push(`👤 ${t.assignee_name}`);
      }

      if (style === 'executive') {
        const meta = tags.length > 0 ? ` _(${tags.join(' • ')})_` : '';
        message += `[ ] *${t.title}*${importantSuffix}${meta}\n`;
      } else if (style === 'crisp') {
        const meta = tags.length > 0 ? ` • ${tags.join(' • ')}` : '';
        message += `◻️ *${t.title}*${importantSuffix}${meta}\n`;
      } else {
        // Modern
        const meta = tags.length > 0 ? ` — _${tags.join(' • ')}_` : '';
        message += `○ ${t.title}${importantSuffix}${meta}\n`;
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
      const importantSuffix = (includeImportant && t.is_important) ? ' (Important)' : '';
      if (style === 'executive') {
        message += `[✓] ~${t.title}~${importantSuffix}\n`;
      } else if (style === 'crisp') {
        message += `✅ ~${t.title}~${importantSuffix}\n`;
      } else {
        message += `✓ ~${t.title}~${importantSuffix}\n`;
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
