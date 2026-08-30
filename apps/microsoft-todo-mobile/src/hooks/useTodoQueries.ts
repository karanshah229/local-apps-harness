import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { QUERY_KEYS, User, List, Task, Subtask, BatchImportContact, UserPreferences } from '@shared/todo';

import { getBackendApiUrl } from '../services/apiConfig';

export function getApiBaseUrl(): string {
  if (Platform.OS === 'web') return '';
  return getBackendApiUrl();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh
      gcTime: 1000 * 60 * 30, // 30 minutes in memory
      refetchOnMount: false, // Instant navigation using local cache
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

// ----------------------------------------------------
// USERS QUERIES & MUTATIONS
// ----------------------------------------------------
export function useUsersQuery() {
  const baseUrl = getApiBaseUrl();
  return useQuery<User[]>({
    queryKey: QUERY_KEYS.users,
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/api/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useAddUserMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const res = await fetch(`${baseUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!res.ok) throw new Error('Failed to create user');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

export function useUpdateUserMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<User> & { id: number }) => {
      const res = await fetch(`${baseUrl}/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
}

export function useDeleteUserMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`${baseUrl}/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
}

export function useBatchImportUsersMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async (contacts: BatchImportContact[]) => {
      const res = await fetch(`${baseUrl}/api/users/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      });
      if (!res.ok) throw new Error('Failed to batch import users');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

// ----------------------------------------------------
// USER PREFERENCES QUERIES & MUTATIONS
// ----------------------------------------------------
export function useUserPreferencesQuery(userId: number = 1) {
  const baseUrl = getApiBaseUrl();
  return useQuery<UserPreferences>({
    queryKey: ['userPreferences', userId],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/api/user-preferences?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user preferences');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateUserPreferencesMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async (prefs: Partial<UserPreferences> & { userId?: number }) => {
      const res = await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1,
          ...prefs,
        }),
      });
      if (!res.ok) throw new Error('Failed to update user preferences');
      return res.json();
    },
    onSuccess: (updated) => {
      // In-place cache update without triggering an unnecessary GET refetch
      qc.setQueryData(['userPreferences', updated.user_id || 1], updated);
    },
  });
}

// ----------------------------------------------------
// LISTS QUERIES & MUTATIONS
// ----------------------------------------------------
export function useListsQuery(userId: number = 1) {
  const baseUrl = getApiBaseUrl();
  return useQuery<List[]>({
    queryKey: [...QUERY_KEYS.lists, userId],
    queryFn: async () => {
      const url = `${baseUrl}/api/lists?userId=${userId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch lists');
      return res.json();
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateListMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async (listData: { title: string; color_theme?: string; icon?: string; created_by?: number }) => {
      const payload = {
        ...listData,
        created_by: listData.created_by || 1,
      };
      const res = await fetch(`${baseUrl}/api/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create list');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
    },
  });
}

export function useUpdateListMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<List> & { id: number }) => {
      const res = await fetch(`${baseUrl}/api/lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update list');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
}

export function useDeleteListMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async (listId: number) => {
      const res = await fetch(`${baseUrl}/api/lists/${listId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete list');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
}

export function useShareListMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async ({ listId, userIds, userId }: { listId: number; userIds?: number[]; userId?: number }) => {
      const res = await fetch(`${baseUrl}/api/lists/${listId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, userId }),
      });
      if (!res.ok) throw new Error('Failed to share list');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
    },
  });
}

// ----------------------------------------------------
// TASKS QUERIES & MUTATIONS
// ----------------------------------------------------
export function useTasksQuery({ listId, view, userId }: { listId?: number | null; view?: string | null; userId?: number }) {
  const baseUrl = getApiBaseUrl();
  const effectiveUserId = userId || 1;
  return useQuery<Task[]>({
    queryKey: [...QUERY_KEYS.tasks, { listId, view, userId: effectiveUserId }],
    queryFn: async () => {
      let url = `${baseUrl}/api/tasks?`;
      if (listId) {
        url += `listId=${listId}&userId=${effectiveUserId}`;
      } else if (view) {
        url += `view=${view}&userId=${effectiveUserId}`;
      } else {
        url += `view=all-tasks&userId=${effectiveUserId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useTaskQuery(taskId: number | null) {
  const baseUrl = getApiBaseUrl();
  return useQuery<Task>({
    queryKey: taskId ? ['task', taskId] : ['task', 'none'],
    queryFn: async () => {
      if (!taskId || taskId <= 0) throw new Error('Invalid task ID');
      const res = await fetch(`${baseUrl}/api/tasks/${taskId}`);
      if (!res.ok) throw new Error('Failed to fetch task');
      return res.json();
    },
    enabled: Boolean(taskId && taskId > 0),
    placeholderData: (previousData) => previousData,
  });
}

export async function prefetchTaskDetails(taskId: number) {
  const baseUrl = getApiBaseUrl();
  if (!taskId || taskId <= 0) return;
  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['task', taskId],
        queryFn: async () => {
          const res = await fetch(`${baseUrl}/api/tasks/${taskId}`);
          if (!res.ok) throw new Error('Failed to fetch task');
          return res.json();
        },
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.subtasks(taskId),
        queryFn: async () => {
          const res = await fetch(`${baseUrl}/api/tasks/${taskId}/subtasks`);
          if (!res.ok) throw new Error('Failed to fetch subtasks');
          return res.json();
        },
        staleTime: 1000 * 60 * 5,
      }),
    ]);
  } catch (_e) {
    // Ignore background prefetch errors silently
  }
}

export async function prefetchAllTasksInView(tasks: Task[]) {
  if (!tasks || tasks.length === 0) return;
  const promises = tasks.map((t) => prefetchTaskDetails(t.id));
  await Promise.allSettled(promises);
}

export async function fetchTaskForNavigation(taskId: number): Promise<Task> {
  const baseUrl = getApiBaseUrl();
  if (!taskId || taskId <= 0) throw new Error('Invalid task ID');

  // Concurrently ensure both task and subtasks are fetched
  const [task] = await Promise.all([
    queryClient.fetchQuery<Task>({
      queryKey: ['task', taskId],
      queryFn: async () => {
        const res = await fetch(`${baseUrl}/api/tasks/${taskId}`);
        if (!res.ok) throw new Error('Failed to fetch task');
        return res.json();
      },
      staleTime: 1000 * 60 * 5,
    }),
    queryClient.fetchQuery<Subtask[]>({
      queryKey: QUERY_KEYS.subtasks(taskId),
      queryFn: async () => {
        const res = await fetch(`${baseUrl}/api/tasks/${taskId}/subtasks`);
        if (!res.ok) throw new Error('Failed to fetch subtasks');
        return res.json();
      },
      staleTime: 1000 * 60 * 5,
    }),
  ]);

  return task;
}

export function useTaskCountsQuery(userId?: number) {
  const baseUrl = getApiBaseUrl();
  const effectiveUserId = userId || 1;
  return useQuery<Record<string, number>>({
    queryKey: ['taskCounts', effectiveUserId],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/api/tasks/counts?userId=${effectiveUserId}`);
      if (res.ok) {
        return res.json();
      }
      return { 'all-tasks': 0, 'important': 0, 'assigned-to-me': 0 };
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateTaskMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async (taskData: any) => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!res.ok) throw new Error('Failed to create task');
      const newTask: Task = await res.json();

      if (taskData.draft_subtasks && Array.isArray(taskData.draft_subtasks) && newTask?.id) {
        for (const stepTitle of taskData.draft_subtasks) {
          if (stepTitle && typeof stepTitle === 'string' && stepTitle.trim()) {
            await fetch(`${baseUrl}/api/tasks/${newTask.id}/subtasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: stepTitle.trim() }),
            });
          }
        }
      }
      return newTask;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      qc.invalidateQueries({ queryKey: ['taskCounts'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
    },
  });
}

export function useUpdateTaskMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Task> & { id: number }) => {
      const res = await fetch(`${baseUrl}/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onMutate: async ({ id, ...data }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.tasks });
      const previousTasksQueries = qc.getQueriesData<Task[]>({ queryKey: QUERY_KEYS.tasks });
      const previousSubtasks = qc.getQueryData<Subtask[]>(QUERY_KEYS.subtasks(id));

      qc.setQueriesData<Task[]>({ queryKey: QUERY_KEYS.tasks }, (old) =>
        old ? old.map((t) => (t.id === id ? { ...t, ...data } : t)) : []
      );

      // If task is marked complete, optimistically mark all its steps complete
      if (data.is_completed) {
        if (previousSubtasks) {
          qc.setQueryData<Subtask[]>(
            QUERY_KEYS.subtasks(id),
            previousSubtasks.map((st) => ({ ...st, is_completed: 1 }))
          );
        }
      }

      return { previousTasksQueries, previousSubtasks, taskId: id };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasksQueries) {
        for (const [key, val] of context.previousTasksQueries) {
          qc.setQueryData(key, val);
        }
      }
      if (context?.previousSubtasks && context?.taskId) {
        qc.setQueryData(QUERY_KEYS.subtasks(context.taskId), context.previousSubtasks);
      }
    },
    onSuccess: (updatedTask: Task) => {
      qc.setQueriesData<Task[]>({ queryKey: QUERY_KEYS.tasks }, (old) =>
        old ? old.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)) : [updatedTask]
      );
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      qc.invalidateQueries({ queryKey: ['taskCounts'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
      if (updatedTask?.id) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.subtasks(updatedTask.id) });
      }
    },
  });
}

export function useDeleteTaskMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`${baseUrl}/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      qc.invalidateQueries({ queryKey: ['taskCounts'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
    },
  });
}

// ----------------------------------------------------
// SUBTASKS QUERIES & MUTATIONS
// ----------------------------------------------------
export function useSubtasksQuery(taskId: number | null) {
  const baseUrl = getApiBaseUrl();
  return useQuery<Subtask[]>({
    queryKey: taskId ? QUERY_KEYS.subtasks(taskId) : ['subtasks', 'none'],
    queryFn: async () => {
      if (!taskId || taskId <= 0) return [];
      const res = await fetch(`${baseUrl}/api/tasks/${taskId}/subtasks`);
      if (!res.ok) throw new Error('Failed to fetch subtasks');
      return res.json();
    },
    enabled: Boolean(taskId && taskId > 0),
    staleTime: 5000,
  });
}

export function useAddSubtaskMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: number; title: string }) => {
      const res = await fetch(`${baseUrl}/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to add step');
      return res.json();
    },
    onSuccess: (newStep: Subtask, vars) => {
      qc.setQueryData<Subtask[]>(QUERY_KEYS.subtasks(vars.taskId), (old) =>
        old ? [...old, newStep] : [newStep]
      );
    },
  });
}

export function useUpdateSubtaskMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async ({ id, taskId, ...data }: Partial<Subtask> & { id: number; taskId: number }) => {
      const res = await fetch(`${baseUrl}/api/subtasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update step');
      return res.json();
    },
    onMutate: async ({ id, taskId, ...data }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.subtasks(taskId) });
      const previousSubtasks = qc.getQueryData<Subtask[]>(QUERY_KEYS.subtasks(taskId));
      if (previousSubtasks) {
        const nextSubtasks = previousSubtasks.map((st) => (st.id === id ? { ...st, ...data } : st));
        qc.setQueryData<Subtask[]>(QUERY_KEYS.subtasks(taskId), nextSubtasks);

        // If all steps become complete, optimistically mark parent task complete
        const allCompleted = nextSubtasks.length > 0 && nextSubtasks.every((st) => Boolean(st.is_completed));
        if (allCompleted) {
          qc.setQueriesData<Task[]>({ queryKey: QUERY_KEYS.tasks }, (old) =>
            old ? old.map((t) => (t.id === taskId ? { ...t, is_completed: 1 } : t)) : []
          );
        } else if (data.is_completed === 0 || data.is_completed === false) {
          // If a step was unchecked, optimistically mark parent task incomplete
          qc.setQueriesData<Task[]>({ queryKey: QUERY_KEYS.tasks }, (old) =>
            old ? old.map((t) => (t.id === taskId ? { ...t, is_completed: 0 } : t)) : []
          );
        }
      }
      return { previousSubtasks, taskId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSubtasks) {
        qc.setQueryData(QUERY_KEYS.subtasks(context.taskId), context.previousSubtasks);
      }
    },
    onSuccess: (updatedStep: Subtask, vars) => {
      qc.setQueryData<Subtask[]>(QUERY_KEYS.subtasks(vars.taskId), (old) =>
        old ? old.map((st) => (st.id === updatedStep.id ? updatedStep : st)) : [updatedStep]
      );
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      qc.invalidateQueries({ queryKey: ['taskCounts'] });
    },
  });
}

export function useDeleteSubtaskMutation() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: number; taskId: number }) => {
      const res = await fetch(`${baseUrl}/api/subtasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete step');
      return res.json();
    },
    onMutate: async ({ id, taskId }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.subtasks(taskId) });
      const previousSubtasks = qc.getQueryData<Subtask[]>(QUERY_KEYS.subtasks(taskId));
      if (previousSubtasks) {
        qc.setQueryData<Subtask[]>(
          QUERY_KEYS.subtasks(taskId),
          previousSubtasks.filter((st) => st.id !== id)
        );
      }
      return { previousSubtasks, taskId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSubtasks) {
        qc.setQueryData(QUERY_KEYS.subtasks(context.taskId), context.previousSubtasks);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      qc.invalidateQueries({ queryKey: ['taskCounts'] });
    },
  });
}

// ----------------------------------------------------
// SOCKET.IO REAL-TIME INVALIDATION HOOK
// ----------------------------------------------------
export function useMobileSocketSync() {
  const qc = useQueryClient();
  const baseUrl = getApiBaseUrl();

  useEffect(() => {
    const socket = io(baseUrl || 'http://localhost:5005', {
      transports: ['websocket', 'polling'],
    });

    const handleTaskChange = () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      qc.invalidateQueries({ queryKey: ['taskCounts'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
    };

    const handleListChange = () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    };

    const handleUserChange = () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    };

    const handleSubtaskChange = (data: any) => {
      if (data?.taskId) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.subtasks(data.taskId) });
      }
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    };

    socket.on('task_created', handleTaskChange);
    socket.on('task_updated', handleTaskChange);
    socket.on('task_deleted', handleTaskChange);

    socket.on('list_created', handleListChange);
    socket.on('list_updated', handleListChange);
    socket.on('list_deleted', handleListChange);
    socket.on('list_shared', handleListChange);

    socket.on('users_updated', handleUserChange);

    socket.on('subtask_created', handleSubtaskChange);
    socket.on('subtask_updated', handleSubtaskChange);
    socket.on('subtask_deleted', handleSubtaskChange);
    socket.on('subtasks_bulk_updated', handleSubtaskChange);

    return () => {
      socket.disconnect();
    };
  }, [qc, baseUrl]);
}
