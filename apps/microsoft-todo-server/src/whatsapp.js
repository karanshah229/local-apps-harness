const db = require('./db');

/**
 * Formats phone number into standard international format for WhatsApp (e.g. +919876543210 -> 919876543210)
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

/**
 * Format Single Task for WhatsApp
 */
function formatSingleTaskMessage(task, assignee, subtasks = []) {
  const statusEmoji = task.is_completed ? '✅' : '📌';
  const starEmoji = task.is_important ? '⭐ ' : '';
  let msg = `*${statusEmoji} TASK REMINDER: ${starEmoji}${task.title.toUpperCase()}*\n\n`;

  if (assignee) {
    msg += `👤 *Assigned To:* ${assignee.name} (${assignee.phone})\n`;
  }
  
  if (task.due_date) {
    msg += `📅 *Due Date:* ${task.due_date}\n`;
  }
  if (task.reminder_time) {
    msg += `⏰ *Reminder:* ${task.reminder_time}\n`;
  }
  if (task.notes) {
    msg += `📝 *Notes:* ${task.notes}\n`;
  }

  if (subtasks && subtasks.length > 0) {
    msg += `\n*Steps / Subtasks:*\n`;
    subtasks.forEach(step => {
      const stepCheck = step.is_completed ? '☑️' : '⬜';
      msg += `  ${stepCheck} ${step.title}\n`;
    });
  }

  msg += `\n_Sent via Kamdhenu To Do App_ 🚀`;
  return msg;
}

/**
 * Format Multiple Selected Tasks for WhatsApp
 */
function formatBatchTasksMessage(tasks, listTitle = 'Selected Tasks') {
  let msg = `📋 *TASK SUMMARY: ${listTitle.toUpperCase()}*\n`;
  msg += `Total Tasks: ${tasks.length}\n\n`;

  tasks.forEach((t, index) => {
    const check = t.is_completed ? '✅' : '⭕';
    const star = t.is_important ? '⭐ ' : '';
    const assigneeStr = t.assignee_name ? ` (👤 ${t.assignee_name})` : '';
    const dueStr = t.due_date ? ` [📅 ${t.due_date}]` : '';

    msg += `${index + 1}. ${check} *${star}${t.title}*${assigneeStr}${dueStr}\n`;
    if (t.notes) {
      msg += `   └ 📝 ${t.notes}\n`;
    }
  });

  msg += `\n_Sent via Kamdhenu To Do App_ 🚀`;
  return msg;
}

/**
 * Format Whole List for WhatsApp
 */
function formatWholeListMessage(list, tasks) {
  let msg = `✨ *LIST SHARE: ${list.title.toUpperCase()}* ✨\n\n`;

  const pending = tasks.filter(t => !t.is_completed);
  const completed = tasks.filter(t => t.is_completed);

  msg += `📌 *PENDING TASKS (${pending.length}):*\n`;
  if (pending.length === 0) {
    msg += `  _No pending tasks! All caught up!_ 🎉\n`;
  } else {
    pending.forEach((t, i) => {
      const star = t.is_important ? '⭐ ' : '';
      const due = t.due_date ? ` (Due: ${t.due_date})` : '';
      const assignee = t.assignee_name ? ` [Assigned: ${t.assignee_name}]` : '';
      msg += `  ${i + 1}. ⭕ *${star}${t.title}*${due}${assignee}\n`;
    });
  }

  if (completed.length > 0) {
    msg += `\n✅ *COMPLETED TASKS (${completed.length}):*\n`;
    completed.forEach((t, i) => {
      msg += `  ~${i + 1}. ${t.title}~\n`;
    });
  }

  msg += `\n_Shared via Kamdhenu To Do App_ 🚀`;
  return msg;
}

/**
 * Generate Direct WhatsApp Link
 */
function generateWhatsAppWebLink(phone, message) {
  const cleanedPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  if (cleanedPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Log WhatsApp notification
 */
function logWhatsAppMessage({ taskId, phone, recipientName, message, status = 'sent' }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO whatsapp_logs (task_id, recipient_phone, recipient_name, message, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(taskId || null, phone || '', recipientName || '', message, status);
  } catch (err) {
    console.error('Error logging WhatsApp message:', err);
  }
}

module.exports = {
  cleanPhoneNumber,
  formatSingleTaskMessage,
  formatBatchTasksMessage,
  formatWholeListMessage,
  generateWhatsAppWebLink,
  logWhatsAppMessage
};
