import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSingleTaskMessage,
  formatBatchTasksMessage,
  formatWholeListMessage,
} from '../packages/todo-shared/dist/whatsapp.js';

test('WhatsApp delegator message formats contain pure task details and no app links', () => {
  const sampleTask = {
    id: 101,
    title: 'Pick up milk shipment from supplier',
    notes: 'Gate pass is approved. Check expiry batch.',
    is_completed: 0,
    is_important: 1,
    due_date: '2026-09-01',
    reminder_time: '10:00 AM',
    list_title: 'Logistics',
    assignee_name: 'Ramesh Patel',
    active: 1,
    created_at: '2026-08-31T10:00:00Z',
  };

  const steps = [
    { id: 1, task_id: 101, title: 'Check 20 crates', is_completed: 0, position: 1, active: 1 },
    { id: 2, task_id: 101, title: 'Collect physical invoice', is_completed: 1, position: 2, active: 1 },
  ];

  const singleMsg = formatSingleTaskMessage(sampleTask, { name: 'Ramesh Patel', phone: '+919876543210' }, steps);

  // Assert task content is included
  assert.ok(singleMsg.includes('Pick up milk shipment from supplier'));
  assert.ok(singleMsg.includes('Ramesh Patel'));
  assert.ok(singleMsg.includes('Logistics'));
  assert.ok(singleMsg.includes('Check 20 crates'));
  assert.ok(singleMsg.includes('Collect physical invoice'));
  assert.ok(singleMsg.includes('Gate pass is approved'));

  // Assert NO links or app references exist
  assert.ok(!singleMsg.includes('http'));
  assert.ok(!singleMsg.includes('https'));
  assert.ok(!singleMsg.includes('kamdhenu-todo'));
  assert.ok(!singleMsg.includes('Open task'));
  assert.ok(!singleMsg.includes('in app'));

  // Batch tasks message test
  const batchTasks = [
    sampleTask,
    {
      id: 102,
      title: 'Inspect cold storage temp',
      is_completed: 0,
      is_important: 0,
      active: 1,
      created_at: '2026-08-31T10:00:00Z',
    },
  ];

  const batchMsg = formatBatchTasksMessage(batchTasks);
  assert.ok(batchMsg.includes('Pick up milk shipment from supplier'));
  assert.ok(batchMsg.includes('Inspect cold storage temp'));
  assert.ok(!batchMsg.includes('http'));
  assert.ok(!batchMsg.includes('Open in app'));
  assert.ok(!batchMsg.includes('Kamdhenu ToDo'));

  // Whole list message test
  const sampleList = {
    id: 1,
    title: 'Daily Logistics',
    color_theme: 'blue',
    icon: 'list',
    created_by: 1,
    active: 1,
    created_at: '2026-08-31T10:00:00Z',
  };

  const listMsg = formatWholeListMessage(sampleList, batchTasks);
  assert.ok(listMsg.includes('Daily Logistics'));
  assert.ok(listMsg.includes('Pick up milk shipment from supplier'));
  assert.ok(!listMsg.includes('http'));
  assert.ok(!listMsg.includes('Open list'));

  // Test WhatsApp Group task formatting
  const groupTask = {
    ...sampleTask,
    id: 103,
    title: 'Clean dairy tankers',
    assignee_name: 'Operations Team 🚀',
    assignee_is_group: 1,
  };
  const groupMsg = formatSingleTaskMessage(groupTask);
  assert.ok(groupMsg.includes('👥 *Group:* Operations Team 🚀'));
  assert.ok(!groupMsg.includes('👤 *Assigned to:* Operations Team 🚀'));
});
