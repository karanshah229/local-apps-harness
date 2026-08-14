const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./db');
const {
  formatSingleTaskMessage,
  formatBatchTasksMessage,
  formatWholeListMessage,
  generateWhatsAppWebLink,
  logWhatsAppMessage
} = require('./whatsapp');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

app.get('/healthz', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'unavailable' });
  }
});

// Helper to notify socket clients
function broadcastSync(event, data) {
  io.emit(event, data);
}

// ----------------------------------------------------
// USERS / CONTACT LIBRARY API
// ----------------------------------------------------

// Get all users in library
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY name ASC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add contact to persistent library
app.post('/api/users', (req, res) => {
  try {
    const { name, email, phone, avatar } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }

    const avatarUrl = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
    const stmt = db.prepare('INSERT INTO users (name, email, phone, avatar) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, email, phone, avatarUrl);
    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

    broadcastSync('users_updated', newUser);
    res.status(201).json(newUser);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A user with this email already exists in library.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update contact in library
app.put('/api/users/:id', (req, res) => {
  try {
    const { name, email, phone, avatar } = req.body;
    db.prepare('UPDATE users SET name = ?, email = ?, phone = ?, avatar = ? WHERE id = ?')
      .run(name, email, phone, avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`, req.params.id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    broadcastSync('users_updated', updatedUser);
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete contact from library
app.delete('/api/users/:id', (req, res) => {
  try {
    const userId = req.params.id;
    db.prepare('UPDATE tasks SET assigned_to_user_id = NULL WHERE assigned_to_user_id = ?').run(userId);
    db.prepare('DELETE FROM list_shares WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    broadcastSync('users_updated', { id: userId });
    res.json({ message: 'User deleted from library' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// LISTS API
// ----------------------------------------------------

// Get lists accessible by active user (Created by user OR shared with user)
app.get('/api/lists', (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const lists = db.prepare(`
      SELECT l.*, u.name as owner_name,
        (SELECT COUNT(*) FROM list_shares ls WHERE ls.list_id = l.id) as share_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.list_id = l.id AND t.is_completed = 0) as pending_task_count
      FROM lists l
      LEFT JOIN users u ON l.created_by = u.id
      WHERE l.created_by = ? OR l.id IN (SELECT list_id FROM list_shares WHERE user_id = ?)
      ORDER BY l.is_default DESC, l.created_at ASC
    `).all(userId, userId);

    // Get list members for shared lists
    const listsWithMembers = lists.map(list => {
      const members = db.prepare(`
        SELECT u.id, u.name, u.email, u.phone, u.avatar
        FROM list_shares ls
        JOIN users u ON ls.user_id = u.id
        WHERE ls.list_id = ?
      `).all(list.id);
      return { ...list, members };
    });

    res.json(listsWithMembers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create custom list
app.post('/api/lists', (req, res) => {
  try {
    const { title, color_theme, icon, created_by } = req.body;
    const stmt = db.prepare('INSERT INTO lists (title, color_theme, icon, created_by) VALUES (?, ?, ?, ?)');
    const info = stmt.run(title || 'Untitled list', color_theme || 'blue', icon || 'list', created_by || 1);

    const newList = db.prepare('SELECT * FROM lists WHERE id = ?').get(info.lastInsertRowid);
    broadcastSync('list_created', newList);
    res.status(201).json(newList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update list (title, theme color, icon)
app.put('/api/lists/:id', (req, res) => {
  try {
    const { title, color_theme, icon } = req.body;
    db.prepare('UPDATE lists SET title = ?, color_theme = ?, icon = ? WHERE id = ?')
      .run(title, color_theme, icon, req.params.id);

    const updatedList = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
    broadcastSync('list_updated', updatedList);
    res.json(updatedList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete custom list
app.delete('/api/lists/:id', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
    if (list && list.is_default) {
      return res.status(400).json({ error: 'Default tasks list cannot be deleted' });
    }

    db.prepare('DELETE FROM lists WHERE id = ?').run(req.params.id);
    broadcastSync('list_deleted', { id: req.params.id });
    res.json({ message: 'List deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Share list with a contact from library
app.post('/api/lists/:id/share', (req, res) => {
  try {
    const listId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to share' });
    }

    const stmt = db.prepare('INSERT OR IGNORE INTO list_shares (list_id, user_id) VALUES (?, ?)');
    stmt.run(listId, userId);

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar
      FROM list_shares ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.list_id = ?
    `).all(listId);

    broadcastSync('list_shared', { listId, members });
    res.json({ listId, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove member from shared list
app.delete('/api/lists/:id/share/:userId', (req, res) => {
  try {
    const { id: listId, userId } = req.params;
    db.prepare('DELETE FROM list_shares WHERE list_id = ? AND user_id = ?').run(listId, userId);

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar
      FROM list_shares ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.list_id = ?
    `).all(listId);

    broadcastSync('list_shared', { listId, members });
    res.json({ listId, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// TASKS API
// ----------------------------------------------------

// Get tasks with filtering (view: 'my-day', 'important', 'planned', 'assigned-to-me', or listId)
app.get('/api/tasks', (req, res) => {
  try {
    const { view, listId, userId = 1 } = req.query;

    let query = `
      SELECT t.*,
        u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar,
        l.title as list_title, l.color_theme as list_color,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      LEFT JOIN lists l ON t.list_id = l.id
      WHERE 1=1
    `;

    const params = [];

    if (view === 'my-day') {
      query += ` AND t.is_my_day = 1`;
    } else if (view === 'important') {
      query += ` AND t.is_important = 1`;
    } else if (view === 'planned') {
      query += ` AND (t.due_date IS NOT NULL OR t.reminder_time IS NOT NULL)`;
    } else if (view === 'assigned-to-me') {
      query += ` AND t.assigned_to_user_id = ?`;
      params.push(userId);
    } else if (listId) {
      query += ` AND t.list_id = ?`;
      params.push(listId);
    }

    query += ` ORDER BY t.is_completed ASC, t.is_important DESC, t.id DESC`;

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Task
app.post('/api/tasks', (req, res) => {
  try {
    const { list_id, title, notes, is_important, is_my_day, due_date, reminder_time, assigned_to_user_id, created_by = 1 } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    // Default list if none provided
    let targetListId = list_id;
    if (!targetListId) {
      const defaultList = db.prepare('SELECT id FROM lists WHERE is_default = 1').get();
      targetListId = defaultList ? defaultList.id : 1;
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (list_id, title, notes, is_important, is_my_day, due_date, reminder_time, assigned_to_user_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      targetListId,
      title.trim(),
      notes || null,
      is_important ? 1 : 0,
      is_my_day ? 1 : 0,
      due_date || null,
      reminder_time || null,
      assigned_to_user_id || null,
      created_by
    );

    const newTask = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      WHERE t.id = ?
    `).get(info.lastInsertRowid);

    broadcastSync('task_created', newTask);
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Task
app.put('/api/tasks/:id', (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, notes, is_completed, is_important, is_my_day, due_date, reminder_time, assigned_to_user_id, list_id } = req.body;

    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        notes = COALESCE(?, notes),
        is_completed = COALESCE(?, is_completed),
        is_important = COALESCE(?, is_important),
        is_my_day = COALESCE(?, is_my_day),
        due_date = ?,
        reminder_time = ?,
        assigned_to_user_id = ?,
        list_id = COALESCE(?, list_id)
      WHERE id = ?
    `).run(
      title,
      notes,
      is_completed !== undefined ? (is_completed ? 1 : 0) : null,
      is_important !== undefined ? (is_important ? 1 : 0) : null,
      is_my_day !== undefined ? (is_my_day ? 1 : 0) : null,
      due_date !== undefined ? due_date : null,
      reminder_time !== undefined ? reminder_time : null,
      assigned_to_user_id !== undefined ? assigned_to_user_id : null,
      list_id,
      taskId
    );

    const updatedTask = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      WHERE t.id = ?
    `).get(taskId);

    broadcastSync('task_updated', updatedTask);
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Task
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const taskId = req.params.id;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    broadcastSync('task_deleted', { id: taskId });
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SUBTASKS / STEPS API
// ----------------------------------------------------

app.get('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC, id ASC').all(req.params.id);
    res.json(subtasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const { title } = req.body;
    const taskId = req.params.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Step title is required' });
    }

    const stmt = db.prepare('INSERT INTO subtasks (task_id, title) VALUES (?, ?)');
    const info = stmt.run(taskId, title.trim());

    const newSubtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(info.lastInsertRowid);
    broadcastSync('subtask_created', { taskId, subtask: newSubtask });
    res.status(201).json(newSubtask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subtasks/:id', (req, res) => {
  try {
    const { title, is_completed } = req.body;
    const subtaskId = req.params.id;

    db.prepare(`
      UPDATE subtasks SET
        title = COALESCE(?, title),
        is_completed = COALESCE(?, is_completed)
      WHERE id = ?
    `).run(
      title,
      is_completed !== undefined ? (is_completed ? 1 : 0) : null,
      subtaskId
    );

    const updated = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId);
    broadcastSync('subtask_updated', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subtasks/:id', (req, res) => {
  try {
    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(req.params.id);
    broadcastSync('subtask_deleted', { id: req.params.id, taskId: subtask ? subtask.task_id : null });
    res.json({ message: 'Step deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// WHATSAPP API
// ----------------------------------------------------

// Generate WhatsApp Deep Link & Log Event
app.post('/api/whatsapp/generate-link', (req, res) => {
  try {
    const { type, taskId, taskIds, listId, recipientUserId, customPhone } = req.body;
    let message = '';
    let recipientPhone = customPhone || '';
    let recipientName = 'Recipient';

    if (recipientUserId) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(recipientUserId);
      if (user) {
        recipientPhone = recipientPhone || user.phone;
        recipientName = user.name;
      }
    }

    if (type === 'single') {
      const task = db.prepare(`
        SELECT t.*, u.name as assignee_name, u.phone as assignee_phone
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id
        WHERE t.id = ?
      `).get(taskId);

      if (!task) return res.status(404).json({ error: 'Task not found' });
      const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(taskId);

      if (!recipientPhone && task.assignee_phone) {
        recipientPhone = task.assignee_phone;
        recipientName = task.assignee_name;
      }

      message = formatSingleTaskMessage(task, { name: recipientName, phone: recipientPhone }, subtasks);
      logWhatsAppMessage({ taskId, phone: recipientPhone, recipientName, message });

    } else if (type === 'batch') {
      if (!taskIds || !taskIds.length) {
        return res.status(400).json({ error: 'No tasks selected for batch WhatsApp message' });
      }

      const placeholders = taskIds.map(() => '?').join(',');
      const tasks = db.prepare(`
        SELECT t.*, u.name as assignee_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id
        WHERE t.id IN (${placeholders})
      `).all(...taskIds);

      message = formatBatchTasksMessage(tasks);
      logWhatsAppMessage({ taskId: null, phone: recipientPhone, recipientName, message });

    } else if (type === 'list') {
      const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(listId);
      if (!list) return res.status(404).json({ error: 'List not found' });

      const tasks = db.prepare(`
        SELECT t.*, u.name as assignee_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id
        WHERE t.list_id = ?
      `).all(listId);

      message = formatWholeListMessage(list, tasks);
      logWhatsAppMessage({ taskId: null, phone: recipientPhone, recipientName, message });
    }

    const waLink = generateWhatsAppWebLink(recipientPhone, message);
    res.json({ waLink, message, recipientPhone, recipientName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp Sent Log History
app.get('/api/whatsapp/logs', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM whatsapp_logs ORDER BY id DESC LIMIT 50').all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// AUTOMATED SCHEDULER (CRON)
// ----------------------------------------------------
// Check every minute for upcoming task reminders
cron.schedule('* * * * *', () => {
  try {
    const now = new Date();
    const currentTimeStr = now.toISOString().slice(0, 16).replace('T', ' '); // YYYY-MM-DD HH:mm

    const reminderTasks = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.phone as assignee_phone
      FROM tasks t
      JOIN users u ON t.assigned_to_user_id = u.id
      WHERE t.is_completed = 0 AND t.reminder_time LIKE ?
    `).all(`${currentTimeStr}%`);

    reminderTasks.forEach(task => {
      console.log(`⏰ AUTOMATED REMINDER TRIGGERED for task: "${task.title}" -> ${task.assignee_name} (${task.assignee_phone})`);
      const msg = formatSingleTaskMessage(task, { name: task.assignee_name, phone: task.assignee_phone }, []);
      logWhatsAppMessage({ taskId: task.id, phone: task.assignee_phone, recipientName: task.assignee_name, message: msg, status: 'scheduled_auto_sent' });
      
      broadcastSync('reminder_alert', {
        task,
        message: `WhatsApp reminder triggered for "${task.title}" assigned to ${task.assignee_name} (${task.assignee_phone})`
      });
    });
  } catch (err) {
    console.error('Error running cron reminder check:', err);
  }
});

// ----------------------------------------------------
// SOCKET.IO CONNECTION
// ----------------------------------------------------
io.on('connection', (socket) => {
  console.log('Client connected to real-time sync:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve static assets from the client build in production if available
const fs = require('fs');
const path = require('path');
const clientDistPath = path.join(__dirname, '../../microsoft-todo-client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
  console.log(`Microsoft To Do Backend running on port ${PORT}`);
});
