type ClientLogLevel = 'warn' | 'error';

interface ClientLogEvent {
  level: ClientLogLevel;
  event: string;
  outcome: 'failure';
  durationMs?: number;
  taskId?: number;
}

export function logClientEvent(event: ClientLogEvent) {
  const entry = {
    timestamp: new Date().toISOString(),
    app: 'kamdhenu-handoff',
    environment: typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production',
    ...event,
  };

  console[event.level](JSON.stringify(entry));
}
