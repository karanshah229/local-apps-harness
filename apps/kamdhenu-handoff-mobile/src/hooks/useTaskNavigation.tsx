import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useUiStore } from '../store/useUiStore';

/**
 * Instant zero-lag navigation to task details for offline SQLite delegator.
 */
export function useTaskNavigation() {
  const router = useRouter();
  const setSelectedTaskId = useUiStore((s) => s.setSelectedTaskId);

  const openTask = useCallback((taskId: number, themeColor?: string) => {
    if (!taskId || taskId <= 0) return;
    setSelectedTaskId(taskId);
    const query = themeColor ? `?themeColor=${encodeURIComponent(themeColor)}` : '';
    router.push(`/task/${taskId}${query}`);
  }, [router, setSelectedTaskId]);

  const TaskLoadingIndicator = useCallback(() => null, []);

  return {
    openTask,
    isLoadingTask: false,
    TaskLoadingIndicator,
  };
}
