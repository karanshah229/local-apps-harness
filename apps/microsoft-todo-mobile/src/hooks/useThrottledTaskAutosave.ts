import { useCallback, useEffect, useRef, useState } from 'react';
import { Task } from '@shared/todo';
import { logClientEvent } from '../services/clientLogger';

export type TaskAutosaveStatus = 'draft' | 'saving' | 'saved' | 'error';
export type TaskFeedbackType = 'loading' | 'success' | 'error' | null;

interface UseThrottledTaskAutosaveOptions {
  taskId: number | null;
  enabled: boolean;
  save: (updates: Partial<Task> & { id: number }) => Promise<unknown> | unknown;
  waitMs?: number;
  slowThresholdMs?: number;
}

const DEFAULT_WAIT_MS = 600;
const DEFAULT_SLOW_THRESHOLD_MS = 1000;

export function useThrottledTaskAutosave({
  taskId,
  enabled,
  save,
  waitMs = DEFAULT_WAIT_MS,
  slowThresholdMs = DEFAULT_SLOW_THRESHOLD_MS,
}: UseThrottledTaskAutosaveOptions) {
  const [status, setStatus] = useState<TaskAutosaveStatus>(enabled ? 'saved' : 'draft');
  const [isSlowSaving, setIsSlowSaving] = useState(false);
  const [feedbackType, setFeedbackType] = useState<TaskFeedbackType>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const pendingUpdatesRef = useRef<Partial<Task> | null>(null);
  const failedUpdatesRef = useRef<Partial<Task> | null>(null);
  const queuedTaskIdRef = useRef<number | null>(taskId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastStartedAtRef = useRef(0);
  const mountedRef = useRef(true);
  const saveRef = useRef(save);
  const wasSlowRef = useRef(false);
  const invokeRef = useRef<() => Promise<void>>(async () => undefined);
  const scheduleRef = useRef<() => void>(() => undefined);

  saveRef.current = save;

  const updateStatus = (nextStatus: TaskAutosaveStatus) => {
    if (mountedRef.current) setStatus(nextStatus);
  };

  scheduleRef.current = () => {
    if (!pendingUpdatesRef.current || inFlightRef.current || timerRef.current) return;

    const elapsed = Date.now() - lastStartedAtRef.current;
    const remaining = Math.max(0, waitMs - elapsed);
    if (remaining === 0) {
      void invokeRef.current();
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void invokeRef.current();
    }, remaining);
  };

  invokeRef.current = async () => {
    if (inFlightRef.current || !pendingUpdatesRef.current || !queuedTaskIdRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (clearFeedbackTimerRef.current) {
      clearTimeout(clearFeedbackTimerRef.current);
      clearFeedbackTimerRef.current = null;
    }

    const updates = pendingUpdatesRef.current!;
    const saveTaskId = queuedTaskIdRef.current!;
    pendingUpdatesRef.current = null;
    lastStartedAtRef.current = Date.now();
    updateStatus('saving');

    wasSlowRef.current = false;

    // Start 1-second timer to detect slow network / server
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      if (mountedRef.current && inFlightRef.current) {
        wasSlowRef.current = true;
        setIsSlowSaving(true);
        setFeedbackType('loading');
        setShowFeedback(true);
      }
    }, slowThresholdMs);

    const startedAt = Date.now();
    try {
      const request = Promise.resolve()
        .then(() => saveRef.current({ id: saveTaskId, ...updates }))
        .then(() => undefined);
      inFlightRef.current = request;
      await request;

      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }

      failedUpdatesRef.current = null;
      if (!pendingUpdatesRef.current) {
        updateStatus('saved');

        // If the save took > 1s (or isSlowSaving was active), show success feedback for 2.5s
        if (wasSlowRef.current || Date.now() - startedAt >= slowThresholdMs) {
          if (mountedRef.current) {
            setIsSlowSaving(false);
            setFeedbackType('success');
            setShowFeedback(true);

            clearFeedbackTimerRef.current = setTimeout(() => {
              if (mountedRef.current) {
                setShowFeedback(false);
                setFeedbackType(null);
              }
            }, 2500);
          }
        } else if (mountedRef.current) {
          setIsSlowSaving(false);
          setShowFeedback(false);
          setFeedbackType(null);
        }
      }
    } catch {
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }

      if (pendingUpdatesRef.current) {
        const newerUpdates: Partial<Task> = pendingUpdatesRef.current;
        pendingUpdatesRef.current = Object.assign({}, updates, newerUpdates);
      } else {
        failedUpdatesRef.current = updates;
      }
      updateStatus('error');
      if (mountedRef.current) {
        setIsSlowSaving(false);
        setFeedbackType('error');
        setShowFeedback(true);
      }

      logClientEvent({
        level: 'error',
        event: 'task_autosave_failed',
        outcome: 'failure',
        durationMs: Date.now() - startedAt,
        taskId: saveTaskId,
      });
    } finally {
      inFlightRef.current = null;
      if (pendingUpdatesRef.current) {
        updateStatus('saving');
        scheduleRef.current();
      }
    }
  };

  const queueSave = useCallback((updates: Partial<Task>) => {
    if (!enabled || !taskId) return;

    queuedTaskIdRef.current = taskId;
    pendingUpdatesRef.current = {
      ...(failedUpdatesRef.current || {}),
      ...(pendingUpdatesRef.current || {}),
      ...updates,
    };
    failedUpdatesRef.current = null;
    updateStatus('saving');
    scheduleRef.current();
  }, [enabled, taskId]);

  const flush = useCallback(async () => {
    if (!enabled || !taskId) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (failedUpdatesRef.current) {
      pendingUpdatesRef.current = {
        ...failedUpdatesRef.current,
        ...(pendingUpdatesRef.current || {}),
      };
      failedUpdatesRef.current = null;
    }

    if (inFlightRef.current) await inFlightRef.current.catch(() => undefined);
    if (pendingUpdatesRef.current) await invokeRef.current();
  }, [enabled, taskId]);

  useEffect(() => {
    queuedTaskIdRef.current = taskId;
    setStatus(enabled ? 'saved' : 'draft');
    return () => {
      void flush();
    };
  }, [enabled, taskId, flush]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      if (clearFeedbackTimerRef.current) {
        clearTimeout(clearFeedbackTimerRef.current);
        clearFeedbackTimerRef.current = null;
      }
      if (pendingUpdatesRef.current && !inFlightRef.current) void invokeRef.current();
    };
  }, []);

  return {
    status,
    isSlowSaving,
    feedbackType,
    showFeedback,
    queueSave,
    flush,
  };
}

export function getTaskAutosaveLabel(status: TaskAutosaveStatus) {
  switch (status) {
    case 'saving':
      return 'Saving…';
    case 'error':
      return 'Save failed';
    case 'draft':
      return 'Draft';
    case 'saved':
    default:
      return 'Saved';
  }
}
