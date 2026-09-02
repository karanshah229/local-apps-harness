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

  const withoutListName = formatSingleTaskMessage(
    sampleTask,
    { name: 'Ramesh Patel', phone: '+919876543210' },
    steps,
    { style: 'executive', includeListName: false }
  );
  assert.ok(!withoutListName.includes('Logistics'));

  const withoutListHeader = formatWholeListMessage(sampleList, batchTasks, {
    style: 'executive',
    includeListName: false,
  });
  assert.ok(!withoutListHeader.includes('Daily Logistics'));

  // Test WhatsApp Group task formatting - should be ignored even if toggle on
  const groupTask = {
    ...sampleTask,
    id: 103,
    title: 'Clean dairy tankers',
    assignee_name: 'Operations Team 🚀',
    assignee_is_group: 1,
  };
  const groupMsg = formatSingleTaskMessage(groupTask, undefined, [], { style: 'executive', includeAssignee: true });
  assert.ok(!groupMsg.includes('Group:'));
  assert.ok(!groupMsg.includes('Operations Team 🚀'));

  const modernGroupMsg = formatSingleTaskMessage(groupTask, undefined, [], { style: 'modern', includeAssignee: true });
  assert.ok(!modernGroupMsg.includes('Operations Team 🚀'));

  // Test Self assignee formatting - should be ignored
  const selfTask = {
    ...sampleTask,
    id: 105,
    title: 'Check inventory list',
    assigned_to_user_id: 1,
    assignee_name: 'You',
  };
  const selfMsg = formatSingleTaskMessage(selfTask, { name: 'You' }, [], { style: 'modern', includeAssignee: true });
  assert.ok(!selfMsg.includes('👤 You'));
  assert.ok(!selfMsg.includes('👤 Self'));

  // Test Unassigned task formatting
  const unassignedTask = {
    id: 104,
    title: 'Review inventory logs',
    is_completed: 0,
    is_important: 0,
    list_title: 'Test list',
    active: 1,
  };
  const unassignedMsg = formatSingleTaskMessage(unassignedTask);
  assert.ok(!unassignedMsg.includes('Assigned to'));
  assert.ok(!unassignedMsg.includes('Contact'));

  // Test Executive Style Formatting with (Important)
  const executiveMsg = formatSingleTaskMessage(sampleTask, { name: 'Ramesh Patel' }, steps, { style: 'executive' });
  assert.ok(executiveMsg.includes('📌 *Pick up milk shipment from supplier* (Important)'));
  assert.ok(executiveMsg.includes('━━━━━━━━━━━━━━━'));
  assert.ok(executiveMsg.includes('[ ] Check 20 crates'));
  assert.ok(executiveMsg.includes('[✓] ~Collect physical invoice~'));
  assert.ok(executiveMsg.includes('📝 *Note:* Gate pass is approved'));

  // Test Crisp Style Formatting with (Important)
  const crispMsg = formatSingleTaskMessage(sampleTask, { name: 'Ramesh Patel' }, steps, { style: 'crisp' });
  assert.ok(crispMsg.includes('📋 *Pick up milk shipment from supplier* (Important)'));
  assert.ok(crispMsg.includes('◻️ Check 20 crates'));
  assert.ok(crispMsg.includes('✅ ~Collect physical invoice~'));

  // Test Field Inclusions: Exclude Notes Option
  const noNotesMsg = formatSingleTaskMessage(sampleTask, { name: 'Ramesh Patel' }, steps, { style: 'modern', includeNotes: false });
  assert.ok(!noNotesMsg.includes('Note:'));
  assert.ok(!noNotesMsg.includes('Gate pass is approved'));

  // Test Field Inclusions: Exclude Assignee Option
  const noAssigneeMsg = formatSingleTaskMessage(sampleTask, { name: 'Ramesh Patel' }, steps, { style: 'modern', includeAssignee: false });
  assert.ok(!noAssigneeMsg.includes('Ramesh Patel'));

  // Test Field Inclusions: Exclude Important Option
  const noImportantMsg = formatSingleTaskMessage(sampleTask, { name: 'Ramesh Patel' }, steps, { style: 'modern', includeImportant: false });
  assert.ok(!noImportantMsg.includes('(Important)'));
  assert.ok(!noImportantMsg.includes('⭐'));

  // Test Field Inclusions: Exclude Steps Option
  const noStepsMsg = formatSingleTaskMessage(sampleTask, { name: 'Ramesh Patel' }, steps, { style: 'modern', includeSteps: false });
  assert.ok(!noStepsMsg.includes('Steps'));
  assert.ok(!noStepsMsg.includes('Check 20 crates'));

  // Test Field Inclusions: Exclude Due Date Option
  const noDueMsg = formatSingleTaskMessage(sampleTask, { name: 'Ramesh Patel' }, steps, { style: 'modern', includeDueDate: false });
  assert.ok(!noDueMsg.includes('Today'));
  assert.ok(!noDueMsg.includes('10:00 AM'));
});
