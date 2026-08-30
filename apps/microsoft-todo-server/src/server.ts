import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import db from './db.js';
import {
  formatSingleTaskMessage,
  formatBatchTasksMessage,
  formatWholeListMessage,
  generateWhatsAppWebLink,
  normalizeToE164
} from '@shared/todo';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5005', 10);

const fastify: FastifyInstance = Fastify({
  logger: false
});

// Setup CORS
fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Setup Socket.IO on underlying HTTP server
const io = new SocketIOServer(fastify.server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

function broadcastSync(event: string, data?: any): void {
  io.emit(event, data);
}

// Helper to attach list memberships to tasks
function attachTaskLists(taskOrTasks: any): any {
  if (!taskOrTasks) return taskOrTasks;
  const isArray = Array.isArray(taskOrTasks);
  const tasks = isArray ? taskOrTasks : [taskOrTasks];
  if (tasks.length === 0) return taskOrTasks;

  const taskIds = tasks.map((t: any) => t.id);
  const placeholders = taskIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT tl.task_id, l.id as list_id, l.title, l.color_theme, l.icon
    FROM task_lists tl
    JOIN lists l ON tl.list_id = l.id
    WHERE tl.task_id IN (${placeholders}) AND tl.active = 1 AND l.active = 1
    ORDER BY l.id ASC
  `).all(...taskIds) as Array<{ task_id: number; list_id: number; title: string; color_theme: string; icon: string }>;

  const listsByTaskId: Record<number, Array<{ id: number; title: string; color_theme: string; icon: string }>> = {};
  for (const row of rows) {
    if (!listsByTaskId[row.task_id]) {
      listsByTaskId[row.task_id] = [];
    }
    listsByTaskId[row.task_id].push({
      id: row.list_id,
      title: row.title,
      color_theme: row.color_theme,
      icon: row.icon
    });
  }

  for (const t of tasks) {
    let assignedLists = listsByTaskId[t.id] || [];
    if (assignedLists.length === 0 && t.list_id) {
      const fallbackList = db.prepare('SELECT id, title, color_theme, icon FROM lists WHERE id = ? AND active = 1').get(t.list_id) as any;
      if (fallbackList) {
        assignedLists = [fallbackList];
        try {
          db.prepare('INSERT OR IGNORE INTO task_lists (task_id, list_id, active) VALUES (?, ?, 1)').run(t.id, t.list_id);
        } catch {}
      }
    }
    t.lists = assignedLists;
    t.list_ids = assignedLists.map((l) => Number(l.id));
    if (assignedLists.length > 0) {
      t.list_title = assignedLists[0].title;
      t.list_color = assignedLists[0].color_theme;
      t.list_id = Number(assignedLists[0].id);
    } else {
      t.list_title = null;
      t.list_color = null;
      t.list_id = null;
    }
  }

  return isArray ? tasks : tasks[0];
}

// Log WhatsApp Message Helper
function logWhatsAppMessage({
  taskId,
  phone,
  recipientName,
  message,
  status = 'sent'
}: {
  taskId?: number | null;
  phone?: string | null;
  recipientName?: string | null;
  message?: string | null;
  status?: string;
}): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO whatsapp_logs (task_id, recipient_phone, recipient_name, message, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(taskId || null, phone || null, recipientName || null, message || null, status);
  } catch (err: any) {
    console.error('Failed to log WhatsApp message:', err?.message);
  }
}

// ----------------------------------------------------
// HEALTH PROBE
// ----------------------------------------------------
fastify.get('/healthz', async (_req: FastifyRequest, reply: FastifyReply) => {
  return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

// ----------------------------------------------------
// USERS API (USER LIBRARY)
// ----------------------------------------------------
fastify.get('/api/users', async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const users = db.prepare(`
      SELECT u.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to_user_id = u.id AND t.is_completed = 0 AND t.active = 1) as pending_task_count
      FROM users u
      WHERE u.active = 1
      ORDER BY u.name ASC
    `).all();
    return reply.send(users);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/users', async (req: FastifyRequest<{ Body: { name?: string; email?: string; phone?: string; avatar?: string } }>, reply: FastifyReply) => {
  try {
    const { name, email, phone, avatar } = req.body || {};
    if (!name || !email || !phone) {
      return reply.status(400).send({ error: 'Name, email, and phone are required.' });
    }

    const normalizedPhone = normalizeToE164(phone);
    if (!normalizedPhone) {
      return reply.status(400).send({ error: 'Invalid phone number format. Please provide a valid phone number with country code.' });
    }

    const stmt = db.prepare('INSERT INTO users (name, email, phone, avatar, active) VALUES (?, ?, ?, ?, 1)');
    const result = stmt.run(name.trim(), email.trim().toLowerCase(), normalizedPhone, avatar || null);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(result.lastInsertRowid);
    broadcastSync('users_updated', newUser);
    return reply.status(201).send(newUser);
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return reply.status(409).send({ error: 'A user with this email already exists.' });
    }
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/users/batch', async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const body: any = req.body || {};
    const userList: any[] = Array.isArray(body)
      ? body
      : (Array.isArray(body.contacts) ? body.contacts : (Array.isArray(body.users) ? body.users : []));

    if (userList.length === 0) {
      return reply.send({ inserted: [], updated: [], skipped: [], count: 0 });
    }

    const checkPhone = db.prepare('SELECT id, name, email, phone, avatar FROM users WHERE phone = ? AND active = 1');
    const checkEmail = db.prepare('SELECT id, name, email, phone, avatar FROM users WHERE LOWER(email) = ? AND active = 1');
    const checkName = db.prepare('SELECT id, name, email, phone, avatar FROM users WHERE LOWER(TRIM(name)) = ? AND active = 1');
    const insertUser = db.prepare('INSERT INTO users (name, email, phone, avatar, active) VALUES (?, ?, ?, ?, 1)');
    const updateUser = db.prepare('UPDATE users SET name = ?, email = ?, phone = ?, avatar = COALESCE(?, avatar), active = 1 WHERE id = ?');

    const inserted: any[] = [];
    const updated: any[] = [];
    const skipped: any[] = [];

    const processBatch = db.transaction((list: any[]) => {
      for (const u of list) {
        const rawName = (u.name || '').trim();
        const rawPhone = (u.phone || '').trim();
        const rawEmail = (u.email || '').trim().toLowerCase();

        if (!rawName && !rawPhone && !rawEmail) {
          skipped.push({ user: u, reason: 'Empty contact record' });
          continue;
        }

        const name = rawName || rawPhone || 'Contact';
        const normalizedPhone = normalizeToE164(rawPhone) || (rawPhone ? rawPhone.replace(/\s+/g, '') : '') || 'N/A';
        const cleanPhoneKey = normalizedPhone.replace(/\D/g, '') || String(Date.now());

        // Check if user exists by phone, email, or exact trimmed name
        let existingUser: any = null;
        if (normalizedPhone !== 'N/A' && normalizedPhone.length > 5) {
          existingUser = checkPhone.get(normalizedPhone);
        }
        if (!existingUser && rawEmail && !rawEmail.includes('@contacts.local') && !rawEmail.includes('@local.todo')) {
          existingUser = checkEmail.get(rawEmail);
        }
        if (!existingUser && rawName.length > 0) {
          existingUser = checkName.get(rawName.toLowerCase());
        }

        if (existingUser) {
          const nextPhone = (existingUser.phone && existingUser.phone !== 'N/A') ? existingUser.phone : normalizedPhone;
          const isExistingDummyEmail = existingUser.email?.includes('@contacts.local') || existingUser.email?.includes('@local.todo');
          const nextEmail = (rawEmail && !rawEmail.includes('@contacts.local') && !rawEmail.includes('@local.todo'))
            ? rawEmail
            : (isExistingDummyEmail ? existingUser.email : existingUser.email);

          updateUser.run(
            name,
            nextEmail,
            nextPhone,
            u.avatar || null,
            existingUser.id
          );
          updated.push(existingUser.id);
        } else {
          // Generate unique email if none provided
          let email = rawEmail;
          if (!email || checkEmail.get(email)) {
            email = `contact_${cleanPhoneKey}_${Math.floor(Math.random() * 10000)}@local.todo`;
          }

          try {
            const result = insertUser.run(name, email, normalizedPhone, u.avatar || null);
            inserted.push(result.lastInsertRowid);
          } catch (insertErr: any) {
            skipped.push({ user: u, reason: insertErr?.message || 'Failed to insert' });
          }
        }
      }
    });

    processBatch(userList);

    if (inserted.length > 0 || updated.length > 0) {
      broadcastSync('users_updated', { insertedCount: inserted.length, updatedCount: updated.length });
    }

    return reply.send({
      insertedCount: inserted.length,
      updatedCount: updated.length,
      skippedCount: skipped.length,
      count: inserted.length + updated.length,
    });
  } catch (err: any) {
    console.error('Error in batch import:', err);
    return reply.status(500).send({ error: err.message || 'Internal server error' });
  }
});

fastify.put('/api/users/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: { name?: string; email?: string; phone?: string; avatar?: string } }>, reply: FastifyReply) => {
  try {
    const { name, email, phone, avatar } = req.body || {};
    const userId = req.params.id;

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email.trim().toLowerCase());
    }
    if (phone !== undefined) {
      const normalized = normalizeToE164(phone);
      if (!normalized) {
        return reply.status(400).send({ error: 'Invalid phone number format. Please provide a valid phone number with country code.' });
      }
      updates.push('phone = ?');
      params.push(normalized);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(avatar);
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'No fields to update.' });
    }

    params.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND active = 1`).run(...params);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(userId);
    broadcastSync('users_updated', updatedUser);
    return reply.send(updatedUser);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.delete('/api/users/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const userId = req.params.id;
    db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(userId);
    broadcastSync('users_updated', { deletedId: userId });
    return reply.send({ message: 'User deleted successfully' });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

// ----------------------------------------------------
// USER PREFERENCES API
// ----------------------------------------------------
fastify.get('/api/user-preferences', async (req: FastifyRequest<{ Querystring: { userId?: string } }>, reply: FastifyReply) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId, 10) : 1;
    let prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
    if (!prefs) {
      db.prepare('INSERT OR IGNORE INTO user_preferences (user_id, remember_last_view, last_view_type, last_view_id, sort_preferences) VALUES (?, 1, "tab", "all-tasks", "{}")').run(userId);
      prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    }
    if (prefs && typeof prefs.sort_preferences === 'string') {
      try {
        prefs.sort_preferences = JSON.parse(prefs.sort_preferences || '{}');
      } catch (_e) {
        prefs.sort_preferences = {};
      }
    }
    return reply.send(prefs);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.put('/api/user-preferences', async (req: FastifyRequest<{
  Body: {
    userId?: number;
    remember_last_view?: number | boolean;
    last_view_type?: string;
    last_view_id?: string;
    sort_preferences?: any;
  };
}>, reply: FastifyReply) => {
  try {
    const {
      userId = 1,
      remember_last_view,
      last_view_type,
      last_view_id,
      sort_preferences,
    } = req.body || {};

    let existing = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
    if (!existing) {
      db.prepare('INSERT OR IGNORE INTO user_preferences (user_id, remember_last_view, last_view_type, last_view_id, sort_preferences) VALUES (?, 1, "tab", "all-tasks", "{}")').run(userId);
      existing = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
    }

    const nextRemember = remember_last_view !== undefined ? (remember_last_view ? 1 : 0) : existing.remember_last_view;
    const nextType = last_view_type !== undefined ? last_view_type : existing.last_view_type;
    const nextId = last_view_id !== undefined ? last_view_id : existing.last_view_id;
    let nextSort = existing.sort_preferences;
    if (sort_preferences !== undefined) {
      nextSort = typeof sort_preferences === 'string' ? sort_preferences : JSON.stringify(sort_preferences);
    }

    db.prepare(`
      UPDATE user_preferences
      SET remember_last_view = ?, last_view_type = ?, last_view_id = ?, sort_preferences = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(nextRemember, nextType, nextId, nextSort, userId);

    const updated = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
    if (updated && typeof updated.sort_preferences === 'string') {
      try {
        updated.sort_preferences = JSON.parse(updated.sort_preferences || '{}');
      } catch (_e) {
        updated.sort_preferences = {};
      }
    }
    broadcastSync('user_preferences_updated', updated);
    return reply.send(updated);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

// ----------------------------------------------------
// LISTS API
// ----------------------------------------------------
fastify.get('/api/lists', async (req: FastifyRequest<{ Querystring: { userId?: string } }>, reply: FastifyReply) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId, 10) : 1;
    const lists = db.prepare(`
      SELECT l.*, u.name as owner_name,
        wcu.name as default_whatsapp_contact_name,
        wcu.phone as default_whatsapp_contact_phone,
        (SELECT COUNT(*) FROM list_shares ls WHERE ls.list_id = l.id AND ls.active = 1) as share_count,
        (SELECT COUNT(*) FROM tasks t WHERE (t.list_id = l.id OR t.id IN (SELECT task_id FROM task_lists WHERE list_id = l.id AND active = 1)) AND t.is_completed = 0 AND t.active = 1 AND (t.created_by = ? OR t.assigned_to_user_id = ?)) as pending_task_count
      FROM lists l
      LEFT JOIN users u ON l.created_by = u.id AND u.active = 1
      LEFT JOIN users wcu ON l.default_whatsapp_contact_id = wcu.id AND wcu.active = 1
      WHERE l.active = 1 AND (l.created_by = ? OR l.id IN (SELECT list_id FROM list_shares WHERE user_id = ? AND active = 1))
      ORDER BY l.is_default DESC, l.created_at ASC
    `).all(userId, userId, userId, userId) as any[];

    // Get list members for shared lists
    const listsWithMembers = lists.map((list) => {
      const members = db.prepare(`
        SELECT u.id, u.name, u.email, u.phone, u.avatar
        FROM list_shares ls
        JOIN users u ON ls.user_id = u.id
        WHERE ls.list_id = ? AND ls.active = 1 AND u.active = 1
      `).all(list.id);
      return { ...list, members };
    });

    return reply.send(listsWithMembers);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/lists', async (req: FastifyRequest<{ Body: { title?: string; color_theme?: string; icon?: string; created_by?: number; default_whatsapp_contact_id?: number } }>, reply: FastifyReply) => {
  try {
    const { title, color_theme = 'blue', icon = 'list', created_by, default_whatsapp_contact_id } = req.body || {};
    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'Title is required' });
    }

    if (created_by === undefined || created_by === null) {
      return reply.status(400).send({ error: 'User ID is required to create a list' });
    }

    const userId = Number(created_by);
    if (isNaN(userId) || userId <= 0) {
      return reply.status(400).send({ error: 'Valid user ID is required' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(userId) as any;
    if (!user) {
      return reply.status(400).send({ error: `User with ID ${userId} does not exist` });
    }

    const stmt = db.prepare(`
      INSERT INTO lists (title, color_theme, icon, created_by, default_whatsapp_contact_id, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    const result = stmt.run(title.trim(), color_theme, icon, userId, default_whatsapp_contact_id || null);

    const newList = db.prepare(`
      SELECT l.*, u.name as owner_name,
        wcu.name as default_whatsapp_contact_name,
        wcu.phone as default_whatsapp_contact_phone,
        0 as share_count, 0 as pending_task_count
      FROM lists l
      LEFT JOIN users u ON l.created_by = u.id AND u.active = 1
      LEFT JOIN users wcu ON l.default_whatsapp_contact_id = wcu.id AND wcu.active = 1
      WHERE l.id = ? AND l.active = 1
    `).get(result.lastInsertRowid) as any;

    newList.members = [];

    broadcastSync('list_created', newList);
    return reply.status(201).send(newList);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.put('/api/lists/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: { title?: string; color_theme?: string; icon?: string; default_whatsapp_contact_id?: number | null } }>, reply: FastifyReply) => {
  try {
    const { title, color_theme, icon, default_whatsapp_contact_id } = req.body || {};
    const updates: string[] = [];
    const params: any[] = [];

    if (title) { updates.push('title = ?'); params.push(title); }
    if (color_theme) { updates.push('color_theme = ?'); params.push(color_theme); }
    if (icon) { updates.push('icon = ?'); params.push(icon); }
    if (default_whatsapp_contact_id !== undefined) {
      updates.push('default_whatsapp_contact_id = ?');
      params.push(default_whatsapp_contact_id);
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE lists SET ${updates.join(', ')} WHERE id = ? AND active = 1`).run(...params);
    }

    const updated = db.prepare(`
      SELECT l.*, u.name as owner_name,
        wcu.name as default_whatsapp_contact_name,
        wcu.phone as default_whatsapp_contact_phone,
        (SELECT COUNT(*) FROM list_shares ls WHERE ls.list_id = l.id AND ls.active = 1) as share_count,
        (SELECT COUNT(*) FROM tasks t WHERE (t.list_id = l.id OR t.id IN (SELECT task_id FROM task_lists WHERE list_id = l.id AND active = 1)) AND t.is_completed = 0 AND t.active = 1) as pending_task_count
      FROM lists l
      LEFT JOIN users u ON l.created_by = u.id AND u.active = 1
      LEFT JOIN users wcu ON l.default_whatsapp_contact_id = wcu.id AND wcu.active = 1
      WHERE l.id = ? AND l.active = 1
    `).get(req.params.id) as any;

    if (updated) {
      const members = db.prepare(`
        SELECT u.id, u.name, u.email, u.phone, u.avatar
        FROM list_shares ls
        JOIN users u ON ls.user_id = u.id
        WHERE ls.list_id = ? AND ls.active = 1 AND u.active = 1
      `).all(req.params.id);
      updated.members = members;
    }

    broadcastSync('list_updated', updated);
    return reply.send(updated);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.delete('/api/lists/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const list = db.prepare('SELECT * FROM lists WHERE id = ? AND active = 1').get(req.params.id) as any;
    if (list && list.is_default) {
      return reply.status(400).send({ error: 'Cannot delete default list' });
    }

    db.prepare('UPDATE lists SET active = 0 WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE task_lists SET active = 0 WHERE list_id = ?').run(req.params.id);
    db.prepare('UPDATE list_shares SET active = 0 WHERE list_id = ?').run(req.params.id);

    broadcastSync('list_deleted', { id: req.params.id });
    return reply.send({ message: 'List deleted' });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/lists/:id/share', async (req: FastifyRequest<{ Params: { id: string }; Body: { userId?: number; userIds?: number[] } }>, reply: FastifyReply) => {
  try {
    const listId = req.params.id;
    const { userId, userIds } = req.body || {};

    const targetUserIds = userIds || (userId ? [userId] : []);
    if (!targetUserIds.length) {
      return reply.status(400).send({ error: 'No user IDs provided to share' });
    }

    const insertShare = db.prepare(`
      INSERT INTO list_shares (list_id, user_id, active)
      VALUES (?, ?, 1)
      ON CONFLICT(list_id, user_id) DO UPDATE SET active = 1
    `);
    for (const uid of targetUserIds) {
      insertShare.run(listId, uid);
    }

    const list = db.prepare('SELECT * FROM lists WHERE id = ? AND active = 1').get(listId) as any;
    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar
      FROM list_shares ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.list_id = ? AND ls.active = 1 AND u.active = 1
    `).all(listId);

    broadcastSync('list_shared', { listId, members });
    return reply.send({ ...list, members });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.delete('/api/lists/:id/share/:userId', async (req: FastifyRequest<{ Params: { id: string; userId: string } }>, reply: FastifyReply) => {
  try {
    const { id: listId, userId } = req.params;
    db.prepare('UPDATE list_shares SET active = 0 WHERE list_id = ? AND user_id = ?').run(listId, userId);

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar
      FROM list_shares ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.list_id = ? AND ls.active = 1 AND u.active = 1
    `).all(listId);

    broadcastSync('list_shared', { listId, members });
    return reply.send({ message: 'User removed from list', members });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

// ----------------------------------------------------
// TASKS API
// ----------------------------------------------------
fastify.get('/api/tasks', async (req: FastifyRequest<{ Querystring: { view?: string; listId?: string; userId?: string } }>, reply: FastifyReply) => {
  try {
    const { view, listId, userId = '1' } = req.query;
    const userIdNum = parseInt(userId, 10) || 1;

    let query = `
      SELECT t.*,
        u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar,
        l.title as list_title, l.color_theme as list_color,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.active = 1) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1 AND st.active = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
      LEFT JOIN lists l ON t.list_id = l.id AND l.active = 1
      WHERE t.active = 1 AND (t.created_by = ? OR t.assigned_to_user_id = ?)
    `;

    const params: any[] = [userIdNum, userIdNum];

    if (listId) {
      query += ` AND (t.id IN (SELECT task_id FROM task_lists WHERE list_id = ? AND active = 1) OR (t.list_id = ? AND EXISTS(SELECT 1 FROM lists WHERE id = ? AND active = 1)))`;
      params.push(listId, listId, listId);
    } else if (view === 'my-day') {
      query += ` AND t.is_my_day = 1`;
    } else if (view === 'important') {
      query += ` AND t.is_important = 1`;
    } else if (view === 'planned') {
      query += ` AND (t.due_date IS NOT NULL OR t.reminder_time IS NOT NULL)`;
    } else if (view === 'assigned-to-me') {
      query += ` AND t.assigned_to_user_id = ?`;
      params.push(userIdNum);
    }

    query += ` ORDER BY t.is_completed ASC, t.is_important DESC, t.id DESC`;

    const tasks = db.prepare(query).all(...params);
    attachTaskLists(tasks);
    return reply.send(tasks);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/tasks/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT t.*,
        u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar,
        l.title as list_title, l.color_theme as list_color,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.active = 1) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1 AND st.active = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
      LEFT JOIN lists l ON t.list_id = l.id AND l.active = 1
      WHERE t.id = ? AND t.active = 1
    `;
    const task = db.prepare(query).get(id) as any;
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }
    attachTaskLists(task);
    return reply.send(task);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/tasks/counts', async (req: FastifyRequest<{ Querystring: { userId?: string } }>, reply: FastifyReply) => {
  try {
    const { userId = '1' } = req.query;
    const userIdNum = parseInt(userId, 10) || 1;

    const row = db.prepare(`
      SELECT
        COUNT(CASE WHEN t.active = 1 AND t.is_completed = 0 AND (t.created_by = ? OR t.assigned_to_user_id = ?) THEN 1 END) as all_tasks_count,
        COUNT(CASE WHEN t.active = 1 AND t.is_completed = 0 AND t.is_important = 1 AND (t.created_by = ? OR t.assigned_to_user_id = ?) THEN 1 END) as important_count,
        COUNT(CASE WHEN t.active = 1 AND t.is_completed = 0 AND t.assigned_to_user_id = ? THEN 1 END) as assigned_count
      FROM tasks t
    `).get(userIdNum, userIdNum, userIdNum, userIdNum, userIdNum) as any;

    return reply.send({
      'all-tasks': row?.all_tasks_count || 0,
      'important': row?.important_count || 0,
      'assigned-to-me': row?.assigned_count || 0,
    });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/tasks', async (req: FastifyRequest<{
  Body: {
    title?: string;
    notes?: string;
    is_important?: number | boolean;
    is_my_day?: number | boolean;
    is_completed?: number | boolean;
    due_date?: string | null;
    reminder_time?: string | null;
    assigned_to_user_id?: number | null;
    created_by?: number;
    list_id?: number | null;
    list_ids?: number[];
    draft_subtasks?: string[];
  };
}>, reply: FastifyReply) => {
  try {
    const {
      title,
      notes,
      is_important = 0,
      is_my_day = 0,
      is_completed = 0,
      due_date,
      reminder_time,
      assigned_to_user_id,
      created_by = 1,
      list_id,
      list_ids,
      draft_subtasks
    } = req.body || {};

    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'Title is required' });
    }

    let targetListIds: number[] = Array.isArray(list_ids) && list_ids.length > 0 ? list_ids : (list_id ? [list_id] : []);

    let primaryListId: number | null = null;
    const validListIds: number[] = [];

    if (targetListIds.length > 0) {
      for (const lid of targetListIds) {
        const numLid = Number(lid);
        if (!isNaN(numLid) && numLid > 0) {
          const l = db.prepare('SELECT id FROM lists WHERE id = ? AND active = 1').get(numLid);
          if (l) {
            validListIds.push(numLid);
            if (!primaryListId) primaryListId = numLid;
          }
        }
      }
    }

    if (!primaryListId) {
      const defaultList = db.prepare('SELECT id FROM lists WHERE is_default = 1 AND active = 1 LIMIT 1').get() as any;
      if (defaultList) {
        primaryListId = defaultList.id;
        validListIds.push(defaultList.id);
      } else {
        const anyList = db.prepare('SELECT id FROM lists WHERE active = 1 ORDER BY id ASC LIMIT 1').get() as any;
        if (anyList) {
          primaryListId = anyList.id;
          validListIds.push(anyList.id);
        }
      }
    }

    let validCreatedBy: number | null = null;
    if (created_by) {
      const u = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(created_by) as any;
      if (u) validCreatedBy = u.id;
    }
    if (!validCreatedBy) {
      const firstUser = db.prepare('SELECT id FROM users WHERE active = 1 ORDER BY id ASC LIMIT 1').get() as any;
      if (firstUser) validCreatedBy = firstUser.id;
    }

    let validAssigneeId: number | null = null;
    if (assigned_to_user_id) {
      const u = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(assigned_to_user_id) as any;
      if (u) validAssigneeId = u.id;
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (list_id, title, notes, is_important, is_my_day, is_completed, due_date, reminder_time, assigned_to_user_id, created_by, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(
      primaryListId,
      title.trim(),
      notes || null,
      is_important ? 1 : 0,
      is_my_day ? 1 : 0,
      is_completed ? 1 : 0,
      due_date || null,
      reminder_time || null,
      validAssigneeId,
      validCreatedBy
    );

    const taskId = result.lastInsertRowid as number;

    // Insert into task_lists junction table
    const insertListStmt = db.prepare(`
      INSERT INTO task_lists (task_id, list_id, active)
      VALUES (?, ?, 1)
      ON CONFLICT(task_id, list_id) DO UPDATE SET active = 1
    `);
    for (const lid of validListIds) {
      insertListStmt.run(taskId, lid);
    }

    // Insert draft steps if provided
    if (Array.isArray(draft_subtasks) && draft_subtasks.length > 0) {
      const insertStep = db.prepare('INSERT INTO subtasks (task_id, title, position, active) VALUES (?, ?, ?, 1)');
      draft_subtasks.forEach((stTitle, idx) => {
        if (typeof stTitle === 'string' && stTitle.trim()) {
          insertStep.run(taskId, stTitle.trim(), idx + 1);
        }
      });
    }

    // Auto-set default whatsapp contact for lists if first task with assignee
    if (validAssigneeId) {
      for (const lid of validListIds) {
        const currentList = db.prepare('SELECT default_whatsapp_contact_id FROM lists WHERE id = ? AND active = 1').get(lid) as any;
        if (currentList && !currentList.default_whatsapp_contact_id) {
          db.prepare('UPDATE lists SET default_whatsapp_contact_id = ? WHERE id = ? AND active = 1').run(validAssigneeId, lid);
          const updatedList = db.prepare(`
            SELECT l.*, u.name as owner_name,
              wcu.name as default_whatsapp_contact_name,
              wcu.phone as default_whatsapp_contact_phone
            FROM lists l
            LEFT JOIN users u ON l.created_by = u.id AND u.active = 1
            LEFT JOIN users wcu ON l.default_whatsapp_contact_id = wcu.id AND wcu.active = 1
            WHERE l.id = ? AND l.active = 1
          `).get(lid);
          broadcastSync('list_updated', updatedList);
        }
      }
    }

    const newTask = db.prepare(`
      SELECT t.*,
        u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar,
        l.title as list_title, l.color_theme as list_color,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.active = 1) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1 AND st.active = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
      LEFT JOIN lists l ON t.list_id = l.id AND l.active = 1
      WHERE t.id = ? AND t.active = 1
    `).get(taskId);

    attachTaskLists(newTask);

    broadcastSync('task_created', newTask);
    return reply.status(201).send(newTask);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.put('/api/tasks/:id', async (req: FastifyRequest<{
  Params: { id: string };
  Body: {
    title?: string;
    notes?: string;
    is_completed?: number | boolean;
    is_important?: number | boolean;
    is_my_day?: number | boolean;
    due_date?: string | null;
    reminder_time?: string | null;
    assigned_to_user_id?: number | null;
    list_id?: number | null;
    list_ids?: number[];
  };
}>, reply: FastifyReply) => {
  try {
    const {
      title,
      notes,
      is_completed,
      is_important,
      is_my_day,
      due_date,
      reminder_time,
      assigned_to_user_id,
      list_id,
      list_ids
    } = req.body || {};

    const taskId = req.params.id;
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (is_completed !== undefined) {
      const completedVal = is_completed ? 1 : 0;
      updates.push('is_completed = ?');
      params.push(completedVal);
      if (completedVal === 1) {
        db.prepare('UPDATE subtasks SET is_completed = 1 WHERE task_id = ? AND active = 1').run(taskId);
        broadcastSync('subtasks_bulk_updated', { taskId, is_completed: 1 });
      }
    }
    if (is_important !== undefined) {
      updates.push('is_important = ?');
      params.push(is_important ? 1 : 0);
    }
    if (is_my_day !== undefined) {
      updates.push('is_my_day = ?');
      params.push(is_my_day ? 1 : 0);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(due_date || null);
    }
    if (reminder_time !== undefined) {
      updates.push('reminder_time = ?');
      params.push(reminder_time || null);
    }
    if (assigned_to_user_id !== undefined) {
      let validUserId = assigned_to_user_id;
      if (validUserId) {
        const u = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(validUserId);
        if (!u) validUserId = null;
      }
      updates.push('assigned_to_user_id = ?');
      params.push(validUserId);
    }

    // Handle list_ids (many-to-many) update
    if (list_ids !== undefined && Array.isArray(list_ids)) {
      db.prepare('UPDATE task_lists SET active = 0 WHERE task_id = ?').run(taskId);
      const insertListStmt = db.prepare(`
        INSERT INTO task_lists (task_id, list_id, active)
        VALUES (?, ?, 1)
        ON CONFLICT(task_id, list_id) DO UPDATE SET active = 1
      `);
      const validLids: number[] = [];
      for (const lid of list_ids) {
        const numLid = Number(lid);
        if (!isNaN(numLid) && numLid > 0) {
          const l = db.prepare('SELECT id FROM lists WHERE id = ? AND active = 1').get(numLid);
          if (l) {
            insertListStmt.run(taskId, numLid);
            validLids.push(numLid);
          }
        }
      }
      updates.push('list_id = ?');
      params.push(validLids[0] || null);
    } else if (list_id !== undefined) {
      let validListId = list_id;
      if (validListId) {
        const l = db.prepare('SELECT id FROM lists WHERE id = ? AND active = 1').get(validListId);
        if (!l) validListId = null;
      }
      updates.push('list_id = ?');
      params.push(validListId);
      if (validListId) {
        db.prepare(`
          INSERT INTO task_lists (task_id, list_id, active)
          VALUES (?, ?, 1)
          ON CONFLICT(task_id, list_id) DO UPDATE SET active = 1
        `).run(taskId, validListId);
      }
    }

    if (updates.length > 0) {
      params.push(taskId);
      db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND active = 1`).run(...params);
    }

    const updatedTask = db.prepare(`
      SELECT t.*,
        u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar,
        l.title as list_title, l.color_theme as list_color,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.active = 1) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1 AND st.active = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
      LEFT JOIN lists l ON t.list_id = l.id AND l.active = 1
      WHERE t.id = ? AND t.active = 1
    `).get(taskId);

    attachTaskLists(updatedTask);

    broadcastSync('task_updated', updatedTask);
    return reply.send(updatedTask);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.delete('/api/tasks/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const taskId = req.params.id;
    db.prepare('UPDATE tasks SET active = 0 WHERE id = ?').run(taskId);
    db.prepare('UPDATE subtasks SET active = 0 WHERE task_id = ?').run(taskId);
    db.prepare('UPDATE task_lists SET active = 0 WHERE task_id = ?').run(taskId);

    broadcastSync('task_deleted', { id: taskId });
    return reply.send({ message: 'Task deleted' });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

// ----------------------------------------------------
// SUBTASKS (STEPS) API
// ----------------------------------------------------
fastify.get('/api/tasks/:id/subtasks', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const subtasks = db.prepare(`
      SELECT * FROM subtasks WHERE task_id = ? AND active = 1 ORDER BY position ASC, id ASC
    `).all(req.params.id);
    return reply.send(subtasks);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/tasks/:id/subtasks', async (req: FastifyRequest<{ Params: { id: string }; Body: { title?: string } }>, reply: FastifyReply) => {
  try {
    const { title } = req.body || {};
    const taskId = req.params.id;
    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'Step title is required' });
    }

    const posRow = db.prepare('SELECT MAX(position) as maxPos FROM subtasks WHERE task_id = ? AND active = 1').get(taskId) as any;
    const nextPos = (posRow?.maxPos || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO subtasks (task_id, title, position, active)
      VALUES (?, ?, ?, 1)
    `);
    const result = stmt.run(taskId, title.trim(), nextPos);

    const newSubtask = db.prepare('SELECT * FROM subtasks WHERE id = ? AND active = 1').get(result.lastInsertRowid);
    broadcastSync('subtask_created', newSubtask);

    const updatedTask = db.prepare(`
      SELECT t.*,
        u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar,
        l.title as list_title, l.color_theme as list_color,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.active = 1) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1 AND st.active = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
      LEFT JOIN lists l ON t.list_id = l.id AND l.active = 1
      WHERE t.id = ? AND t.active = 1
    `).get(taskId);

    attachTaskLists(updatedTask);
    broadcastSync('task_updated', updatedTask);

    return reply.status(201).send(newSubtask);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.put('/api/subtasks/:id', async (req: FastifyRequest<{
  Params: { id: string };
  Body: { title?: string; is_completed?: number | boolean; position?: number };
}>, reply: FastifyReply) => {
  try {
    const { title, is_completed, position } = req.body || {};
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (is_completed !== undefined) { updates.push('is_completed = ?'); params.push(is_completed ? 1 : 0); }
    if (position !== undefined) { updates.push('position = ?'); params.push(position); }

    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ? AND active = 1`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM subtasks WHERE id = ? AND active = 1').get(req.params.id) as any;
    broadcastSync('subtask_updated', updated);

    if (updated && updated.task_id) {
      const stats = db.prepare(`
        SELECT COUNT(*) as total, SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
        FROM subtasks WHERE task_id = ? AND active = 1
      `).get(updated.task_id) as any;

      if (stats && stats.total > 0) {
        if (stats.completed === stats.total) {
          db.prepare('UPDATE tasks SET is_completed = 1 WHERE id = ? AND active = 1').run(updated.task_id);
        } else if (is_completed !== undefined && !is_completed) {
          db.prepare('UPDATE tasks SET is_completed = 0 WHERE id = ? AND active = 1').run(updated.task_id);
        }
      }

      const updatedTask = db.prepare(`
        SELECT t.*,
          u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar,
          l.title as list_title, l.color_theme as list_color,
          (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.active = 1) as subtask_count,
          (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1 AND st.active = 1) as subtask_completed_count
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
        LEFT JOIN lists l ON t.list_id = l.id AND l.active = 1
        WHERE t.id = ? AND t.active = 1
      `).get(updated.task_id);
      if (updatedTask) {
        attachTaskLists(updatedTask);
        broadcastSync('task_updated', updatedTask);
      }
    }

    return reply.send(updated);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.delete('/api/subtasks/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ? AND active = 1').get(req.params.id) as any;
    db.prepare('UPDATE subtasks SET active = 0 WHERE id = ?').run(req.params.id);
    broadcastSync('subtask_deleted', { id: req.params.id, taskId: subtask ? subtask.task_id : null });
    return reply.send({ message: 'Step deleted' });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

// ----------------------------------------------------
// WHATSAPP API
// ----------------------------------------------------
fastify.post('/api/whatsapp/generate-link', async (req: FastifyRequest<{
  Body: {
    type?: string;
    taskId?: number;
    taskIds?: number[];
    listId?: number;
    recipientUserId?: number;
    customPhone?: string;
  };
}>, reply: FastifyReply) => {
  try {
    const { type, taskId, taskIds, listId, recipientUserId, customPhone } = req.body || {};
    let message = '';
    let recipientPhone = customPhone || '';
    let recipientName = 'Recipient';

    if (recipientUserId) {
      const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(recipientUserId) as any;
      if (user) {
        recipientPhone = recipientPhone || user.phone;
        recipientName = user.name;
      }
    }

    if (type === 'single') {
      const task = db.prepare(`
        SELECT t.*, u.name as assignee_name, u.phone as assignee_phone
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
        WHERE t.id = ? AND t.active = 1
      `).get(taskId) as any;

      if (!task) return reply.status(404).send({ error: 'Task not found' });
      const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? AND active = 1').all(taskId) as any[];

      if (!recipientPhone && task.assignee_phone) {
        recipientPhone = task.assignee_phone;
        recipientName = task.assignee_name;
      }

      message = formatSingleTaskMessage(task, { name: recipientName, phone: recipientPhone }, subtasks);
      logWhatsAppMessage({ taskId, phone: recipientPhone, recipientName, message });

    } else if (type === 'batch') {
      if (!taskIds || !taskIds.length) {
        return reply.status(400).send({ error: 'No tasks selected for batch WhatsApp message' });
      }

      const placeholders = taskIds.map(() => '?').join(',');
      const tasks = db.prepare(`
        SELECT t.*, u.name as assignee_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
        WHERE t.id IN (${placeholders}) AND t.active = 1
      `).all(...taskIds) as any[];

      message = formatBatchTasksMessage(tasks);
      logWhatsAppMessage({ taskId: null, phone: recipientPhone, recipientName, message });

    } else if (type === 'list') {
      const list = db.prepare('SELECT * FROM lists WHERE id = ? AND active = 1').get(listId) as any;
      if (!list) return reply.status(404).send({ error: 'List not found' });

      const tasks = db.prepare(`
        SELECT t.*, u.name as assignee_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
        WHERE (t.list_id = ? OR t.id IN (SELECT task_id FROM task_lists WHERE list_id = ? AND active = 1)) AND t.active = 1
      `).all(listId, listId) as any[];

      message = formatWholeListMessage(list, tasks);
      logWhatsAppMessage({ taskId: null, phone: recipientPhone, recipientName, message });
    }

    const waLink = generateWhatsAppWebLink(recipientPhone, message);
    return reply.send({ waLink, message, recipientPhone, recipientName });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/whatsapp/logs', async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const logs = db.prepare(`
      SELECT wl.*, t.title as task_title
      FROM whatsapp_logs wl
      LEFT JOIN tasks t ON wl.task_id = t.id
      ORDER BY wl.sent_at DESC
      LIMIT 100
    `).all();
    return reply.send(logs);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

// ----------------------------------------------------
// AUTOMATED CRON REMINDERS
// ----------------------------------------------------
cron.schedule('* * * * *', () => {
  try {
    const now = new Date();
    const currentDateTimeStr = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const dueTasks = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.phone as assignee_phone
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
      WHERE t.reminder_time IS NOT NULL
        AND t.reminder_time LIKE ?
        AND t.is_completed = 0
        AND t.active = 1
    `).all(`${currentDateTimeStr}%`) as any[];

    if (dueTasks && dueTasks.length > 0) {
      dueTasks.forEach((task) => {
        const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? AND active = 1').all(task.id) as any[];
        const phone = task.assignee_phone || '';
        const name = task.assignee_name || 'Assignee';
        const msg = formatSingleTaskMessage(task, { name, phone }, subtasks);

        logWhatsAppMessage({
          taskId: task.id,
          phone,
          recipientName: name,
          message: msg,
          status: 'reminder_scheduled'
        });

        broadcastSync('reminder_alert', {
          taskId: task.id,
          taskTitle: task.title,
          recipientName: name,
          phone,
          message: msg,
          time: currentDateTimeStr
        });
      });
    }
  } catch (cronErr: any) {
    console.error('Cron reminder check error:', cronErr?.message);
  }
});

// ----------------------------------------------------
// STATIC ASSETS (PRODUCTION CLIENT SERVING)
// ----------------------------------------------------
const clientDistPath = path.resolve(import.meta.dirname, '../../microsoft-todo-client/dist');
if (fs.existsSync(clientDistPath)) {
  fastify.register(fastifyStatic, {
    root: clientDistPath,
    prefix: '/'
  });

  fastify.setNotFoundHandler((_req: FastifyRequest, reply: FastifyReply) => {
    return reply.sendFile('index.html', clientDistPath);
  });
}

// ----------------------------------------------------
// START SERVER
// ----------------------------------------------------
async function startServer() {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Kamdhenu ToDo Fastify Backend running on port ${PORT}`);
  } catch (err: any) {
    console.error('Error starting Fastify server:', err);
    process.exit(1);
  }
}

startServer();
