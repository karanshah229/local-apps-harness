import { Task, Subtask, List, User } from './types';

export function formatSingleTaskMessage(task: Task, recipient: { name?: string; phone?: string }, subtasks: Subtask[] = []): string {
  let message = `📋 *Task Reminder: ${task.title}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;

  if (recipient && recipient.name) {
    message += `👤 *Assigned To:* ${recipient.name}\n`;
  }

  if (task.list_title) {
    message += `📁 *List:* ${task.list_title}\n`;
  }

  if (task.due_date) {
    message += `📅 *Due Date:* ${task.due_date}\n`;
  }

  if (task.reminder_time) {
    message += `⏰ *Reminder Time:* ${task.reminder_time}\n`;
  }

  if (task.is_important) {
    message += `⭐ *Priority:* High (Important)\n`;
  }

  if (subtasks && subtasks.length > 0) {
    message += `\n*Steps / Checklist:*\n`;
    subtasks.forEach((st) => {
      const icon = st.is_completed ? '✅' : '⬜';
      message += `${icon} ${st.title}\n`;
    });
  }

  if (task.notes) {
    message += `\n📝 *Notes:*\n${task.notes}\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `_Sent via Microsoft To Do App_`;

  return message;
}

export function formatBatchTasksMessage(tasks: Task[]): string {
  let message = `📋 *Task Digest (${tasks.length} tasks)*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  tasks.forEach((task, index) => {
    const status = task.is_completed ? '✅' : '⬜';
    const star = task.is_important ? '⭐ ' : '';
    message += `${index + 1}. ${status} ${star}*${task.title}*\n`;

    if (task.assignee_name) {
      message += `   👤 Assigned: ${task.assignee_name}\n`;
    }
    if (task.due_date) {
      message += `   📅 Due: ${task.due_date}\n`;
    }
    message += `\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `_Sent via Microsoft To Do App_`;

  return message;
}

export function formatWholeListMessage(list: List, tasks: Task[]): string {
  let message = `📁 *List: ${list.title}* (${tasks.length} total tasks)\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const pending = tasks.filter((t) => !t.is_completed);
  const completed = tasks.filter((t) => t.is_completed);

  if (pending.length > 0) {
    message += `*Pending Tasks (${pending.length}):*\n`;
    pending.forEach((t) => {
      const star = t.is_important ? '⭐ ' : '';
      const assignee = t.assignee_name ? ` (👤 ${t.assignee_name})` : '';
      message += `• ⬜ ${star}${t.title}${assignee}\n`;
    });
    message += `\n`;
  }

  if (completed.length > 0) {
    message += `*Completed Tasks (${completed.length}):*\n`;
    completed.forEach((t) => {
      message += `• ✅ ~${t.title}~\n`;
    });
    message += `\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `_Sent via Microsoft To Do App_`;

  return message;
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
