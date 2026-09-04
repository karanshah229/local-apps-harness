import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDueDateDDMMYY,
  formatDueDateDDMMYYYY,
  isTaskOverdue,
  formatDueDateDisplay,
  zonedDateTimeToUtcIso,
  getCalendarDateInTimeZone,
  getQuickDueDatePresets,
} from '../packages/todo-shared/dist/index.js';

test('Due dates use local end-of-day converted to UTC ISO', () => {
  const stored = zonedDateTimeToUtcIso('2026-09-04', 'Asia/Kolkata');
  assert.equal(stored, '2026-09-04T18:29:59.999Z');
  assert.equal(getCalendarDateInTimeZone(stored, 'Asia/Kolkata'), '2026-09-04');
  const presets = getQuickDueDatePresets('Asia/Kolkata');
  assert.match(presets.today, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.999Z$/);
});

test('Due date formatting: DD-MM-YYYY and Overdue styling', () => {
  // 1. formatDueDateDDMMYYYY and formatDueDateDDMMYY
  assert.equal(formatDueDateDDMMYYYY('2026-07-08'), '08-07-2026');
  assert.equal(formatDueDateDDMMYYYY('2026-12-31'), '31-12-2026');
  assert.equal(formatDueDateDDMMYYYY('2025-01-05'), '05-01-2025');
  assert.equal(formatDueDateDDMMYYYY(''), '');
  assert.equal(formatDueDateDDMMYYYY(null), '');

  assert.equal(formatDueDateDDMMYY('2026-07-08'), '08-07-26');
  assert.equal(formatDueDateDDMMYY('2026-12-31'), '31-12-26');
  assert.equal(formatDueDateDDMMYY('2025-01-05'), '05-01-25');

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
  assert.equal(overdueInfo.formattedDDMMYYYY, '08-07-2026');
  assert.equal(overdueInfo.label, 'Overdue • 08-07-2026');

  const futureInfo = formatDueDateDisplay('2029-05-15', false);
  assert.ok(futureInfo);
  assert.equal(futureInfo.isOverdue, false);
  assert.equal(futureInfo.label, '15-05-2029');
});
