import * as Sentry from '@sentry/react-native';
import { assertQaBuild } from '../config/buildIdentity';
import { getDiagnosticReport, logClientEvent, logError } from './clientLogger';

const settleLocalTransport = () => new Promise(resolve => setTimeout(resolve, 750));

async function flushLocalAndSentry() {
  await settleLocalTransport();
  await getDiagnosticReport();
  await Sentry.flush();
}

export async function emitQaBreadcrumbProbe() {
  assertQaBuild();
  logClientEvent({
    event: 'qa_breadcrumb_probe',
    outcome: 'success',
    data: { probe: 'breadcrumb', safeMarker: 'QA_BREADCRUMB_PROBE' },
  });
  await flushLocalAndSentry();
}

export async function captureQaHandledError() {
  assertQaBuild();
  logError(
    {
      event: 'qa_handled_error_probe',
      outcome: 'failure',
      data: { probe: 'handled_error', safeMarker: 'QA_HANDLED_ERROR_PROBE' },
    },
    new Error('QaHandledError')
  );
  await flushLocalAndSentry();
}

export async function generateQaRetentionProbe() {
  assertQaBuild();
  const runId = `qa-retention-${Date.now()}`;
  for (let sequence = 1; sequence <= 260; sequence += 1) {
    logClientEvent({
      event: 'qa_retention_probe',
      outcome: 'success',
      level: 'debug',
      data: { runId, sequence },
    });
  }
  await flushLocalAndSentry();
  return runId;
}

export async function triggerQaJsCrash() {
  assertQaBuild();
  logClientEvent({ event: 'qa_js_crash_requested', outcome: 'started', level: 'warn' });
  await flushLocalAndSentry();
  setTimeout(() => {
    throw new Error('QaJsCrash');
  }, 100);
}

export async function triggerQaNativeCrash() {
  assertQaBuild();
  logClientEvent({ event: 'qa_native_crash_requested', outcome: 'started', level: 'warn' });
  await flushLocalAndSentry();
  Sentry.nativeCrash();
}
