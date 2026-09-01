import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

test('Mobile SQLite schema and local repository CRUD operations', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  // DDL
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      avatar TEXT,
      is_group BOOLEAN DEFAULT 0,
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
      whatsapp_message_style TEXT DEFAULT 'modern',
      whatsapp_include_notes BOOLEAN DEFAULT 1,
      whatsapp_include_assignee BOOLEAN DEFAULT 1,
      whatsapp_include_important BOOLEAN DEFAULT 1,
      whatsapp_include_steps BOOLEAN DEFAULT 1,
      whatsapp_include_due_date BOOLEAN DEFAULT 1,
      whatsapp_list_layout TEXT DEFAULT 'compact',
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
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE SET NULL,
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
      pinned_views TEXT DEFAULT '["important","assigned-to-me"]',
      has_chosen_whatsapp_format BOOLEAN DEFAULT 0,
      default_whatsapp_style TEXT DEFAULT 'modern',
      default_whatsapp_include_notes BOOLEAN DEFAULT 1,
      default_whatsapp_include_assignee BOOLEAN DEFAULT 1,
      default_whatsapp_include_important BOOLEAN DEFAULT 1,
      default_whatsapp_include_steps BOOLEAN DEFAULT 1,
      default_whatsapp_include_due_date BOOLEAN DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS custom_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      color_theme TEXT DEFAULT 'teal',
      icon TEXT DEFAULT 'view',
      filter_config TEXT DEFAULT '{}',
      sort_config TEXT DEFAULT '{"field":"smart","direction":"asc"}',
      default_whatsapp_contact_id INTEGER,
      default_whatsapp_share_scope TEXT,
      whatsapp_message_style TEXT DEFAULT 'modern',
      whatsapp_include_notes BOOLEAN DEFAULT 1,
      whatsapp_include_assignee BOOLEAN DEFAULT 1,
      whatsapp_include_important BOOLEAN DEFAULT 1,
      whatsapp_include_steps BOOLEAN DEFAULT 1,
      whatsapp_include_due_date BOOLEAN DEFAULT 1,
      whatsapp_list_layout TEXT DEFAULT 'compact',
      position INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (default_whatsapp_contact_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Default seed: Admin user and preferences (NO default list)
  db.prepare(`INSERT INTO users (id, name, email, phone) VALUES (1, 'Admin', 'admin@local.todo', '+919999999999')`).run();
  db.prepare(`INSERT INTO user_preferences (user_id, remember_last_view, last_view_type, last_view_id) VALUES (1, 1, 'tab', 'all-tasks')`).run();

  // Verify no lists exist initially
  const initialLists = db.prepare(`SELECT * FROM lists WHERE active = 1`).all();
  assert.equal(initialLists.length, 0);

  // Test Contact Creation
  const userResult = db.prepare(`INSERT INTO users (name, email, phone) VALUES (?, ?, ?)`).run('Karan Shah', 'karan@local.todo', '+919876543210');
  assert.equal(Number(userResult.lastInsertRowid), 2);

  // Test Task Creation WITHOUT any list (list_id = NULL)
  const taskResult = db.prepare(`
    INSERT INTO tasks (list_id, title, notes, is_important, assigned_to_user_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(null, 'Delegate stock check', 'Please check warehouse inventory', 1, 2);
  const taskId = Number(taskResult.lastInsertRowid);
  assert.equal(taskId, 1);

  const createdTask = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId);
  assert.equal(createdTask.list_id, null);
  assert.equal(createdTask.title, 'Delegate stock check');

  // Verify task appears in all tasks query even with list_id = null
  const allTasks = db.prepare(`SELECT * FROM tasks WHERE active = 1`).all();
  assert.equal(allTasks.length, 1);
  assert.equal(allTasks[0].id, 1);

  // Test Creating a Custom List
  const listResult = db.prepare(`INSERT INTO lists (title, color_theme) VALUES (?, ?)`).run('Groceries', 'green');
  const listId = Number(listResult.lastInsertRowid);
  assert.equal(listId, 1);

  // Attach task to list
  db.prepare(`INSERT INTO task_lists (task_id, list_id) VALUES (?, ?)`).run(taskId, listId);
  db.prepare(`UPDATE tasks SET list_id = ? WHERE id = ?`).run(listId, taskId);

  const taskInList = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId);
  assert.equal(taskInList.list_id, listId);

  // Delete the list and verify task is NOT deleted, just unassigned
  db.prepare(`UPDATE lists SET active = 0 WHERE id = ?`).run(listId);
  db.prepare(`UPDATE task_lists SET active = 0 WHERE list_id = ?`).run(listId);
  db.prepare(`UPDATE tasks SET list_id = NULL WHERE list_id = ?`).run(listId);

  const unassignedTask = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId);
  assert.equal(unassignedTask.list_id, null);
  assert.equal(unassignedTask.active, 1);

  // Test Subtask Creation
  db.prepare(`INSERT INTO subtasks (task_id, title, position) VALUES (?, ?, ?)`).run(taskId, 'Step 1: Count milk boxes', 1);
  db.prepare(`INSERT INTO subtasks (task_id, title, position) VALUES (?, ?, ?)`).run(taskId, 'Step 2: Count ghee jars', 2);

  const subtasks = db.prepare(`SELECT * FROM subtasks WHERE task_id = ? AND active = 1`).all(taskId);
  assert.equal(subtasks.length, 2);

  // Test Completing Task
  db.prepare(`UPDATE tasks SET is_completed = 1 WHERE id = ?`).run(taskId);
  db.prepare(`UPDATE subtasks SET is_completed = 1 WHERE task_id = ?`).run(taskId);

  const updatedTask = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId);
  assert.equal(updatedTask.is_completed, 1);

  const updatedSubtasks = db.prepare(`SELECT * FROM subtasks WHERE task_id = ?`).all(taskId);
  assert.equal(updatedSubtasks.every(s => s.is_completed === 1), true);

  // Test Preferences
  db.prepare(`UPDATE user_preferences SET last_view_type = 'tab', last_view_id = 'all-tasks' WHERE user_id = 1`).run();
  const prefs = db.prepare(`SELECT * FROM user_preferences WHERE user_id = 1`).get();
  assert.equal(prefs.last_view_type, 'tab');
  assert.equal(prefs.last_view_id, 'all-tasks');

  // Test WhatsApp Log
  db.prepare(`INSERT INTO whatsapp_logs (task_id, recipient_phone, recipient_name, message) VALUES (?, ?, ?, ?)`).run(
    taskId,
    '+919876543210',
    'Karan Shah',
    '*Task*: Delegate stock check\n*Notes*: Please check warehouse inventory'
  );

  const logs = db.prepare(`SELECT * FROM whatsapp_logs WHERE task_id = ?`).all(taskId);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].recipient_name, 'Karan Shah');

  // Test Number-Specific Contacts Creation for Multi-Number Contacts
  const rameshMobile = db.prepare(`INSERT INTO users (name, email, phone) VALUES (?, ?, ?)`).run('Ramesh Patel (Mobile)', 'ramesh_m@local.todo', '+919876511111');
  const rameshWork = db.prepare(`INSERT INTO users (name, email, phone) VALUES (?, ?, ?)`).run('Ramesh Patel (Work)', 'ramesh_w@local.todo', '+919876522222');
  assert.notEqual(rameshMobile.lastInsertRowid, rameshWork.lastInsertRowid);

  const contactEntries = db.prepare(`SELECT * FROM users WHERE name LIKE 'Ramesh Patel%' AND active = 1 ORDER BY name ASC`).all();
  assert.equal(contactEntries.length, 2);
  assert.equal(contactEntries[0].name, 'Ramesh Patel (Mobile)');
  assert.equal(contactEntries[0].phone, '+919876511111');
  assert.equal(contactEntries[1].name, 'Ramesh Patel (Work)');
  assert.equal(contactEntries[1].phone, '+919876522222');

  // Test "Assigned to me" Filtering (Only tasks assigned to user_id = 1 'Self')
  // Task 1 was assigned to user_id 2 (Karan Shah)
  const taskForSelf = db.prepare(`INSERT INTO tasks (title, assigned_to_user_id, active) VALUES (?, 1, 1)`).run('Personal review');
  const taskForOther = db.prepare(`INSERT INTO tasks (title, assigned_to_user_id, active) VALUES (?, 2, 1)`).run('Vendor follow-up');

  const assignedToMeTasks = db.prepare(`SELECT * FROM tasks WHERE active = 1 AND assigned_to_user_id = 1`).all();
  assert.equal(assignedToMeTasks.length, 1);
  assert.equal(assignedToMeTasks[0].title, 'Personal review');

  // Verify task assigned to user 2 does NOT appear in assigned-to-me
  const isOtherInAssignedToMe = assignedToMeTasks.some((t) => t.id === Number(taskForOther.lastInsertRowid));
  assert.equal(isOtherInAssignedToMe, false);

  // Verify assigned_count counts only assigned_to_user_id = 1
  const assignedCountRow = db.prepare(`
    SELECT COUNT(CASE WHEN t.active = 1 AND t.is_completed = 0 AND t.assigned_to_user_id = 1 THEN 1 END) as assigned_count
    FROM tasks t
  `).get();
  assert.equal(assignedCountRow.assigned_count, 1);

  // Test WhatsApp Group Creation and Assignment
  const groupUser = db.prepare(`
    INSERT INTO users (name, email, phone, is_group, active) VALUES (?, ?, ?, 1, 1)
  `).run('Warehouse Ops 🚀', 'group_warehouse_ops_1234@local.todo', '');
  const groupId = Number(groupUser.lastInsertRowid);

  const groupInDb = db.prepare('SELECT * FROM users WHERE id = ?').get(groupId);
  assert.equal(groupInDb.name, 'Warehouse Ops 🚀');
  assert.equal(groupInDb.is_group, 1);
  assert.equal(groupInDb.phone, '');

  // Assign task to WhatsApp Group
  const taskForGroup = db.prepare(`
    INSERT INTO tasks (title, assigned_to_user_id, active) VALUES (?, ?, 1)
  `).run('Unload freight container', groupId);
  const taskGroupRow = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.is_group as assignee_is_group
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to_user_id = u.id
    WHERE t.id = ?
  `).get(taskForGroup.lastInsertRowid);
  assert.equal(taskGroupRow.assignee_name, 'Warehouse Ops 🚀');
  assert.equal(taskGroupRow.assignee_is_group, 1);

  // Set WhatsApp Group as List Default Contact
  const newList = db.prepare(`
    INSERT INTO lists (title, default_whatsapp_contact_id, active) VALUES (?, ?, 1)
  `).run('Logistics', groupId);
  const listRow = db.prepare('SELECT * FROM lists WHERE id = ?').get(newList.lastInsertRowid);
  assert.equal(listRow.default_whatsapp_contact_id, groupId);

  // Test User Preferences Pinned Views
  // Ensure default pinned views
  db.prepare(`
    INSERT OR IGNORE INTO user_preferences (user_id, remember_last_view, last_view_type, last_view_id, sort_preferences, pinned_views)
    VALUES (1, 1, 'tab', 'all-tasks', '{}', '["important","assigned-to-me"]')
  `).run();

  const initialPinnedPrefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = 1').get();
  const pinnedArray = JSON.parse(initialPinnedPrefs.pinned_views);
  assert.deepEqual(pinnedArray, ['important', 'assigned-to-me']);

  // Create a Custom View and Pin it
  const newCustomView = db.prepare(`
    INSERT INTO custom_views (title, color_theme, filter_config, default_whatsapp_contact_id, default_whatsapp_share_scope, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run('Urgent Tasks', 'red', JSON.stringify({ importance: 'important', status: 'pending' }), 1, 'pending');
  const customViewId = Number(newCustomView.lastInsertRowid);

  const fetchedView = db.prepare('SELECT * FROM custom_views WHERE id = ?').get(customViewId);
  assert.equal(fetchedView.default_whatsapp_contact_id, 1);
  assert.equal(fetchedView.default_whatsapp_share_scope, 'pending');

  // Update custom view whatsapp settings
  db.prepare('UPDATE custom_views SET default_whatsapp_share_scope = ? WHERE id = ?').run('all', customViewId);
  const updatedView = db.prepare('SELECT * FROM custom_views WHERE id = ?').get(customViewId);
  assert.equal(updatedView.default_whatsapp_share_scope, 'all');

  // Pin the custom view -> should appear at the end in pin order
  const updatedPinned = [...pinnedArray, `custom_view:${customViewId}`];
  db.prepare(`UPDATE user_preferences SET pinned_views = ? WHERE user_id = 1`).run(JSON.stringify(updatedPinned));

  const prefsAfterPin = db.prepare('SELECT * FROM user_preferences WHERE user_id = 1').get();
  assert.deepEqual(JSON.parse(prefsAfterPin.pinned_views), ['important', 'assigned-to-me', `custom_view:${customViewId}`]);

  // Unpin 'important' -> should leave assigned-to-me and custom view
  const unpinnedImportant = JSON.parse(prefsAfterPin.pinned_views).filter((k) => k !== 'important');
  db.prepare(`UPDATE user_preferences SET pinned_views = ? WHERE user_id = 1`).run(JSON.stringify(unpinnedImportant));

  const prefsAfterUnpin = db.prepare('SELECT * FROM user_preferences WHERE user_id = 1').get();
  assert.deepEqual(JSON.parse(prefsAfterUnpin.pinned_views), ['assigned-to-me', `custom_view:${customViewId}`]);

  // Delete Custom View -> auto-unpin
  db.prepare('UPDATE custom_views SET active = 0 WHERE id = ?').run(customViewId);
  const cleanedPins = JSON.parse(prefsAfterUnpin.pinned_views).filter((k) => k !== `custom_view:${customViewId}`);
  db.prepare(`UPDATE user_preferences SET pinned_views = ? WHERE user_id = 1`).run(JSON.stringify(cleanedPins));

  // WhatsApp Group / Select on send (-1) Foreign Key test
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, phone, is_group, active)
    VALUES (-1, 'WhatsApp Group / Select on send', 'group_whatsapp@local.todo', '', 1, 0)
  `).run();

  const listWithGroup = db.prepare(`
    INSERT INTO lists (title, created_by, default_whatsapp_contact_id, active)
    VALUES ('Group Share List', 1, -1, 1)
  `).run();
  const groupListId = Number(listWithGroup.lastInsertRowid);
  const fetchedGroupList = db.prepare('SELECT * FROM lists WHERE id = ?').get(groupListId);
  assert.equal(fetchedGroupList.default_whatsapp_contact_id, -1);

  // Test Format Inclusions Persistence on Lists and Custom Views
  db.prepare(`
    UPDATE lists
    SET whatsapp_message_style = 'crisp',
        whatsapp_include_notes = 0,
        whatsapp_include_assignee = 1,
        whatsapp_include_important = 0,
        whatsapp_include_steps = 1,
        whatsapp_include_due_date = 0
    WHERE id = ?
  `).run(groupListId);
  const updatedFormatList = db.prepare('SELECT * FROM lists WHERE id = ?').get(groupListId);
  assert.equal(updatedFormatList.whatsapp_message_style, 'crisp');
  assert.equal(updatedFormatList.whatsapp_include_notes, 0);
  assert.equal(updatedFormatList.whatsapp_include_assignee, 1);
  assert.equal(updatedFormatList.whatsapp_include_important, 0);
  assert.equal(updatedFormatList.whatsapp_include_steps, 1);
  assert.equal(updatedFormatList.whatsapp_include_due_date, 0);

  // Test User Preferences Format Inclusions
  db.prepare(`
    UPDATE user_preferences
    SET default_whatsapp_style = 'executive',
        default_whatsapp_include_notes = 1,
        default_whatsapp_include_assignee = 0,
        default_whatsapp_include_important = 1,
        default_whatsapp_include_steps = 0,
        default_whatsapp_include_due_date = 1
    WHERE user_id = 1
  `).run();
  const formatPrefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = 1').get();
  assert.equal(formatPrefs.default_whatsapp_style, 'executive');
  assert.equal(formatPrefs.default_whatsapp_include_notes, 1);
  assert.equal(formatPrefs.default_whatsapp_include_assignee, 0);
  assert.equal(formatPrefs.default_whatsapp_include_important, 1);
  assert.equal(formatPrefs.default_whatsapp_include_steps, 0);
  assert.equal(formatPrefs.default_whatsapp_include_due_date, 1);
});

