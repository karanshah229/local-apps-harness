import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDueDateDDMMYY,
  isTaskOverdue,
  formatDueDateDisplay,
} from '../packages/todo-shared/dist/index.js';

test('Due date formatting: DD-MM-YY and Overdue styling', () => {
  // 1. formatDueDateDDMMYY
  assert.equal(formatDueDateDDMMYY('2026-07-08'), '08-07-26');
  assert.equal(formatDueDateDDMMYY('2026-12-31'), '31-12-26');
  assert.equal(formatDueDateDDMMYY('2025-01-05'), '05-01-25');
  assert.equal(formatDueDateDDMMYY(''), '');
  assert.equal(formatDueDateDDMMYY(null), '');

  // 2. isTaskOverdue
  // '2026-07-08' is in the past compared to today (current time 2026-08-31)
  assert.equal(isTaskOverdue('2026-07-08', false), true);
  assert.equal(isTaskOverdue('2026-07-08', true), false); // completed task is not overdue
  assert.equal(isTaskOverdue('2029-01-01', false), false); // future task is not overdue

  // 3. formatDueDateDisplay
  const overdueInfo = formatDueDateDisplay('2026-07-08', false);
  assert.ok(overdueInfo);
  assert.equal(overdueInfo.isOverdue, true);
  assert.equal(overdueInfo.formattedDDMMYY, '08-07-26');
  assert.equal(overdueInfo.label, 'Overdue • 08-07-26');

  const futureInfo = formatDueDateDisplay('2029-05-15', false);
  assert.ok(futureInfo);
  assert.equal(futureInfo.isOverdue, false);
  assert.equal(futureInfo.label, '15-05-29');
});
