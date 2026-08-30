import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { normalizeToE164 } from '@shared/todo';

const dbPath = process.env.DATABASE_PATH || path.join(import.meta.dirname, '../todo.db');
const db: DatabaseType = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
export function initDb(): void {
  db.exec(`
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
      created_by INTEGER NOT NULL,
      is_default BOOLEAN DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
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
      created_by INTEGER,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
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

    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      recipient_phone TEXT,
      recipient_name TEXT,
      message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'sent'
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
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY,
      remember_last_view BOOLEAN DEFAULT 1,
      last_view_type TEXT DEFAULT 'tab',
      last_view_id TEXT DEFAULT 'all-tasks',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migrate existing tables to add active column if not present
  const tablesWithActive = ['users', 'lists', 'list_shares', 'tasks', 'subtasks', 'task_lists'];
  for (const tbl of tablesWithActive) {
    try {
      db.exec(`ALTER TABLE ${tbl} ADD COLUMN active BOOLEAN DEFAULT 1;`);
    } catch (_e) {
      // Column already exists
    }
    try {
      db.exec(`UPDATE ${tbl} SET active = 1 WHERE active IS NULL;`);
    } catch (_e) {
      // ignore
    }
  }

  // Migrate existing single list_id into task_lists table
  try {
    db.exec(`
      INSERT OR IGNORE INTO task_lists (task_id, list_id)
      SELECT id, list_id FROM tasks WHERE list_id IS NOT NULL;
    `);
  } catch (migErr: any) {
    console.warn('Migration task_lists notice:', migErr?.message);
  }

  // Migrate lists table to add default_whatsapp_contact_id
  try {
    db.exec(`
      ALTER TABLE lists ADD COLUMN default_whatsapp_contact_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `);
  } catch (_e) {
    // Column already exists
  }

  // Migrate user_preferences table to add sort_preferences
  try {
    db.exec(`
      ALTER TABLE user_preferences ADD COLUMN sort_preferences TEXT DEFAULT '{}';
    `);
  } catch (_e) {
    // Column already exists
  }

  // Seed sample users if users table is empty
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    console.log('Seeding initial contacts...');

    // Seed Users (User Library)
    const insertUser = db.prepare('INSERT INTO users (name, email, phone, avatar) VALUES (?, ?, ?, ?)');
    insertUser.run('Alex Johnson', 'alex@example.com', '+14155552671', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
    insertUser.run('Sarah Connor', 'sarah@example.com', '+919876543210', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150');
    insertUser.run('Michael Scott', 'michael@office.com', '+15550192834', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');
    insertUser.run('Priya Sharma', 'priya@tech.in', '+919123456789', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150');
  }

  // Ensure user with ID 1 exists as primary user
  const user1 = db.prepare('SELECT id FROM users WHERE id = 1').get();
  if (!user1) {
    db.prepare("INSERT OR IGNORE INTO users (id, name, email, phone) VALUES (1, 'Primary User', 'primary@local.todo', '+14155552671')").run();
  }

  // Ensure default preferences row exists for user 1
  db.prepare(`
    INSERT OR IGNORE INTO user_preferences (user_id, remember_last_view, last_view_type, last_view_id)
    VALUES (1, 1, 'tab', 'all-tasks')
  `).run();

  // Normalize existing phone numbers to E.164 standard
  try {
    const existingUsers = db.prepare('SELECT id, phone FROM users').all() as Array<{ id: number; phone: string }>;
    const updatePhoneStmt = db.prepare('UPDATE users SET phone = ? WHERE id = ?');
    for (const u of existingUsers) {
      if (u.phone && !u.phone.startsWith('+')) {
        const e164 = normalizeToE164(u.phone);
        if (e164) {
          updatePhoneStmt.run(e164, u.id);
        }
      }
    }
  } catch (normErr: any) {
    console.warn('Phone normalization warning:', normErr?.message);
  }
}

initDb();

export default db;
