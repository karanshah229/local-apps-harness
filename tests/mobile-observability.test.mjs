import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const mobile = (...parts) => resolve(root, 'apps/kamdhenu-handoff-mobile', ...parts);
const source = (file) => readFileSync(mobile(...file), 'utf8');

test('mobile observability keeps diagnostic data private and durable', () => {
  const logger = source(['src', 'services', 'clientLogger.ts']);
  const sentry = source(['src', 'services', 'sentry.ts']);
  const task = source(['app', 'task', '[id].tsx']);
  const mutations = source(['src', 'hooks', 'useLocalTodo.ts']);

  assert.match(logger, /SENSITIVE_KEY/);
  assert.match(logger, /readAsStringAsync/);
  assert.match(logger, /flushChain/);
  assert.match(logger, /diagnostic_share_started/);
  assert.match(logger, /journeyId/);
  assert.match(logger, /pendingEntries/);
  assert.match(logger, /hasLoadedEntries/);
  assert.match(logger, /structuredLogger\[entry\.level\]/);
  assert.match(logger, /captureException\(new Error\(event\.event\)/);
  assert.doesNotMatch(logger, /captureException\(error instanceof Error/);
  const startEvent = task.match(/event:\s*'task_create_started'[\s\S]*?data:\s*\{([\s\S]*?)\n\s*\},/);
  assert.ok(startEvent, 'task creation start event should exist');
  assert.doesNotMatch(startEvent[1], /\b(title|notes|dueDate|draftSubtasks)\s*:/);
  assert.match(sentry, /maskAllText:\s*true/);
  assert.match(sentry, /maskAllImages:\s*true/);
  assert.match(sentry, /maskAllVectors:\s*true/);
  assert.match(mutations, /createTaskWithSubtasks/);
  assert.match(mutations, /useMutationState\('create_task', mutate, mutateAsync\)/);
  assert.doesNotMatch(mutations, /return useMutationState\(mutate\)/);
  assert.doesNotMatch(mutations, /return \{ mutate, mutateAsync, isPending: false \}/);
});

test('refreshable mobile screens handle rejected refreshes', () => {
  for (const file of [
    ['app', '(tabs)', 'lists.tsx'],
    ['src', 'components', 'TasksView.tsx'],
    ['src', 'components', 'SingleListView.tsx'],
  ]) {
    const text = source(file);
    assert.match(text, /Promise\.all\([\s\S]*?\)\s*;[\s\S]*?catch \(error\)/);
    assert.match(text, /Refresh failed/);
  }
});

test('mobile feature paths route caught failures through structured logging', () => {
  const files = [
    ['app', '_layout.tsx'],
    ['app', 'contacts', 'index.tsx'],
    ['src', 'components', 'ContactsPage.tsx'],
    ['src', 'components', 'ContactPickerModal.tsx'],
    ['src', 'components', 'WhatsAppShareModal.tsx'],
    ['src', 'services', 'nativeContacts.ts'],
    ['src', 'hooks', 'useLocalTodo.ts'],
    ['src', 'db', 'sqlite.ts'],
  ];
  for (const file of files) assert.match(source(file), /logError\(/);
});
