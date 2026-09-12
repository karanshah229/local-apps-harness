import * as Sentry from '@sentry/react-native';
import { installGlobalErrorLogging, logClientEvent } from './clientLogger';
import { BUILD_IDENTITY } from '../config/buildIdentity';

let initialized = false;

function isCrashOrHang(event: Sentry.Event) {
  const text = [
    event.message,
    ...(event.exception?.values ?? []).flatMap(value => [value.type, value.value]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    event.level === 'fatal' ||
    /crash|fatal|anr|app hang|application not responding|deadlock|abort/.test(text)
  );
}

export function initializeObservability() {
  if (initialized) return;
  initialized = true;

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    release: BUILD_IDENTITY.release,
    dist: BUILD_IDENTITY.sentryDist,
    environment: BUILD_IDENTITY.environment,
    enabled: !__DEV__,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    integrations: [
      Sentry.mobileReplayIntegration({
        maskAllText: true,
        maskAllImages: true,
        maskAllVectors: true,
        beforeErrorSampling: isCrashOrHang,
      }),
    ],
  });

  installGlobalErrorLogging();
  void Sentry.crashedLastRun()
    .then(wasCrashed => {
      if (wasCrashed)
        logClientEvent({ event: 'previous_session_crashed', outcome: 'failure', level: 'error' });
    })
    .catch(() => {});

  logClientEvent({ event: 'app_started', outcome: 'success', level: 'info' });
}
