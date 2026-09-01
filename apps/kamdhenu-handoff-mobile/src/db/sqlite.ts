import * as SQLite from 'expo-sqlite';
import {
  Task,
  List,
  User,
  Subtask,
  BatchImportContact,
  UserPreferences,
  CustomView,
  ViewFilterConfig,
  ViewSortConfig,
  normalizeToE164,
} from '@shared/todo';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('kamdhenu_todo.db');
    try {
      dbInstance.execSync(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA temp_store = MEMORY;
        PRAGMA cache_size = -4000;
        PRAGMA foreign_keys = ON;
      `);
    } catch {}
    initDatabaseSchema(dbInstance);
  }
  return dbInstance;
}

function initDatabaseSchema(db: SQLite.SQLiteDatabase): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      avatar TEXT,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      color_theme TEXT DEFAULT 'blue',
      icon TEXT DEFAULT 'list',
      created_by INTEGER DEFAULT 1,
      is_default BOOLEAN DEFAULT 0,
      default_whatsapp_contact_id INTEGER,
      default_whatsapp_share_scope TEXT DEFAULT 'pending',
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (default_whatsapp_contact_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS list_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      active BOOLEAN DEFAULT 1,
      shared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(list_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER,
      title TEXT NOT NULL,
      notes TEXT,
      is_completed BOOLEAN DEFAULT 0,
      is_important BOOLEAN DEFAULT 0,
      is_my_day BOOLEAN DEFAULT 0,
      due_date TEXT,
      reminder_time TEXT,
      assigned_to_user_id INTEGER,
      created_by INTEGER DEFAULT 1,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      is_completed BOOLEAN DEFAULT 0,
      position INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_lists (
      task_id INTEGER NOT NULL,
      list_id INTEGER NOT NULL,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (task_id, list_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      recipient_phone TEXT,
      recipient_name TEXT,
      message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'sent'
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY,
      remember_last_view BOOLEAN DEFAULT 1,
      last_view_type TEXT DEFAULT 'tab',
      last_view_id TEXT DEFAULT 'all-tasks',
      sort_preferences TEXT DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_active_completed ON tasks(active, is_completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id, active);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user ON tasks(assigned_to_user_id, active);
    CREATE INDEX IF NOT EXISTS idx_task_lists_comp ON task_lists(task_id, list_id, active);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id, active, position);
    CREATE INDEX IF NOT EXISTS idx_users_active_name ON users(active, name);
    CREATE INDEX IF NOT EXISTS idx_lists_active ON lists(active, created_at);
  `);

  // Ensure default primary Self user exists
  const primaryUser = db.getFirstSync<{ id: number; name: string }>('SELECT id, name FROM users WHERE id = 1');
  if (!primaryUser) {
    db.runSync(
      `INSERT OR IGNORE INTO users (id, name, email, phone, active) VALUES (1, 'Self', 'self@local.todo', '', 1)`
    );
  } else if (primaryUser.name === 'Admin') {
    db.runSync(`UPDATE users SET name = 'Self' WHERE id = 1`);
  }
  try {
    db.runSync(`UPDATE users SET phone = '' WHERE id = 1 AND (phone LIKE '%999999999%' OR phone = '+919999999999')`);
  } catch {}

  // Remove legacy is_default flags from existing lists
  try {
    db.runSync('UPDATE lists SET is_default = 0 WHERE is_default = 1');
  } catch {}

  // Ensure default_whatsapp_contact_id and default_whatsapp_share_scope columns exist on lists
  try {
    db.runSync('ALTER TABLE lists ADD COLUMN default_whatsapp_contact_id INTEGER');
  } catch {}
  try {
    db.runSync('ALTER TABLE lists ADD COLUMN default_whatsapp_share_scope TEXT');
  } catch {}
  // Ensure is_group column exists on users table
  try {
    db.runSync('ALTER TABLE users ADD COLUMN is_group BOOLEAN DEFAULT 0');
  } catch {}

  // Ensure pinned_views column exists on user_preferences table
  try {
    db.runSync(`ALTER TABLE user_preferences ADD COLUMN pinned_views TEXT DEFAULT '["important","assigned-to-me"]'`);
  } catch {}

  // Create custom_views table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS custom_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      color_theme TEXT DEFAULT 'teal',
      icon TEXT DEFAULT 'view',
      filter_config TEXT DEFAULT '{}',
      sort_config TEXT DEFAULT '{"field":"smart","direction":"asc"}',
      default_whatsapp_contact_id INTEGER,
      default_whatsapp_share_scope TEXT,
      position INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure default_whatsapp_contact_id and default_whatsapp_share_scope columns exist on custom_views
  try {
    const cvCols = db.getAllSync<{ name: string }>('PRAGMA table_info(custom_views)');
    const cvColNames = new Set(cvCols.map((c) => c.name));
    if (!cvColNames.has('default_whatsapp_contact_id')) {
      db.runSync('ALTER TABLE custom_views ADD COLUMN default_whatsapp_contact_id INTEGER');
    }
    if (!cvColNames.has('default_whatsapp_share_scope')) {
      db.runSync('ALTER TABLE custom_views ADD COLUMN default_whatsapp_share_scope TEXT');
    }
  } catch {}

  // Ensure default user_preferences row exists
  const prefs = db.getFirstSync<{ user_id: number }>('SELECT user_id FROM user_preferences WHERE user_id = 1');
  if (!prefs) {
    db.runSync(
      `INSERT OR IGNORE INTO user_preferences (user_id, remember_last_view, last_view_type, last_view_id, sort_preferences) VALUES (1, 1, 'tab', 'all-tasks', '{}')`
    );
  }
}

// ----------------------------------------------------
// HELPER: Attach list memberships to tasks
// ----------------------------------------------------
function attachTaskLists(db: SQLite.SQLiteDatabase, tasks: Task[]): Task[] {
  if (!tasks || tasks.length === 0) return tasks;

  const taskIds = tasks.map((t) => t.id);
  const placeholders = taskIds.map(() => '?').join(',');

  const rows = db.getAllSync<{
    task_id: number;
    list_id: number;
    title: string;
    color_theme: string;
    icon: string;
  }>(
    `
    SELECT tl.task_id, l.id as list_id, l.title, l.color_theme, l.icon
    FROM task_lists tl
    JOIN lists l ON tl.list_id = l.id
    WHERE tl.task_id IN (${placeholders}) AND tl.active = 1 AND l.active = 1
    ORDER BY l.id ASC
    `,
    taskIds
  );

  const listsByTaskId: Record<number, Array<{ id: number; title: string; color_theme?: string; icon?: string }>> = {};
  for (const row of rows) {
    if (!listsByTaskId[row.task_id]) {
      listsByTaskId[row.task_id] = [];
    }
    listsByTaskId[row.task_id].push({
      id: row.list_id,
      title: row.title,
      color_theme: row.color_theme,
      icon: row.icon,
    });
  }

  for (const t of tasks) {
    let assignedLists = listsByTaskId[t.id] || [];
    if (assignedLists.length === 0 && t.list_id) {
      const fallbackList = db.getFirstSync<{ id: number; title: string; color_theme: string; icon: string }>(
        'SELECT id, title, color_theme, icon FROM lists WHERE id = ? AND active = 1',
        [t.list_id]
      );
      if (fallbackList) {
        assignedLists = [fallbackList];
        try {
          db.runSync(
            'INSERT OR IGNORE INTO task_lists (task_id, list_id, active) VALUES (?, ?, 1)',
            [t.id, t.list_id]
          );
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

  return tasks;
}

// ----------------------------------------------------
// LOCAL SQLITE REPOSITORY
// ----------------------------------------------------
export const localTodoDb = {
  // --------------------------------------------------
  // TASKS
  // --------------------------------------------------
  getTasks({
    listId,
    view,
  }: {
    listId?: number | null;
    view?: string | null;
  } = {}): Task[] {
    const db = getDatabase();
    let query = `
      SELECT t.*,
        u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar, u.is_group as assignee_is_group,
        l.title as list_title, l.color_theme as list_color,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.active = 1) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1 AND st.active = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
      LEFT JOIN lists l ON t.list_id = l.id AND l.active = 1
      WHERE t.active = 1
    `;
    const params: (string | number)[] = [];

    if (listId) {
      query += ` AND (t.id IN (SELECT task_id FROM task_lists WHERE list_id = ? AND active = 1) OR (t.list_id = ? AND EXISTS(SELECT 1 FROM lists WHERE id = ? AND active = 1)))`;
      params.push(listId, listId, listId);
    } else if (view === 'my-day') {
      query += ` AND t.is_my_day = 1`;
    } else if (view === 'important') {
      query += ` AND t.is_important = 1`;
    } else if (view === 'planned') {
      query += ` AND (t.due_date IS NOT NULL OR t.reminder_time IS NOT NULL)`;
    } else if (view === 'assigned-to-me' || view === 'assigned_to_me') {
      query += ` AND t.assigned_to_user_id = 1`;
    }

    query += ` ORDER BY t.is_completed ASC, t.is_important DESC, t.id DESC`;

    const tasks = db.getAllSync<Task>(query, params);
    return attachTaskLists(db, tasks);
  },

  getTaskById(id: number): Task | null {
    if (!id || id <= 0) return null;
    const db = getDatabase();
    const query = `
      SELECT t.*,
        u.name as assignee_name, u.phone as assignee_phone, u.avatar as assignee_avatar, u.is_group as assignee_is_group,
        l.title as list_title, l.color_theme as list_color,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.active = 1) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1 AND st.active = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id AND u.active = 1
      LEFT JOIN lists l ON t.list_id = l.id AND l.active = 1
      WHERE t.id = ? AND t.active = 1
    `;
    const task = db.getFirstSync<Task>(query, [id]);
    if (!task) return null;
    return attachTaskLists(db, [task])[0] || null;
  },

  getTaskCounts(): Record<string, number> {
    const db = getDatabase();
    const row = db.getFirstSync<{
      all_tasks_count: number;
      important_count: number;
      assigned_count: number;
    }>(`
      SELECT
        COUNT(CASE WHEN t.active = 1 AND t.is_completed = 0 THEN 1 END) as all_tasks_count,
        COUNT(CASE WHEN t.active = 1 AND t.is_completed = 0 AND t.is_important = 1 THEN 1 END) as important_count,
        COUNT(CASE WHEN t.active = 1 AND t.is_completed = 0 AND t.assigned_to_user_id = 1 THEN 1 END) as assigned_count
      FROM tasks t
    `);

    return {
      'all-tasks': row?.all_tasks_count || 0,
      'important': row?.important_count || 0,
      'assigned-to-me': row?.assigned_count || 0,
    };
  },

  createTask(taskData: {
    title: string;
    notes?: string | null;
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
  }): Task {
    const db = getDatabase();
    const {
      title,
      notes = null,
      is_important = 0,
      is_my_day = 0,
      is_completed = 0,
      due_date = null,
      reminder_time = null,
      assigned_to_user_id = null,
      created_by = 1,
      list_id = null,
      list_ids,
      draft_subtasks,
    } = taskData;

    let targetListIds: number[] = Array.isArray(list_ids) && list_ids.length > 0 ? list_ids : (list_id ? [list_id] : []);
    let primaryListId: number | null = null;
    const validListIds: number[] = [];

    if (targetListIds.length > 0) {
      for (const lid of targetListIds) {
        const numLid = Number(lid);
        if (!isNaN(numLid) && numLid > 0) {
          const l = db.getFirstSync<{ id: number }>('SELECT id FROM lists WHERE id = ? AND active = 1', [numLid]);
          if (l) {
            validListIds.push(numLid);
            if (!primaryListId) primaryListId = numLid;
          }
        }
      }
    }


    let validAssigneeId: number | null = null;
    if (assigned_to_user_id) {
      const u = db.getFirstSync<{ id: number }>('SELECT id FROM users WHERE id = ? AND active = 1', [assigned_to_user_id]);
      if (u) validAssigneeId = u.id;
    }

    const insertResult = db.runSync(
      `
      INSERT INTO tasks (list_id, title, notes, is_important, is_my_day, is_completed, due_date, reminder_time, assigned_to_user_id, created_by, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        primaryListId,
        title.trim(),
        notes || null,
        is_important ? 1 : 0,
        is_my_day ? 1 : 0,
        is_completed ? 1 : 0,
        due_date || null,
        reminder_time || null,
        validAssigneeId,
        created_by || 1,
      ]
    );

    const taskId = insertResult.lastInsertRowId;

    for (const lid of validListIds) {
      db.runSync(
        `INSERT OR REPLACE INTO task_lists (task_id, list_id, active) VALUES (?, ?, 1)`,
        [taskId, lid]
      );
    }

    if (Array.isArray(draft_subtasks) && draft_subtasks.length > 0) {
      draft_subtasks.forEach((stTitle, idx) => {
        if (typeof stTitle === 'string' && stTitle.trim()) {
          db.runSync(
            'INSERT INTO subtasks (task_id, title, position, active) VALUES (?, ?, ?, 1)',
            [taskId, stTitle.trim(), idx + 1]
          );
        }
      });
    }

    // Auto-set default WhatsApp contact for lists if this is the first task with assignee
    if (validAssigneeId) {
      for (const lid of validListIds) {
        const currentList = db.getFirstSync<{ default_whatsapp_contact_id: number | null }>(
          'SELECT default_whatsapp_contact_id FROM lists WHERE id = ? AND active = 1',
          [lid]
        );
        if (currentList && !currentList.default_whatsapp_contact_id) {
          db.runSync(
            'UPDATE lists SET default_whatsapp_contact_id = ? WHERE id = ? AND active = 1',
            [validAssigneeId, lid]
          );
        }
      }
    }

    return this.getTaskById(taskId)!;
  },

  updateTask(id: number, data: Partial<Task>): Task {
    const db = getDatabase();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title.trim());
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes || null);
    }
    if (data.is_completed !== undefined) {
      const completedVal = data.is_completed ? 1 : 0;
      updates.push('is_completed = ?');
      params.push(completedVal);
      if (completedVal === 1) {
        db.runSync('UPDATE subtasks SET is_completed = 1 WHERE task_id = ? AND active = 1', [id]);
      }
    }
    if (data.is_important !== undefined) {
      updates.push('is_important = ?');
      params.push(data.is_important ? 1 : 0);
    }
    if (data.is_my_day !== undefined) {
      updates.push('is_my_day = ?');
      params.push(data.is_my_day ? 1 : 0);
    }
    if (data.due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(data.due_date || null);
    }
    if (data.reminder_time !== undefined) {
      updates.push('reminder_time = ?');
      params.push(data.reminder_time || null);
    }
    if (data.assigned_to_user_id !== undefined) {
      let validUserId = data.assigned_to_user_id;
      if (validUserId) {
        const u = db.getFirstSync<{ id: number }>('SELECT id FROM users WHERE id = ? AND active = 1', [validUserId]);
        if (!u) validUserId = null;
      }
      updates.push('assigned_to_user_id = ?');
      params.push(validUserId || null);
    }

    if (data.list_ids !== undefined && Array.isArray(data.list_ids)) {
      db.runSync('UPDATE task_lists SET active = 0 WHERE task_id = ?', [id]);
      const validLids: number[] = [];
      for (const lid of data.list_ids) {
        const numLid = Number(lid);
        if (!isNaN(numLid) && numLid > 0) {
          const l = db.getFirstSync<{ id: number }>('SELECT id FROM lists WHERE id = ? AND active = 1', [numLid]);
          if (l) {
            db.runSync('INSERT OR REPLACE INTO task_lists (task_id, list_id, active) VALUES (?, ?, 1)', [id, numLid]);
            validLids.push(numLid);
          }
        }
      }
      updates.push('list_id = ?');
      params.push(validLids[0] || null);
    } else if (data.list_id !== undefined) {
      let validListId = data.list_id;
      if (validListId) {
        const l = db.getFirstSync<{ id: number }>('SELECT id FROM lists WHERE id = ? AND active = 1', [validListId]);
        if (!l) validListId = null;
      }
      updates.push('list_id = ?');
      params.push(validListId || null);
      if (validListId) {
        db.runSync('INSERT OR REPLACE INTO task_lists (task_id, list_id, active) VALUES (?, ?, 1)', [id, validListId]);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      db.runSync(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND active = 1`, params);
    }

    return this.getTaskById(id)!;
  },

  deleteTask(id: number): void {
    const db = getDatabase();
    db.runSync('UPDATE tasks SET active = 0 WHERE id = ?', [id]);
    db.runSync('UPDATE subtasks SET active = 0 WHERE task_id = ?', [id]);
    db.runSync('UPDATE task_lists SET active = 0 WHERE task_id = ?', [id]);
  },

  // --------------------------------------------------
  // SUBTASKS (STEPS)
  // --------------------------------------------------
  getSubtasks(taskId: number | null): Subtask[] {
    if (!taskId || taskId <= 0) return [];
    const db = getDatabase();
    return db.getAllSync<Subtask>(
      `SELECT * FROM subtasks WHERE task_id = ? AND active = 1 ORDER BY position ASC, id ASC`,
      [taskId]
    );
  },

  createSubtask(taskId: number, title: string): Subtask {
    const db = getDatabase();
    const posRow = db.getFirstSync<{ maxPos: number | null }>(
      'SELECT MAX(position) as maxPos FROM subtasks WHERE task_id = ? AND active = 1',
      [taskId]
    );
    const nextPos = (posRow?.maxPos || 0) + 1;

    const result = db.runSync(
      'INSERT INTO subtasks (task_id, title, position, active) VALUES (?, ?, ?, 1)',
      [taskId, title.trim(), nextPos]
    );

    return db.getFirstSync<Subtask>('SELECT * FROM subtasks WHERE id = ? AND active = 1', [result.lastInsertRowId])!;
  },

  updateSubtask(id: number, taskId: number, data: Partial<Subtask>): Subtask {
    const db = getDatabase();
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title.trim());
    }
    if (data.is_completed !== undefined) {
      updates.push('is_completed = ?');
      params.push(data.is_completed ? 1 : 0);
    }
    if (data.position !== undefined) {
      updates.push('position = ?');
      params.push(data.position);
    }

    if (updates.length > 0) {
      params.push(id);
      db.runSync(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ? AND active = 1`, params);
    }

    // Auto-update parent task completion if all steps checked / unchecked
    const stats = db.getFirstSync<{ total: number; completed: number }>(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed FROM subtasks WHERE task_id = ? AND active = 1`,
      [taskId]
    );

    if (stats && stats.total > 0) {
      if (stats.completed === stats.total) {
        db.runSync('UPDATE tasks SET is_completed = 1 WHERE id = ? AND active = 1', [taskId]);
      } else if (data.is_completed !== undefined && !data.is_completed) {
        db.runSync('UPDATE tasks SET is_completed = 0 WHERE id = ? AND active = 1', [taskId]);
      }
    }

    return db.getFirstSync<Subtask>('SELECT * FROM subtasks WHERE id = ? AND active = 1', [id])!;
  },

  deleteSubtask(id: number): void {
    const db = getDatabase();
    db.runSync('UPDATE subtasks SET active = 0 WHERE id = ?', [id]);
  },

  // --------------------------------------------------
  // LISTS
  // --------------------------------------------------
  getLists(): List[] {
    const db = getDatabase();
    const lists = db.getAllSync<List & { default_whatsapp_contact_name?: string; default_whatsapp_contact_phone?: string; share_count?: number; pending_task_count?: number }>(`
      SELECT l.*, u.name as owner_name,
        wcu.name as default_whatsapp_contact_name,
        wcu.phone as default_whatsapp_contact_phone,
        (SELECT COUNT(*) FROM list_shares ls WHERE ls.list_id = l.id AND ls.active = 1) as share_count,
        (SELECT COUNT(*) FROM tasks t WHERE (t.list_id = l.id OR t.id IN (SELECT task_id FROM task_lists WHERE list_id = l.id AND active = 1)) AND t.is_completed = 0 AND t.active = 1) as pending_task_count
      FROM lists l
      LEFT JOIN users u ON l.created_by = u.id AND u.active = 1
      LEFT JOIN users wcu ON l.default_whatsapp_contact_id = wcu.id AND wcu.active = 1
      WHERE l.active = 1
      ORDER BY l.created_at ASC
    `);

    for (const list of lists) {
      list.members = db.getAllSync<User>(
        `
        SELECT u.id, u.name, u.email, u.phone, u.avatar
        FROM list_shares ls
        JOIN users u ON ls.user_id = u.id
        WHERE ls.list_id = ? AND ls.active = 1 AND u.active = 1
        `,
        [list.id]
      );
    }

    return lists;
  },

  createList(data: {
    title: string;
    color_theme?: string;
    icon?: string;
    created_by?: number;
    default_whatsapp_contact_id?: number | null;
    default_whatsapp_share_scope?: string;
  }): List {
    const db = getDatabase();
    let themeToUse = data.color_theme;
    if (!themeToUse) {
      const countRow = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM lists WHERE active = 1');
      const count = countRow?.count ?? 0;
      const rotation = ['green', 'pink', 'amber', 'indigo', 'cyan', 'red', 'lime', 'fuchsia', 'teal', 'dark'];
      themeToUse = rotation[count % rotation.length];
    }

    const {
      title,
      icon = 'list',
      created_by = 1,
      default_whatsapp_contact_id = null,
      default_whatsapp_share_scope = null,
    } = data;

    const result = db.runSync(
      `
      INSERT INTO lists (title, color_theme, icon, created_by, default_whatsapp_contact_id, default_whatsapp_share_scope, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      `,
      [title.trim(), themeToUse, icon, created_by || 1, default_whatsapp_contact_id || null, default_whatsapp_share_scope || null]
    );

    const newList = db.getFirstSync<List>(
      `
      SELECT l.*, u.name as owner_name,
        wcu.name as default_whatsapp_contact_name,
        wcu.phone as default_whatsapp_contact_phone,
        0 as share_count, 0 as pending_task_count
      FROM lists l
      LEFT JOIN users u ON l.created_by = u.id AND u.active = 1
      LEFT JOIN users wcu ON l.default_whatsapp_contact_id = wcu.id AND wcu.active = 1
      WHERE l.id = ? AND l.active = 1
      `,
      [result.lastInsertRowId]
    )!;

    newList.members = [];
    return newList;
  },

  updateList(id: number, data: Partial<List>): List {
    const db = getDatabase();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title.trim());
    }
    if (data.color_theme !== undefined) {
      updates.push('color_theme = ?');
      params.push(data.color_theme);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      params.push(data.icon);
    }
    if (data.default_whatsapp_contact_id !== undefined) {
      updates.push('default_whatsapp_contact_id = ?');
      params.push(data.default_whatsapp_contact_id || null);
    }
    if (data.default_whatsapp_share_scope !== undefined) {
      updates.push('default_whatsapp_share_scope = ?');
      params.push(data.default_whatsapp_share_scope);
    }

    if (updates.length > 0) {
      params.push(id);
      db.runSync(`UPDATE lists SET ${updates.join(', ')} WHERE id = ? AND active = 1`, params);
    }

    const updated = db.getFirstSync<List>(
      `
      SELECT l.*, u.name as owner_name,
        wcu.name as default_whatsapp_contact_name,
        wcu.phone as default_whatsapp_contact_phone,
        (SELECT COUNT(*) FROM list_shares ls WHERE ls.list_id = l.id AND ls.active = 1) as share_count,
        (SELECT COUNT(*) FROM tasks t WHERE (t.list_id = l.id OR t.id IN (SELECT task_id FROM task_lists WHERE list_id = l.id AND active = 1)) AND t.is_completed = 0 AND t.active = 1) as pending_task_count
      FROM lists l
      LEFT JOIN users u ON l.created_by = u.id AND u.active = 1
      LEFT JOIN users wcu ON l.default_whatsapp_contact_id = wcu.id AND wcu.active = 1
      WHERE l.id = ? AND l.active = 1
      `,
      [id]
    )!;

    if (updated) {
      updated.members = db.getAllSync<User>(
        `
        SELECT u.id, u.name, u.email, u.phone, u.avatar
        FROM list_shares ls
        JOIN users u ON ls.user_id = u.id
        WHERE ls.list_id = ? AND ls.active = 1 AND u.active = 1
        `,
        [id]
      );
    }

    return updated;
  },

  deleteList(id: number): boolean {
    const db = getDatabase();
    db.runSync('UPDATE lists SET active = 0 WHERE id = ?', [id]);
    db.runSync('UPDATE task_lists SET active = 0 WHERE list_id = ?', [id]);
    db.runSync('UPDATE list_shares SET active = 0 WHERE list_id = ?', [id]);
    db.runSync('UPDATE tasks SET list_id = NULL WHERE list_id = ?', [id]);
    return true;
  },

  // --------------------------------------------------
  // USERS / CONTACTS DIRECTORY
  // --------------------------------------------------
  getUsers(): User[] {
    const db = getDatabase();
    return db.getAllSync<User>(`
      SELECT u.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to_user_id = u.id AND t.is_completed = 0 AND t.active = 1) as pending_task_count
      FROM users u
      WHERE u.active = 1
      ORDER BY CASE WHEN u.id = 1 THEN 0 WHEN u.is_group = 1 THEN 1 ELSE 2 END, u.name ASC
    `);
  },

  createUser(data: { name: string; email?: string; phone?: string; avatar?: string; is_group?: number | boolean }): User {
    const db = getDatabase();
    const { name, avatar, is_group } = data;
    const isGroupVal = is_group ? 1 : 0;
    const rawPhone = data.phone || '';
    const normalizedPhone = isGroupVal ? (rawPhone.trim() || '') : (normalizeToE164(rawPhone) || rawPhone.trim());
    let email = data.email?.trim().toLowerCase();

    if (!email) {
      const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || String(Date.now());
      email = isGroupVal
        ? `group_${cleanName}_${Math.floor(Math.random() * 10000)}@local.todo`
        : `contact_${cleanName}_${Math.floor(Math.random() * 10000)}@local.todo`;
    }

    const result = db.runSync(
      'INSERT INTO users (name, email, phone, avatar, is_group, active) VALUES (?, ?, ?, ?, ?, 1)',
      [name.trim(), email, normalizedPhone, avatar || null, isGroupVal]
    );

    return db.getFirstSync<User>('SELECT * FROM users WHERE id = ? AND active = 1', [result.lastInsertRowId])!;
  },

  updateUser(id: number, data: Partial<User>): User {
    const db = getDatabase();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name.trim());
    }
    if (data.email !== undefined && data.email.trim()) {
      updates.push('email = ?');
      params.push(data.email.trim().toLowerCase());
    }
    if (data.phone !== undefined) {
      const normalized = normalizeToE164(data.phone) || data.phone.trim();
      updates.push('phone = ?');
      params.push(normalized);
    }
    if (data.avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(data.avatar || null);
    }

    if (updates.length > 0) {
      params.push(id);
      db.runSync(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND active = 1`, params);
    }

    return db.getFirstSync<User>('SELECT * FROM users WHERE id = ? AND active = 1', [id])!;
  },

  deleteUser(id: number): void {
    const db = getDatabase();
    db.runSync('UPDATE users SET active = 0 WHERE id = ?', [id]);
    db.runSync('UPDATE tasks SET assigned_to_user_id = NULL WHERE assigned_to_user_id = ?', [id]);
  },

  batchImportUsers(contacts: BatchImportContact[]): {
    insertedCount: number;
    updatedCount: number;
    skippedCount: number;
    success: boolean;
  } {
    if (!contacts || contacts.length === 0) {
      return { insertedCount: 0, updatedCount: 0, skippedCount: 0, success: true };
    }

    const db = getDatabase();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const u of contacts) {
      const rawName = (u.name || '').trim();
      const rawPhone = (u.phone || '').trim();
      const rawEmail = (u.email || '').trim().toLowerCase();

      if (!rawName && !rawPhone && !rawEmail) {
        skipped++;
        continue;
      }

      const name = rawName || rawPhone || 'Contact';
      const normalizedPhone = normalizeToE164(rawPhone) || (rawPhone ? rawPhone.replace(/\s+/g, '') : '') || 'N/A';
      const cleanPhoneKey = normalizedPhone.replace(/\D/g, '') || String(Date.now());

      let existingUser: { id: number; phone: string; email: string } | null = null;
      if (normalizedPhone !== 'N/A' && normalizedPhone.length > 5) {
        existingUser = db.getFirstSync<{ id: number; phone: string; email: string }>(
          'SELECT id, phone, email FROM users WHERE phone = ? AND active = 1',
          [normalizedPhone]
        );
      } else if (rawEmail && !rawEmail.includes('@local.todo')) {
        existingUser = db.getFirstSync<{ id: number; phone: string; email: string }>(
          'SELECT id, phone, email FROM users WHERE LOWER(email) = ? AND active = 1',
          [rawEmail]
        );
      } else if (rawName.length > 0) {
        existingUser = db.getFirstSync<{ id: number; phone: string; email: string }>(
          'SELECT id, phone, email FROM users WHERE LOWER(TRIM(name)) = ? AND active = 1',
          [rawName.toLowerCase()]
        );
      }

      if (existingUser) {
        const nextPhone = (existingUser.phone && existingUser.phone !== 'N/A') ? existingUser.phone : normalizedPhone;
        const nextEmail = (rawEmail && !rawEmail.includes('@local.todo')) ? rawEmail : existingUser.email;
        db.runSync(
          'UPDATE users SET name = ?, email = ?, phone = ?, avatar = COALESCE(?, avatar), active = 1 WHERE id = ?',
          [name, nextEmail, nextPhone, u.avatar || null, existingUser.id]
        );
        updated++;
      } else {
        let email = rawEmail;
        if (!email) {
          email = `contact_${cleanPhoneKey}_${Math.floor(Math.random() * 10000)}@local.todo`;
        }
        try {
          db.runSync(
            'INSERT INTO users (name, email, phone, avatar, active) VALUES (?, ?, ?, ?, 1)',
            [name, email, normalizedPhone, u.avatar || null]
          );
          inserted++;
        } catch {
          skipped++;
        }
      }
    }

    return {
      insertedCount: inserted,
      updatedCount: updated,
      skippedCount: skipped,
      success: true,
    };
  },

  // --------------------------------------------------
  // USER PREFERENCES & PINNING
  // --------------------------------------------------
  getUserPreferences(): UserPreferences {
    const db = getDatabase();
    let prefs = db.getFirstSync<UserPreferences & { sort_preferences?: string | any; pinned_views?: string | any }>(
      'SELECT * FROM user_preferences WHERE user_id = 1'
    );
    if (!prefs) {
      db.runSync(
        `INSERT OR IGNORE INTO user_preferences (user_id, remember_last_view, last_view_type, last_view_id, sort_preferences, pinned_views) VALUES (1, 1, 'tab', 'all-tasks', '{}', '["important","assigned-to-me"]')`
      );
      prefs = db.getFirstSync<UserPreferences & { sort_preferences?: string | any; pinned_views?: string | any }>(
        'SELECT * FROM user_preferences WHERE user_id = 1'
      );
    }
    if (prefs && typeof prefs.sort_preferences === 'string') {
      try {
        prefs.sort_preferences = JSON.parse(prefs.sort_preferences || '{}');
      } catch {
        prefs.sort_preferences = {};
      }
    }
    if (prefs && typeof prefs.pinned_views === 'string') {
      try {
        prefs.pinned_views = JSON.parse(prefs.pinned_views || '[]');
      } catch {
        prefs.pinned_views = ['important', 'assigned-to-me'];
      }
    }
    if (!prefs?.pinned_views || !Array.isArray(prefs.pinned_views)) {
      if (prefs) prefs.pinned_views = ['important', 'assigned-to-me'];
    }

    return prefs || {
      user_id: 1,
      remember_last_view: 1,
      last_view_type: 'tab',
      last_view_id: 'all-tasks',
      sort_preferences: {},
      pinned_views: ['important', 'assigned-to-me'],
    };
  },

  updateUserPreferences(data: Partial<UserPreferences>): UserPreferences {
    const db = getDatabase();
    const existing = this.getUserPreferences();

    const nextRemember = data.remember_last_view !== undefined
      ? (data.remember_last_view ? 1 : 0)
      : (existing.remember_last_view ? 1 : 0);
    const nextType = data.last_view_type !== undefined ? data.last_view_type : existing.last_view_type;
    const nextId = data.last_view_id !== undefined ? data.last_view_id : existing.last_view_id;
    let nextSort = existing.sort_preferences;
    if (data.sort_preferences !== undefined) {
      nextSort = typeof data.sort_preferences === 'string'
        ? data.sort_preferences
        : JSON.stringify(data.sort_preferences);
    } else {
      nextSort = JSON.stringify(existing.sort_preferences || {});
    }

    let nextPinned = existing.pinned_views;
    if (data.pinned_views !== undefined) {
      nextPinned = typeof data.pinned_views === 'string'
        ? data.pinned_views
        : JSON.stringify(data.pinned_views);
    } else {
      nextPinned = JSON.stringify(existing.pinned_views || ['important', 'assigned-to-me']);
    }

    db.runSync(
      `
      UPDATE user_preferences
      SET remember_last_view = ?, last_view_type = ?, last_view_id = ?, sort_preferences = ?, pinned_views = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = 1
      `,
      [nextRemember, nextType, nextId, nextSort, nextPinned]
    );

    return this.getUserPreferences();
  },

  getPinnedViews(): string[] {
    const prefs = this.getUserPreferences();
    return Array.isArray(prefs.pinned_views) ? prefs.pinned_views : ['important', 'assigned-to-me'];
  },

  updatePinnedViews(pinned: string[]): string[] {
    this.updateUserPreferences({ pinned_views: pinned });
    return pinned;
  },

  pinView(viewKey: string): string[] {
    const current = this.getPinnedViews();
    if (!current.includes(viewKey)) {
      const updated = [...current, viewKey];
      this.updatePinnedViews(updated);
      return updated;
    }
    return current;
  },

  unpinView(viewKey: string): string[] {
    const current = this.getPinnedViews();
    const updated = current.filter((k) => k !== viewKey);
    this.updatePinnedViews(updated);
    return updated;
  },

  togglePinView(viewKey: string): string[] {
    const current = this.getPinnedViews();
    if (current.includes(viewKey)) {
      return this.unpinView(viewKey);
    } else {
      return this.pinView(viewKey);
    }
  },

  isViewPinned(viewKey: string): boolean {
    return this.getPinnedViews().includes(viewKey);
  },

  // --------------------------------------------------
  // WHATSAPP LOGS
  // --------------------------------------------------
  logWhatsAppMessage(data: {
    taskId?: number | null;
    phone?: string | null;
    recipientName?: string | null;
    message?: string | null;
    status?: string;
  }): void {
    const db = getDatabase();
    try {
      db.runSync(
        `INSERT INTO whatsapp_logs (task_id, recipient_phone, recipient_name, message, status) VALUES (?, ?, ?, ?, ?)`,
        [data.taskId || null, data.phone || null, data.recipientName || null, data.message || null, data.status || 'sent']
      );
    } catch (e: any) {
      console.warn('Error logging WhatsApp message locally:', e?.message);
    }
  },

  // --------------------------------------------------
  // CUSTOM VIEWS
  // --------------------------------------------------
  getCustomViews(): CustomView[] {
    const db = getDatabase();
    const views = db.getAllSync<CustomView>('SELECT * FROM custom_views WHERE active = 1 ORDER BY position ASC, id ASC');
    return views.map((v) => {
      let filterConfig: ViewFilterConfig = {};
      let sortConfig: ViewSortConfig = { field: 'smart', direction: 'asc' };
      if (typeof v.filter_config === 'string') {
        try { filterConfig = JSON.parse(v.filter_config || '{}'); } catch {}
      } else if (v.filter_config) {
        filterConfig = v.filter_config;
      }
      if (typeof v.sort_config === 'string') {
        try { sortConfig = JSON.parse(v.sort_config || '{}'); } catch {}
      } else if (v.sort_config) {
        sortConfig = v.sort_config;
      }
      const matchedCount = this.countTasksMatchingFilter(filterConfig);
      return {
        ...v,
        filter_config: filterConfig,
        sort_config: sortConfig,
        matched_count: matchedCount,
      };
    });
  },

  getCustomViewById(id: number): CustomView | null {
    if (!id || id <= 0) return null;
    const db = getDatabase();
    const v = db.getFirstSync<CustomView>('SELECT * FROM custom_views WHERE id = ? AND active = 1', [id]);
    if (!v) return null;
    let filterConfig: ViewFilterConfig = {};
    let sortConfig: ViewSortConfig = { field: 'smart', direction: 'asc' };
    if (typeof v.filter_config === 'string') {
      try { filterConfig = JSON.parse(v.filter_config || '{}'); } catch {}
    } else if (v.filter_config) {
      filterConfig = v.filter_config;
    }
    if (typeof v.sort_config === 'string') {
      try { sortConfig = JSON.parse(v.sort_config || '{}'); } catch {}
    } else if (v.sort_config) {
      sortConfig = v.sort_config;
    }
    const matchedCount = this.countTasksMatchingFilter(filterConfig);
    return {
      ...v,
      filter_config: filterConfig,
      sort_config: sortConfig,
      matched_count: matchedCount,
    };
  },

  createCustomView(data: {
    title: string;
    color_theme?: string;
    icon?: string;
    filter_config?: ViewFilterConfig | string;
    sort_config?: ViewSortConfig | string;
    default_whatsapp_contact_id?: number | null;
    default_whatsapp_share_scope?: string | null;
  }): CustomView {
    const db = getDatabase();
    const title = data.title.trim();
    const theme = data.color_theme || 'teal';
    const icon = data.icon || 'view';
    const filterStr = typeof data.filter_config === 'object' ? JSON.stringify(data.filter_config) : (data.filter_config || '{}');
    const sortStr = typeof data.sort_config === 'object' ? JSON.stringify(data.sort_config) : (data.sort_config || '{"field":"smart","direction":"asc"}');
    const contactId = data.default_whatsapp_contact_id ?? null;
    const shareScope = data.default_whatsapp_share_scope ?? null;

    const maxPos = db.getFirstSync<{ max_pos: number }>('SELECT MAX(position) as max_pos FROM custom_views WHERE active = 1');
    const position = (maxPos?.max_pos ?? 0) + 1;

    const result = db.runSync(
      'INSERT INTO custom_views (title, color_theme, icon, filter_config, sort_config, default_whatsapp_contact_id, default_whatsapp_share_scope, position, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [title, theme, icon, filterStr, sortStr, contactId, shareScope, position]
    );
    return this.getCustomViewById(Number(result.lastInsertRowId))!;
  },

  updateCustomView(id: number, data: Partial<CustomView>): CustomView {
    const db = getDatabase();
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: (string | number | null)[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title.trim());
    }
    if (data.color_theme !== undefined) {
      updates.push('color_theme = ?');
      params.push(data.color_theme);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      params.push(data.icon);
    }
    if (data.filter_config !== undefined) {
      updates.push('filter_config = ?');
      params.push(typeof data.filter_config === 'object' ? JSON.stringify(data.filter_config) : data.filter_config);
    }
    if (data.sort_config !== undefined) {
      updates.push('sort_config = ?');
      params.push(typeof data.sort_config === 'object' ? JSON.stringify(data.sort_config) : data.sort_config);
    }
    if (data.default_whatsapp_contact_id !== undefined) {
      updates.push('default_whatsapp_contact_id = ?');
      params.push(data.default_whatsapp_contact_id);
    }
    if (data.default_whatsapp_share_scope !== undefined) {
      updates.push('default_whatsapp_share_scope = ?');
      params.push(data.default_whatsapp_share_scope);
    }
    if (data.position !== undefined) {
      updates.push('position = ?');
      params.push(data.position);
    }

    params.push(id);
    db.runSync(`UPDATE custom_views SET ${updates.join(', ')} WHERE id = ? AND active = 1`, params);
    return this.getCustomViewById(id)!;
  },

  deleteCustomView(id: number): void {
    const db = getDatabase();
    db.runSync('UPDATE custom_views SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    this.unpinView(`custom_view:${id}`);
  },

  countTasksMatchingFilter(filter: ViewFilterConfig): number {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM tasks t WHERE t.active = 1';
    const params: (string | number)[] = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    if (filter.status === 'pending') {
      query += ' AND t.is_completed = 0';
    } else if (filter.status === 'completed') {
      query += ' AND t.is_completed = 1';
    }

    if (filter.importance === 'important') {
      query += ' AND t.is_important = 1';
    } else if (filter.importance === 'normal') {
      query += ' AND t.is_important = 0';
    }

    if (filter.due === 'today') {
      query += ' AND t.due_date = ?';
      params.push(todayStr);
    } else if (filter.due === 'tomorrow') {
      query += ' AND t.due_date = ?';
      params.push(tomorrowStr);
    } else if (filter.due === 'overdue') {
      query += ' AND t.due_date IS NOT NULL AND t.due_date < ? AND t.is_completed = 0';
      params.push(todayStr);
    } else if (filter.due === 'has_due') {
      query += ' AND t.due_date IS NOT NULL';
    } else if (filter.due === 'no_due') {
      query += ' AND t.due_date IS NULL';
    }

    if (filter.listId && filter.listId !== 'all') {
      query += ' AND (t.id IN (SELECT task_id FROM task_lists WHERE list_id = ? AND active = 1) OR (t.list_id = ? AND EXISTS(SELECT 1 FROM lists WHERE id = ? AND active = 1)))';
      params.push(filter.listId, filter.listId, filter.listId);
    }

    if (filter.assigneeId === 'unassigned') {
      query += ' AND (t.assigned_to_user_id IS NULL OR t.assigned_to_user_id = 0)';
    } else if (typeof filter.assigneeId === 'number') {
      query += ' AND t.assigned_to_user_id = ?';
      params.push(filter.assigneeId);
    }

    const res = db.getFirstSync<{ count: number }>(query, params);
    return res?.count || 0;
  },
};
