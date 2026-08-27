import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import {
  TodoApiClient,
  User,
  List,
  Task,
  Subtask,
  ThemeColor,
  WhatsAppPayloadConfig,
  BatchImportContact
} from '@saileshbhai/todo-shared';
import { getBackendApiUrl } from './src/services/apiConfig';
import HeaderBanner from './src/components/HeaderBanner';
import TaskMainView from './src/components/TaskMainView';
import TaskDetailDrawer from './src/components/TaskDetailDrawer';
import MobileBottomNav from './src/components/MobileBottomNav';
import ListsSheet from './src/components/ListsSheet';
import UserLibraryModal from './src/components/UserLibraryModal';
import ShareListModal from './src/components/ShareListModal';
import WhatsAppShareModal from './src/components/WhatsAppShareModal';
import { lightColors, darkColors } from './src/theme/colors';

function MainTodoApp() {
  const [apiUrl, setApiUrl] = useState(() => getBackendApiUrl());
  const client = useMemo(() => new TodoApiClient(apiUrl), [apiUrl]);

  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const [lists, setLists] = useState<List[]>([]);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<string | null>('all-tasks');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  // Modals state
  const [isListsSheetOpen, setIsListsSheetOpen] = useState(false);
  const [isUserLibraryOpen, setIsUserLibraryOpen] = useState(false);
  const [sharingList, setSharingList] = useState<List | null>(null);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppPayloadConfig | null>(null);

  // Network error state
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Theme
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const colors = isDarkMode ? darkColors : lightColors;

  // 1. Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      const data = await client.getUsers();
      setUsers(data);
      setNetworkError(null);
      if (!activeUser && data.length > 0) {
        setActiveUser(data[0]);
      }
    } catch (err: any) {
      console.warn('Could not fetch users:', err);
      setNetworkError(`Could not connect to server at ${apiUrl}. Make sure the backend is running.`);
    }
  }, [client, activeUser, apiUrl]);

  // 2. Fetch Lists
  const fetchLists = useCallback(async () => {
    if (!activeUser) return;
    try {
      const data = await client.getLists(activeUser.id);
      setLists(data);
      setNetworkError(null);
    } catch (err) {
      console.warn('Could not fetch lists:', err);
    }
  }, [client, activeUser]);

  // 3. Fetch Tasks
  const fetchTasks = useCallback(async () => {
    if (!activeUser) return;
    try {
      const data = await client.getTasks({
        view: activeListId ? undefined : activeView || undefined,
        listId: activeListId || undefined,
        userId: activeUser.id
      });
      setTasks(data);
      setNetworkError(null);
    } catch (err) {
      console.warn('Could not fetch tasks:', err);
    }
  }, [client, activeListId, activeView, activeUser]);

  // 4. Fetch Subtasks
  const fetchSubtasks = useCallback(
    async (taskId: number) => {
      try {
        const data = await client.getSubtasks(taskId);
        setSubtasks(data);
      } catch (err) {
        console.warn('Could not fetch subtasks:', err);
      }
    },
    [client]
  );

  // 5. Fetch Task Counts
  const fetchTaskCounts = useCallback(async () => {
    if (!activeUser) return;
    try {
      const views = ['all-tasks', 'important', 'assigned-to-me'];
      const counts: Record<string, number> = {};
      for (const v of views) {
        const data = await client.getTasks({ view: v, userId: activeUser.id });
        counts[v] = data.filter((t) => !t.is_completed).length;
      }
      setTaskCounts(counts);
    } catch (err) {
      console.warn('Could not fetch task counts:', err);
    }
  }, [client, activeUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (activeUser) {
      fetchLists();
      fetchTasks();
      fetchTaskCounts();
    }
  }, [activeUser, fetchLists, fetchTasks, fetchTaskCounts]);

  useEffect(() => {
    if (selectedTask) {
      fetchSubtasks(selectedTask.id);
    } else {
      setSubtasks([]);
    }
  }, [selectedTask, fetchSubtasks]);

  // Socket.io real-time synchronization
  useEffect(() => {
    const socket = io(apiUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setNetworkError(null);
    });

    socket.on('task_created', () => {
      fetchTasks();
      fetchTaskCounts();
      fetchLists();
    });

    socket.on('task_updated', (updatedTask: Task) => {
      fetchTasks();
      fetchTaskCounts();
      fetchLists();
      setSelectedTask((prev) => (prev && prev.id === updatedTask.id ? updatedTask : prev));
    });

    socket.on('task_deleted', ({ id }: { id: number | string }) => {
      fetchTasks();
      fetchTaskCounts();
      fetchLists();
      setSelectedTask((prev) => (prev && prev.id === Number(id) ? null : prev));
    });

    socket.on('list_created', () => fetchLists());
    socket.on('list_updated', () => fetchLists());
    socket.on('list_deleted', () => fetchLists());
    socket.on('list_shared', () => fetchLists());
    socket.on('users_updated', () => fetchUsers());

    socket.on('reminder_alert', ({ message }: { message: string }) => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(''), 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, [apiUrl, fetchTasks, fetchTaskCounts, fetchLists, fetchUsers]);

  // Handlers
  const handleAddUser = async (userObj: { name: string; email: string; phone: string }) => {
    try {
      const newUser = await client.createUser(userObj);
      setUsers((prev) => [...prev, newUser]);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleUpdateUser = async (userObj: { id: number; name: string; email: string; phone: string }) => {
    try {
      const updated = await client.updateUser(userObj.id, userObj);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (activeUser && activeUser.id === updated.id) setActiveUser(updated);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await client.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (activeUser && activeUser.id === userId) {
        const remaining = users.filter((u) => u.id !== userId);
        if (remaining.length > 0) setActiveUser(remaining[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBatchImportUsers = async (contacts: BatchImportContact[]) => {
    try {
      const res = await client.batchImportUsers(contacts);
      if (res && res.users) {
        setUsers(res.users);
      }
      return res;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleCreateList = async (title: string) => {
    try {
      const newList = await client.createList({
        title,
        created_by: activeUser ? activeUser.id : 1
      });
      setActiveListId(newList.id);
      setActiveView(null);
      fetchLists();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteList = async (listId: number) => {
    try {
      await client.deleteList(listId);
      if (activeListId === listId) {
        setActiveListId(null);
        setActiveView('all-tasks');
      }
      fetchLists();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateListTheme = async (listId: number, color: ThemeColor) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    try {
      await client.updateList(listId, {
        title: list.title,
        color_theme: color,
        icon: list.icon
      });
      fetchLists();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (taskData: {
    title: string;
    is_important?: number;
    list_id?: number | null;
  }) => {
    try {
      await client.createTask({
        ...taskData,
        created_by: activeUser ? activeUser.id : 1
      });
      fetchTasks();
      fetchTaskCounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTask = async (updates: Partial<Task> & { id: number }) => {
    try {
      const updated = await client.updateTask(updates.id, updates);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTask && selectedTask.id === updated.id) setSelectedTask(updated);
      fetchTaskCounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaskComplete = (task: Task) => {
    handleUpdateTask({
      id: task.id,
      is_completed: task.is_completed ? 0 : 1
    });
  };

  const handleToggleTaskImportant = (task: Task) => {
    handleUpdateTask({
      id: task.id,
      is_important: task.is_important ? 0 : 1
    });
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await client.deleteTask(taskId);
      setSelectedTask(null);
      fetchTasks();
      fetchTaskCounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubtask = async (taskId: number, title: string) => {
    try {
      const newStep = await client.createSubtask(taskId, title);
      setSubtasks((prev) => [...prev, newStep]);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    try {
      const newStatus = subtask.is_completed ? 0 : 1;
      const updated = await client.updateSubtask(subtask.id, { is_completed: newStatus });
      setSubtasks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      await client.deleteSubtask(subtaskId);
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareList = async (listId: number, userId: number) => {
    try {
      await client.shareList(listId, userId);
      fetchLists();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveShare = async (listId: number, userId: number) => {
    try {
      await client.removeListShare(listId, userId);
      fetchLists();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSelectTaskForBatch = (taskId: number) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Network Alert Banner */}
      {Boolean(networkError) && (
        <View style={styles.networkErrorBanner}>
          <Text style={styles.networkErrorText} numberOfLines={2}>
            ⚠️ {networkError}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setApiUrl(getBackendApiUrl());
              fetchUsers();
            }}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* If task is selected, show TaskDetailDrawer full screen; else show Main View */}
      {selectedTask ? (
        <TaskDetailDrawer
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onOpenWhatsAppModal={(config) => setWhatsappConfig(config)}
          subtasks={subtasks}
          onCreateSubtask={handleCreateSubtask}
          onToggleSubtask={handleToggleSubtask}
          onDeleteSubtask={handleDeleteSubtask}
          isDarkMode={isDarkMode}
        />
      ) : (
        <>
          {/* Header Banner */}
          <HeaderBanner
            activeView={activeView}
            activeList={activeList}
            isMultiSelectMode={isMultiSelectMode}
            onToggleMultiSelect={() => {
              setIsMultiSelectMode(!isMultiSelectMode);
              setSelectedTaskIds([]);
            }}
            onOpenShareModal={(list) => setSharingList(list)}
            onOpenWhatsAppModal={(config) => setWhatsappConfig(config)}
            onUpdateListTheme={handleUpdateListTheme}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          />

          {/* Main Task List */}
          <TaskMainView
            activeView={activeView}
            activeList={activeList}
            tasks={tasks}
            selectedTaskId={selectedTask?.id}
            onSelectTask={(task) => setSelectedTask(task)}
            onCreateTask={handleCreateTask}
            onToggleTaskComplete={handleToggleTaskComplete}
            onToggleTaskImportant={handleToggleTaskImportant}
            onOpenWhatsAppModal={(config) => setWhatsappConfig(config)}
            isMultiSelectMode={isMultiSelectMode}
            selectedTaskIds={selectedTaskIds}
            onToggleSelectTaskForBatch={handleToggleSelectTaskForBatch}
            isDarkMode={isDarkMode}
          />

          {/* Mobile Bottom Navigation Bar */}
          <MobileBottomNav
            activeView={activeView}
            setActiveView={setActiveView}
            activeListId={activeListId}
            setActiveListId={setActiveListId}
            taskCounts={taskCounts}
            onOpenListsSheet={() => setIsListsSheetOpen(true)}
            onOpenUserLibrary={() => setIsUserLibraryOpen(true)}
            activeUser={activeUser}
            lists={lists}
            isDarkMode={isDarkMode}
          />
        </>
      )}

      {/* Lists Bottom Sheet */}
      <ListsSheet
        isOpen={isListsSheetOpen}
        onClose={() => setIsListsSheetOpen(false)}
        lists={lists}
        activeListId={activeListId}
        setActiveListId={setActiveListId}
        activeView={activeView}
        setActiveView={setActiveView}
        onCreateList={handleCreateList}
        onDeleteList={handleDeleteList}
        taskCounts={taskCounts}
        isDarkMode={isDarkMode}
      />

      {/* User Library & Contacts Sheet */}
      <UserLibraryModal
        isOpen={isUserLibraryOpen}
        onClose={() => setIsUserLibraryOpen(false)}
        users={users}
        activeUser={activeUser}
        setActiveUser={setActiveUser}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onBatchImportUsers={handleBatchImportUsers}
        isDarkMode={isDarkMode}
      />

      {/* Share List Modal */}
      <ShareListModal
        isOpen={Boolean(sharingList)}
        onClose={() => setSharingList(null)}
        list={sharingList}
        users={users}
        onShareList={handleShareList}
        onRemoveShare={handleRemoveShare}
        isDarkMode={isDarkMode}
      />

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={Boolean(whatsappConfig)}
        onClose={() => setWhatsappConfig(null)}
        config={whatsappConfig}
        users={users}
        onGeneratePayload={(config) => client.generateWhatsAppPayload(config)}
        isDarkMode={isDarkMode}
      />

      {/* Toast Alert */}
      {Boolean(toastMessage) && (
        <SafeAreaView style={styles.toastSafeArea}>
          <View style={styles.toastCard}>
            <Text style={styles.toastEmoji}>📲</Text>
            <Text style={styles.toastText} numberOfLines={2}>
              {toastMessage}
            </Text>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainTodoApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  networkErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8
  },
  networkErrorText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    flex: 1
  },
  retryBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '800'
  },
  toastSafeArea: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'none'
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#18181b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  toastEmoji: {
    fontSize: 16
  },
  toastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  }
});
