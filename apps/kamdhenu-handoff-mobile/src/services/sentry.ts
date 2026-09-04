import * as Sentry from '@sentry/react-native';
import appConfig from '../../app.json';
import { installGlobalErrorLogging, logClientEvent } from './clientLogger';

let initialized = false;

function isCrashOrHang(event: Sentry.Event) {
  const text = [
    event.message,
    ...(event.exception?.values ?? []).flatMap(value => [value.type, value.value]),
  ].filter(Boolean).join(' ').toLowerCase();
  return event.level === 'fatal' || /crash|fatal|anr|app hang|application not responding|deadlock|abort/.test(text);
}

export function initializeObservability() {
  if (initialized) return;
  initialized = true;

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    release: appConfig.expo?.version,
    dist: String(appConfig.expo?.android?.versionCode ?? ''),
    enabled: !__DEV__,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration({
      maskAllText: true,
      maskAllImages: true,
      maskAllVectors: true,
      beforeErrorSampling: isCrashOrHang,
    })],
  });

  installGlobalErrorLogging();
  void Sentry.crashedLastRun().then(wasCrashed => {
    if (wasCrashed) logClientEvent({ event: 'previous_session_crashed', outcome: 'failure', level: 'error' });
  }).catch(() => {});

  logClientEvent({ event: 'app_started', outcome: 'success', level: 'info' });
}
