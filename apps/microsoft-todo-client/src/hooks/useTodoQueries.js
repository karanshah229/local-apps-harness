import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { QUERY_KEYS } from '@shared/todo';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// ----------------------------------------------------
// USERS QUERIES & MUTATIONS
// ----------------------------------------------------
export function useUsersQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });
}

export function useAddUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userData) => {
      const res = await fetch('/api/users', {
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
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`/api/users/${id}`, {
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
  return useMutation({
    mutationFn: async (userId) => {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
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
  return useMutation({
    mutationFn: async (contacts) => {
      const res = await fetch('/api/users/batch', {
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
// LISTS QUERIES & MUTATIONS
// ----------------------------------------------------
export function useListsQuery(userId) {
  return useQuery({
    queryKey: [...QUERY_KEYS.lists, userId || 'default'],
    queryFn: async () => {
      const url = userId ? `/api/lists?userId=${userId}` : '/api/lists';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch lists');
      return res.json();
    },
  });
}

export function useCreateListMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listData) => {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listData),
      });
      if (!res.ok) throw new Error('Failed to create list');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
    },
  });
}

export function useUpdateListMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`/api/lists/${id}`, {
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
  return useMutation({
    mutationFn: async (listId) => {
      const res = await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
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
  return useMutation({
    mutationFn: async ({ listId, userIds, userId }) => {
      const res = await fetch(`/api/lists/${listId}/share`, {
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
export function useTasksQuery({ listId, view, userId }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.tasks, { listId, view, userId }],
    queryFn: async () => {
      let url = '/api/tasks?';
      if (listId) {
        url += `listId=${listId}`;
      } else if (view) {
        url += `view=${view}&userId=${userId || 1}`;
      } else {
        url += `view=all-tasks&userId=${userId || 1}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
  });
}

export function useTaskQuery(taskId) {
  return useQuery({
    queryKey: taskId ? ['task', taskId] : ['task', 'none'],
    queryFn: async () => {
      if (!taskId || taskId <= 0) throw new Error('Invalid task ID');
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error('Failed to fetch task');
      return res.json();
    },
    enabled: Boolean(taskId && taskId > 0),
  });
}

export function useTaskCountsQuery(userId) {
  return useQuery({
    queryKey: ['taskCounts', userId || 1],
    queryFn: async () => {
      const views = ['all-tasks', 'important', 'assigned-to-me'];
      const counts = {};
      await Promise.all(
        views.map(async (v) => {
          const res = await fetch(`/api/tasks?view=${v}&userId=${userId || 1}`);
          if (res.ok) {
            const data = await res.json();
            counts[v] = data.filter((t) => !t.is_completed).length;
          }
        })
      );
      return counts;
    },
  });
}

export async function prefetchTaskDetails(taskId) {
  if (!taskId || taskId <= 0) return;
  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['task', taskId],
        queryFn: async () => {
          const res = await fetch(`/api/tasks/${taskId}`);
          if (!res.ok) throw new Error('Failed to fetch task');
          return res.json();
        },
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.subtasks(taskId),
        queryFn: async () => {
          const res = await fetch(`/api/tasks/${taskId}/subtasks`);
          if (!res.ok) throw new Error('Failed to fetch subtasks');
          return res.json();
        },
        staleTime: 1000 * 60 * 5,
      }),
    ]);
  } catch (_e) {
    // Ignore background prefetch errors
  }
}

export async function prefetchAllTasksInView(tasks) {
  if (!tasks || tasks.length === 0) return;
  const promises = tasks.map((t) => prefetchTaskDetails(t.id));
  await Promise.allSettled(promises);
}

export function useCreateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskData) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!res.ok) throw new Error('Failed to create task');
      const newTask = await res.json();

      if (taskData.draft_subtasks && Array.isArray(taskData.draft_subtasks) && newTask?.id) {
        for (const stepTitle of taskData.draft_subtasks) {
          if (stepTitle && stepTitle.trim()) {
            await fetch(`/api/tasks/${newTask.id}/subtasks`, {
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
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: (updatedTask) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      qc.invalidateQueries({ queryKey: ['taskCounts'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.lists });
      if (updatedTask?.id) {
        qc.invalidateQueries({ queryKey: ['task', updatedTask.id] });
        qc.invalidateQueries({ queryKey: QUERY_KEYS.subtasks(updatedTask.id) });
      }
    },
  });
}

export function useDeleteTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId) => {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
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
// USER PREFERENCES QUERIES & MUTATIONS
// ----------------------------------------------------
export function useUserPreferencesQuery(userId = 1) {
  return useQuery({
    queryKey: ['userPreferences', userId],
    queryFn: async () => {
      const res = await fetch(`/api/user-preferences?userId=${userId}`);
      if (!res.ok) return null;
      return res.json();
    },
  });
}

export function useUpdateUserPreferencesMutation(userId = 1) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefsData) => {
      const res = await fetch(`/api/user-preferences?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...prefsData }),
      });
      if (!res.ok) throw new Error('Failed to update user preferences');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userPreferences', userId] });
    },
  });
}

// ----------------------------------------------------
// SUBTASKS QUERIES & MUTATIONS
// ----------------------------------------------------
export function useSubtasksQuery(taskId) {
  return useQuery({
    queryKey: QUERY_KEYS.subtasks(taskId),
    queryFn: async () => {
      if (!taskId || taskId <= 0) return [];
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      if (!res.ok) throw new Error('Failed to fetch subtasks');
      return res.json();
    },
    enabled: Boolean(taskId && taskId > 0),
  });
}

export function useAddSubtaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, title }) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to add step');
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.subtasks(vars.taskId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
}

export function useUpdateSubtaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId, ...data }) => {
      const res = await fetch(`/api/subtasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update step');
      return res.json();
    },
    onSuccess: (_, vars) => {
      if (vars.taskId) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.subtasks(vars.taskId) });
      }
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
}

export function useDeleteSubtaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }) => {
      const res = await fetch(`/api/subtasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete step');
      return res.json();
    },
    onSuccess: (_, vars) => {
      if (vars.taskId) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.subtasks(vars.taskId) });
      }
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
}

// ----------------------------------------------------
// SOCKET.IO REAL-TIME INVALIDATION HOOK
// ----------------------------------------------------
export function useSocketSync() {
  const qc = useQueryClient();

  useEffect(() => {
    let socketPath = '/socket.io';
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/todo')) {
      socketPath = '/todo/socket.io';
    }

    const socket = io('/', {
      path: socketPath,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
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

    const handleSubtaskChange = (data) => {
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
  }, [qc]);
}
