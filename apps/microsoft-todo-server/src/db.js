const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../todo.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      color_theme TEXT DEFAULT 'blue',
      icon TEXT DEFAULT 'list',
      created_by INTEGER NOT NULL,
      is_default BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS list_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
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
  `);

  // Seed sample data if users table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('Seeding initial data...');
    
    // Seed Users (User Library)
    const insertUser = db.prepare('INSERT INTO users (name, email, phone, avatar) VALUES (?, ?, ?, ?)');
    const u1 = insertUser.run('Alex Johnson', 'alex@example.com', '+14155552671', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150').lastInsertRowid;
    const u2 = insertUser.run('Sarah Connor', 'sarah@example.com', '+919876543210', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150').lastInsertRowid;
    const u3 = insertUser.run('Michael Scott', 'michael@office.com', '+15550192834', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150').lastInsertRowid;
    const u4 = insertUser.run('Priya Sharma', 'priya@tech.in', '+919123456789', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150').lastInsertRowid;

    // Seed Lists
    const insertList = db.prepare('INSERT INTO lists (title, color_theme, icon, created_by, is_default) VALUES (?, ?, ?, ?, ?)');
    const defaultTasksList = insertList.run('Tasks', 'blue', 'check-square', u1, 1).lastInsertRowid;
    const workList = insertList.run('Q3 Product Launch', 'purple', 'briefcase', u1, 0).lastInsertRowid;
    const personalList = insertList.run('Groceries & Home', 'green', 'shopping-bag', u1, 0).lastInsertRowid;

    // Seed List Share (Share Work List with Sarah & Priya)
    const insertShare = db.prepare('INSERT INTO list_shares (list_id, user_id) VALUES (?, ?)');
    insertShare.run(workList, u2);
    insertShare.run(workList, u4);

    // Seed Tasks
    const insertTask = db.prepare(`
      INSERT INTO tasks (list_id, title, notes, is_completed, is_important, is_my_day, due_date, reminder_time, assigned_to_user_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const t1 = insertTask.run(workList, 'Finalize UI wireframes for WhatsApp integration', 'Make sure layout matches Microsoft To Do aesthetics.', 0, 1, 1, today, `${today} 14:00`, u2, u1).lastInsertRowid;
    const t2 = insertTask.run(workList, 'Review backend database schema & indexes', 'Ensure SQLite cascade deletes work properly.', 0, 0, 1, today, null, u4, u1).lastInsertRowid;
    const t3 = insertTask.run(workList, 'Send WhatsApp reminder for sprint review', 'Contact team with updated task items list.', 1, 1, 0, tomorrow, `${tomorrow} 10:00`, u1, u1).lastInsertRowid;

    const t4 = insertTask.run(personalList, 'Buy organic milk, coffee beans & sourdough bread', 'Check local organic market discounts.', 0, 0, 1, today, null, null, u1).lastInsertRowid;
    const t5 = insertTask.run(defaultTasksList, 'Schedule dentist checkup appointment', 'Call Dr. Smith clinic.', 0, 1, 0, tomorrow, null, u3, u1).lastInsertRowid;

    // Seed Subtasks
    const insertSubtask = db.prepare('INSERT INTO subtasks (task_id, title, is_completed, position) VALUES (?, ?, ?, ?)');
    insertSubtask.run(t1, 'Draft left navigation bar with color badges', 1, 1);
    insertSubtask.run(t1, 'Add right-hand slide drawer for task details', 1, 2);
    insertSubtask.run(t1, 'Implement WhatsApp click-to-chat generator button', 0, 3);
    insertSubtask.run(t4, 'Whole grain coffee beans', 1, 1);
    insertSubtask.run(t4, 'Almond milk (unsweetened)', 0, 2);

    console.log('Sample data seeded successfully.');
  }
}

initDb();

module.exports = db;
