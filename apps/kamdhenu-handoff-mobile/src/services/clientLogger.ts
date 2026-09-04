import { Platform, Share } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { logger, type transportFunctionType } from 'react-native-logs';
import * as Sentry from '@sentry/react-native';
import appConfig from '../../app.json';

const APP_ID = 'kamdhenu-handoff';
const MAX_ENTRIES = 250;
const LOG_FILE = `${FileSystem.documentDirectory ?? ''}kamdhenu-diagnostics.jsonl`;
const APP_VERSION = appConfig.expo?.version ?? Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
const JOURNEY_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogData = Record<string, unknown> | undefined;

export interface ClientLogEvent {
  level?: LogLevel;
  event: string;
  outcome?: 'started' | 'success' | 'failure' | 'ignored' | 'cancelled';
  durationMs?: number;
  taskId?: number;
  attemptId?: string;
  data?: LogData;
}

const entries: string[] = [];
const pendingEntries: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushChain: Promise<void> = Promise.resolve();
let sharePromise: Promise<any> | null = null;
let hasLoadedEntries = false;

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY = /(title|note|message|phone|email|name|query|content|description|due.?date|subtask|payload|token|secret|password|authorization)/i;

function redactValue(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) return REDACTED;
  if (Array.isArray(value)) return value.map(item => redactValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redactValue(childValue, childKey)]));
  }
  return value;
}

function eventData(data: LogData): LogData {
  return data ? redactValue(data) as LogData : data;
}

function appendEntry(line: string) {
  const target = hasLoadedEntries ? entries : pendingEntries;
  target.push(line);
  while (target.length > MAX_ENTRIES) target.shift();
}

function buildEntry(event: ClientLogEvent) {
  return {
    timestamp: new Date().toISOString(),
    app: APP_ID,
    environment: __DEV__ ? 'development' : 'production',
    release: APP_VERSION,
    platform: Platform.OS,
    journeyId: JOURNEY_ID,
    ...event,
    level: event.level ?? 'info',
    data: eventData(event.data),
  };
}

const localTransport: transportFunctionType<any> = ({ msg, level }) => {
  try {
    const line = typeof msg === 'string' ? msg : JSON.stringify(msg);
    appendEntry(line);
    const output = level.text === 'error' ? console.error : level.text === 'warn' ? console.warn : console.log;
    output(line);
  } catch { /* Diagnostics must never affect the product. */ }
  if (!flushTimer) {
    flushTimer = setTimeout(() => { flushTimer = null; void flushDiagnosticLogs(); }, 250);
  }
};

const structuredLogger = logger.createLogger({
  severity: 'debug', transport: localTransport, async: true,
  dateFormat: 'iso', printDate: false, printLevel: false,
});

async function flushDiagnosticLogs() {
  if (!FileSystem.documentDirectory) return;
  await loadPromise;
  const snapshot = entries.join('\n');
  flushChain = flushChain.then(async () => {
    try {
      await FileSystem.writeAsStringAsync(LOG_FILE, snapshot, { encoding: FileSystem.EncodingType.UTF8 });
    } catch { /* Logging is best effort. */ }
  });
  await flushChain;
}

const loadPromise = (async () => {
  try {
    if (FileSystem.documentDirectory) {
      const exists = await FileSystem.getInfoAsync(LOG_FILE);
      if (exists.exists) {
        const contents = await FileSystem.readAsStringAsync(LOG_FILE, { encoding: FileSystem.EncodingType.UTF8 });
        const previous = contents.split('\n').filter(Boolean).slice(-MAX_ENTRIES).flatMap(line => {
          try {
            return [JSON.stringify(redactValue(JSON.parse(line)))];
          } catch {
            return [];
          }
        });
        entries.push(...previous);
      }
    }
  } catch { /* A missing or unreadable prior report must not affect startup. */ }
  finally {
    hasLoadedEntries = true;
    for (const line of pendingEntries) appendEntry(line);
    pendingEntries.length = 0;
  }
})();

export function logClientEvent(event: ClientLogEvent) {
  const entry = buildEntry(event);
  try {
    structuredLogger[entry.level](JSON.stringify(entry));
  } catch { /* Logging must never affect the product. */ }
  try {
    Sentry.addBreadcrumb({
      category: 'app', message: event.event,
      level: event.level === 'error' ? 'error' : event.level === 'warn' ? 'warning' : 'info',
      data: { ...eventData(event.data), outcome: event.outcome, attemptId: event.attemptId },
    });
  } catch { /* Telemetry must never affect the product. */ }
}

export function logError(event: Omit<ClientLogEvent, 'level'>, error?: unknown) {
  logClientEvent({ ...event, level: 'error' });
  try {
    const errorClass = error instanceof Error && error.name ? error.name.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 80) : typeof error;
    Sentry.captureException(new Error(event.event), scope => {
      scope.setTag('app_event', event.event);
      scope.setTag('error_class', errorClass || 'unknown');
      if (event.attemptId) scope.setTag('attempt_id', event.attemptId);
      scope.setContext('diagnostic', eventData(event.data) ?? {});
      return scope;
    });
  } catch { /* Telemetry must never mask the original failure. */ }
}

export async function getDiagnosticReport(): Promise<string> {
  await loadPromise;
  await flushDiagnosticLogs();
  return [`Kamdhenu Handoff diagnostic report`,
    `Version: ${APP_VERSION}`,
    `Platform: ${Platform.OS}`, `Environment: ${__DEV__ ? 'development' : 'production'}`,
    '', 'Recent events:', entries.join('\n')].join('\n');
}

export async function shareDiagnosticReport() {
  if (sharePromise) return sharePromise;
  logClientEvent({ event: 'diagnostic_share_started', outcome: 'started' });
  sharePromise = (async () => {
    try {
      const result = await Share.share({ title: 'Kamdhenu Handoff diagnostic report', message: await getDiagnosticReport() });
      logClientEvent({ event: 'diagnostic_share_completed', outcome: 'success', data: { action: result.action } });
      return result;
    } catch (error) {
      logError({ event: 'diagnostic_share_failed', outcome: 'failure' }, error);
      throw error;
    } finally {
      sharePromise = null;
    }
  })();
  return sharePromise;
}

export function installGlobalErrorLogging() {
  const errorUtils = (globalThis as any).ErrorUtils;
  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      logError({ event: isFatal ? 'js_fatal_error' : 'js_uncaught_error', outcome: 'failure' }, error);
      previous?.(error, isFatal);
    });
  }
  const previousRejection = (globalThis as any).onunhandledrejection;
  (globalThis as any).onunhandledrejection = (event: any) => {
    logError({ event: 'js_unhandled_rejection', outcome: 'failure' }, event?.reason);
    previousRejection?.(event);
  };
}
