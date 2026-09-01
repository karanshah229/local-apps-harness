import { useSyncExternalStore, useCallback, useMemo } from 'react';
import {
  Task,
  List,
  User,
  Subtask,
  BatchImportContact,
  UserPreferences,
  CustomView,
} from '@shared/todo';
import { localTodoDb } from '../db/sqlite';

// Event emitter pattern for instant local DB reactive updates
type DbEvent = 'tasks' | 'lists' | 'users' | 'subtasks' | 'preferences' | 'views';
const listeners = new Set<() => void>();

let globalDbVersion = 1;

function notifyDbChange(_event?: DbEvent) {
  globalDbVersion++;
  for (const listener of listeners) {
    try {
      listener();
    } catch (e) {
      console.warn('Listener notification error:', e);
    }
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

const EMPTY_TASKS: Task[] = Object.freeze([]) as any;
const EMPTY_SUBTASKS: Subtask[] = Object.freeze([]) as any;
const EMPTY_COUNTS: Record<string, number> = Object.freeze({}) as any;
const EMPTY_LISTS: List[] = Object.freeze([]) as any;
const EMPTY_USERS: User[] = Object.freeze([]) as any;
const EMPTY_CUSTOM_VIEWS: CustomView[] = Object.freeze([]) as any;

// ----------------------------------------------------
// IN-MEMORY SNAPSHOT CACHES FOR ZERO-LAG JSI RETRIEVAL
// ----------------------------------------------------
const tasksSnapshotCache = new Map<string, { version: number; data: Task[] }>();
const taskByIdSnapshotCache = new Map<number, { version: number; data: Task | null }>();
const subtasksSnapshotCache = new Map<number, { version: number; data: Subtask[] }>();
let countsSnapshot: { version: number; data: Record<string, number> } | null = null;
let listsSnapshot: { version: number; data: List[] } | null = null;
let usersSnapshot: { version: number; data: User[] } | null = null;
let customViewsSnapshot: { version: number; data: CustomView[] } | null = null;
const customViewByIdSnapshotCache = new Map<number, { version: number; data: CustomView | null }>();
let prefsSnapshot: { version: number; data: UserPreferences } | null = null;

// ----------------------------------------------------
// TASKS HOOKS
// ----------------------------------------------------
export function useTasksQuery({
  listId,
  view,
}: {
  listId?: number | null;
  view?: string | null;
  userId?: number;
} = {}) {
  const cacheKey = `${listId ?? 'all'}-${view ?? 'all'}`;

  const getSnapshot = useCallback(() => {
    const cached = tasksSnapshotCache.get(cacheKey);
    if (cached && cached.version === globalDbVersion) {
      return cached.data;
    }
    const fresh = localTodoDb.getTasks({ listId, view });
    tasksSnapshotCache.set(cacheKey, { version: globalDbVersion, data: fresh });
    return fresh;
  }, [cacheKey, listId, view]);

  const tasks = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refetch = useCallback(async () => {
    const fresh = localTodoDb.getTasks({ listId, view });
    tasksSnapshotCache.set(cacheKey, { version: globalDbVersion, data: fresh });
    return { data: fresh };
  }, [cacheKey, listId, view]);

  return {
    data: tasks,
    isLoading: false,
    refetch,
  };
}

export function useTaskQuery(taskId: number | null) {
  const getSnapshot = useCallback(() => {
    if (!taskId || taskId <= 0) return null;
    const cached = taskByIdSnapshotCache.get(taskId);
    if (cached && cached.version === globalDbVersion) {
      return cached.data;
    }
    const fresh = localTodoDb.getTaskById(taskId);
    taskByIdSnapshotCache.set(taskId, { version: globalDbVersion, data: fresh });
    return fresh;
  }, [taskId]);

  const task = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refetch = useCallback(async () => {
    if (!taskId || taskId <= 0) return { data: null };
    const fresh = localTodoDb.getTaskById(taskId);
    taskByIdSnapshotCache.set(taskId, { version: globalDbVersion, data: fresh });
    return { data: fresh };
  }, [taskId]);

  return {
    data: task,
    isLoading: false,
    refetch,
  };
}

export function useTaskCountsQuery(_userId?: number) {
  const getSnapshot = useCallback(() => {
    if (countsSnapshot && countsSnapshot.version === globalDbVersion) {
      return countsSnapshot.data;
    }
    const fresh = localTodoDb.getTaskCounts();
    countsSnapshot = { version: globalDbVersion, data: fresh };
    return fresh;
  }, []);

  const counts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refetch = useCallback(async () => {
    const fresh = localTodoDb.getTaskCounts();
    countsSnapshot = { version: globalDbVersion, data: fresh };
    return { data: fresh };
  }, []);

  return {
    data: counts,
    isLoading: false,
    refetch,
  };
}

export function useCreateTaskMutation() {
  const mutate = useCallback((taskData: any) => {
    const newTask = localTodoDb.createTask(taskData);
    notifyDbChange('tasks');
    return newTask;
  }, []);

  const mutateAsync = useCallback(async (taskData: any) => {
    return mutate(taskData);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useUpdateTaskMutation() {
  const mutate = useCallback(({ id, ...data }: Partial<Task> & { id: number }) => {
    const updated = localTodoDb.updateTask(id, data);
    notifyDbChange('tasks');
    return updated;
  }, []);

  const mutateAsync = useCallback(async (params: Partial<Task> & { id: number }) => {
    return mutate(params);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useDeleteTaskMutation() {
  const mutate = useCallback((taskId: number) => {
    localTodoDb.deleteTask(taskId);
    notifyDbChange('tasks');
  }, []);

  const mutateAsync = useCallback(async (taskId: number) => {
    mutate(taskId);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

// ----------------------------------------------------
// SUBTASKS (STEPS) HOOKS
// ----------------------------------------------------
export function useSubtasksQuery(taskId: number | null) {
  const getSnapshot = useCallback(() => {
    if (!taskId || taskId <= 0) return EMPTY_SUBTASKS;
    const cached = subtasksSnapshotCache.get(taskId);
    if (cached && cached.version === globalDbVersion) {
      return cached.data;
    }
    const fresh = localTodoDb.getSubtasks(taskId);
    subtasksSnapshotCache.set(taskId, { version: globalDbVersion, data: fresh });
    return fresh;
  }, [taskId]);

  const subtasks = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refetch = useCallback(async () => {
    if (!taskId || taskId <= 0) return { data: EMPTY_SUBTASKS };
    const fresh = localTodoDb.getSubtasks(taskId);
    subtasksSnapshotCache.set(taskId, { version: globalDbVersion, data: fresh });
    return { data: fresh };
  }, [taskId]);

  return {
    data: subtasks,
    isLoading: false,
    refetch,
  };
}

export function useAddSubtaskMutation() {
  const mutate = useCallback(({ taskId, title }: { taskId: number; title: string }) => {
    const newStep = localTodoDb.createSubtask(taskId, title);
    notifyDbChange('subtasks');
    notifyDbChange('tasks');
    return newStep;
  }, []);

  const mutateAsync = useCallback(async (params: { taskId: number; title: string }) => {
    return mutate(params);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useUpdateSubtaskMutation() {
  const mutate = useCallback(({ id, taskId, ...data }: Partial<Subtask> & { id: number; taskId: number }) => {
    const updated = localTodoDb.updateSubtask(id, taskId, data);
    notifyDbChange('subtasks');
    notifyDbChange('tasks');
    return updated;
  }, []);

  const mutateAsync = useCallback(async (params: Partial<Subtask> & { id: number; taskId: number }) => {
    return mutate(params);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useDeleteSubtaskMutation() {
  const mutate = useCallback(({ id }: { id: number; taskId: number }) => {
    localTodoDb.deleteSubtask(id);
    notifyDbChange('subtasks');
    notifyDbChange('tasks');
  }, []);

  const mutateAsync = useCallback(async (params: { id: number; taskId: number }) => {
    mutate(params);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

// ----------------------------------------------------
// LISTS HOOKS
// ----------------------------------------------------
export function useListsQuery(_userId?: number) {
  const getSnapshot = useCallback(() => {
    if (listsSnapshot && listsSnapshot.version === globalDbVersion) {
      return listsSnapshot.data;
    }
    const fresh = localTodoDb.getLists();
    listsSnapshot = { version: globalDbVersion, data: fresh };
    return fresh;
  }, []);

  const lists = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refetch = useCallback(async () => {
    const fresh = localTodoDb.getLists();
    listsSnapshot = { version: globalDbVersion, data: fresh };
    return { data: fresh };
  }, []);

  return {
    data: lists,
    isLoading: false,
    refetch,
  };
}

export function useCreateListMutation() {
  const mutate = useCallback((listData: { title: string; color_theme?: string; icon?: string; created_by?: number }) => {
    const newList = localTodoDb.createList(listData);
    notifyDbChange('lists');
    return newList;
  }, []);

  const mutateAsync = useCallback(async (listData: any) => {
    return mutate(listData);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useUpdateListMutation() {
  const mutate = useCallback(({ id, ...data }: Partial<List> & { id: number }) => {
    const updated = localTodoDb.updateList(id, data);
    notifyDbChange('lists');
    return updated;
  }, []);

  const mutateAsync = useCallback(async (params: Partial<List> & { id: number }) => {
    return mutate(params);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useDeleteListMutation() {
  const mutate = useCallback((listId: number) => {
    localTodoDb.deleteList(listId);
    notifyDbChange('lists');
  }, []);

  const mutateAsync = useCallback(async (listId: number) => {
    mutate(listId);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useShareListMutation() {
  const mutate = useCallback((_data: any) => {
    notifyDbChange('lists');
  }, []);

  const mutateAsync = useCallback(async (data: any) => {
    mutate(data);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

// ----------------------------------------------------
// USERS / CONTACTS HOOKS
// ----------------------------------------------------
export function useUsersQuery() {
  const getSnapshot = useCallback(() => {
    if (usersSnapshot && usersSnapshot.version === globalDbVersion) {
      return usersSnapshot.data;
    }
    const fresh = localTodoDb.getUsers();
    usersSnapshot = { version: globalDbVersion, data: fresh };
    return fresh;
  }, []);

  const users = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refetch = useCallback(async () => {
    const fresh = localTodoDb.getUsers();
    usersSnapshot = { version: globalDbVersion, data: fresh };
    return { data: fresh };
  }, []);

  return {
    data: users,
    isLoading: false,
    refetch,
  };
}

export function useAddUserMutation() {
  const mutate = useCallback((userData: Partial<User>) => {
    const newUser = localTodoDb.createUser({
      name: userData.name || 'Contact',
      email: userData.email,
      phone: userData.phone || '',
      avatar: userData.avatar || undefined,
      is_group: userData.is_group,
    });
    notifyDbChange('users');
    return newUser;
  }, []);

  const mutateAsync = useCallback(async (userData: Partial<User>) => {
    return mutate(userData);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useUpdateUserMutation() {
  const mutate = useCallback(({ id, ...data }: Partial<User> & { id: number }) => {
    const updated = localTodoDb.updateUser(id, data);
    notifyDbChange('users');
    return updated;
  }, []);

  const mutateAsync = useCallback(async (params: Partial<User> & { id: number }) => {
    return mutate(params);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useDeleteUserMutation() {
  const mutate = useCallback((userId: number) => {
    localTodoDb.deleteUser(userId);
    notifyDbChange('users');
  }, []);

  const mutateAsync = useCallback(async (userId: number) => {
    mutate(userId);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useBatchImportUsersMutation() {
  const mutate = useCallback((contacts: BatchImportContact[]) => {
    const res = localTodoDb.batchImportUsers(contacts);
    notifyDbChange('users');
    return res;
  }, []);

  const mutateAsync = useCallback(async (contacts: BatchImportContact[]) => {
    return mutate(contacts);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

// ----------------------------------------------------
// USER PREFERENCES HOOKS
// ----------------------------------------------------
export function useUserPreferencesQuery(_userId: number = 1) {
  const getSnapshot = useCallback(() => {
    if (prefsSnapshot && prefsSnapshot.version === globalDbVersion) {
      return prefsSnapshot.data;
    }
    const fresh = localTodoDb.getUserPreferences();
    prefsSnapshot = { version: globalDbVersion, data: fresh };
    return fresh;
  }, []);

  const preferences = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refetch = useCallback(async () => {
    const fresh = localTodoDb.getUserPreferences();
    prefsSnapshot = { version: globalDbVersion, data: fresh };
    return { data: fresh };
  }, []);

  return {
    data: preferences,
    isSuccess: true,
    isError: false,
    isLoading: false,
    refetch,
  };
}

export function useUpdateUserPreferencesMutation() {
  const mutate = useCallback((prefs: Partial<UserPreferences>) => {
    const updated = localTodoDb.updateUserPreferences(prefs);
    notifyDbChange('preferences');
    return updated;
  }, []);

  const mutateAsync = useCallback(async (prefs: Partial<UserPreferences>) => {
    return mutate(prefs);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function usePinnedViewsQuery() {
  const { data: prefs } = useUserPreferencesQuery(1);
  const pinnedViews: string[] = useMemo(() => {
    if (Array.isArray(prefs?.pinned_views)) return prefs.pinned_views;
    if (typeof prefs?.pinned_views === 'string') {
      try {
        const parsed = JSON.parse(prefs.pinned_views);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return ['important', 'assigned-to-me'];
  }, [prefs?.pinned_views]);

  return {
    data: pinnedViews,
    isSuccess: true,
    isLoading: false,
  };
}

export function useTogglePinViewMutation() {
  const mutate = useCallback((viewKey: string) => {
    const updated = localTodoDb.togglePinView(viewKey);
    notifyDbChange('preferences');
    return updated;
  }, []);

  const mutateAsync = useCallback(async (viewKey: string) => {
    return mutate(viewKey);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function usePinViewMutation() {
  const mutate = useCallback((viewKey: string) => {
    const updated = localTodoDb.pinView(viewKey);
    notifyDbChange('preferences');
    return updated;
  }, []);

  const mutateAsync = useCallback(async (viewKey: string) => {
    return mutate(viewKey);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useUnpinViewMutation() {
  const mutate = useCallback((viewKey: string) => {
    const updated = localTodoDb.unpinView(viewKey);
    notifyDbChange('preferences');
    return updated;
  }, []);

  const mutateAsync = useCallback(async (viewKey: string) => {
    return mutate(viewKey);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

// ----------------------------------------------------
// CUSTOM VIEWS HOOKS
// ----------------------------------------------------
export function useCustomViewsQuery() {
  const getSnapshot = useCallback(() => {
    if (customViewsSnapshot && customViewsSnapshot.version === globalDbVersion) {
      return customViewsSnapshot.data;
    }
    const fresh = localTodoDb.getCustomViews();
    customViewsSnapshot = { version: globalDbVersion, data: fresh };
    return fresh;
  }, []);

  const views = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refetch = useCallback(async () => {
    const fresh = localTodoDb.getCustomViews();
    customViewsSnapshot = { version: globalDbVersion, data: fresh };
    return { data: fresh };
  }, []);

  return {
    data: views,
    isLoading: false,
    refetch,
  };
}

export function useCustomViewQuery(viewId?: number | null) {
  const getSnapshot = useCallback(() => {
    if (!viewId || viewId <= 0) return null;
    const cached = customViewByIdSnapshotCache.get(viewId);
    if (cached && cached.version === globalDbVersion) {
      return cached.data;
    }
    const fresh = localTodoDb.getCustomViewById(viewId);
    customViewByIdSnapshotCache.set(viewId, { version: globalDbVersion, data: fresh });
    return fresh;
  }, [viewId]);

  const view = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refetch = useCallback(async () => {
    if (!viewId || viewId <= 0) return { data: null };
    const fresh = localTodoDb.getCustomViewById(viewId);
    customViewByIdSnapshotCache.set(viewId, { version: globalDbVersion, data: fresh });
    return { data: fresh };
  }, [viewId]);

  return {
    data: view,
    isLoading: false,
    refetch,
  };
}

export function useCreateCustomViewMutation() {
  const mutate = useCallback((data: {
    title: string;
    color_theme?: string;
    icon?: string;
    filter_config?: any;
    sort_config?: any;
  }) => {
    const newView = localTodoDb.createCustomView(data);
    notifyDbChange('views');
    return newView;
  }, []);

  const mutateAsync = useCallback(async (data: any) => {
    return mutate(data);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useUpdateCustomViewMutation() {
  const mutate = useCallback(({ id, ...data }: Partial<CustomView> & { id: number }) => {
    const updated = localTodoDb.updateCustomView(id, data);
    notifyDbChange('views');
    return updated;
  }, []);

  const mutateAsync = useCallback(async (params: Partial<CustomView> & { id: number }) => {
    return mutate(params);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

export function useDeleteCustomViewMutation() {
  const mutate = useCallback((viewId: number) => {
    localTodoDb.deleteCustomView(viewId);
    notifyDbChange('views');
  }, []);

  const mutateAsync = useCallback(async (viewId: number) => {
    mutate(viewId);
  }, [mutate]);

  return { mutate, mutateAsync, isPending: false };
}

// ----------------------------------------------------
// PREFETCH & NAVIGATION HELPERS (SYNCHRONOUS / NO-OP)
// ----------------------------------------------------
export async function prefetchTaskDetails(_taskId: number): Promise<void> {
  // Synchronous SQLite database requires no remote prefetching
}

export async function prefetchAllTasksInView(_tasks: Task[]): Promise<void> {
  // Synchronous SQLite database requires no remote prefetching
}

export async function fetchTaskForNavigation(taskId: number): Promise<Task> {
  const task = localTodoDb.getTaskById(taskId);
  if (!task) throw new Error('Task not found');
  return task;
}
