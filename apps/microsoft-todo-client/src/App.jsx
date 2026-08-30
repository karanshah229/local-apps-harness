import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useUiStore } from './store/useUiStore.js';
import {
  useUsersQuery,
  useListsQuery,
  useTasksQuery,
  useTaskCountsQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useCreateListMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useShareListMutation,
  useAddUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useBatchImportUsersMutation,
  useSocketSync,
} from './hooks/useTodoQueries.js';

import Sidebar from './components/Sidebar.jsx';
import TaskMainView from './components/TaskMainView.jsx';
import TaskDetailDrawer from './components/TaskDetailDrawer.jsx';
import ContactsPage from './components/ContactsPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import ShareListModal from './components/ShareListModal.jsx';
import WhatsAppShareModal from './components/WhatsAppShareModal.jsx';
import ListsSheet from './components/ListsSheet.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';

export default function App() {
  // Initialize Real-Time Socket.IO Synchronization with TanStack Query
  useSocketSync();

  const navigate = useNavigate();
  const location = useLocation();

  // Zustand Store States & Actions
  const {
    themeMode,
    isDarkMode,
    setThemeMode,
    isSidebarCollapsed,
    toggleSidebar,
    activeView,
    setActiveView,
    activeListId,
    setActiveListId,
    selectedTaskId,
    setSelectedTaskId,
    activeUser,
    setActiveUser,
    sharingList,
    setSharingList,
    whatsappConfig,
    setWhatsappConfig,
    isListsSheetOpen,
    setIsListsSheetOpen,
  } = useUiStore();

  // Sync theme to DOM on mount and changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sync URL route with active view
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/contacts')) {
      setActiveView('contacts');
    } else if (path.includes('/settings')) {
      setActiveView('settings');
    } else if (path.includes('/lists')) {
      setActiveView(null);
    } else {
      if (activeView === 'contacts' || activeView === 'settings') {
        setActiveView('all-tasks');
      }
    }
  }, [location.pathname]);

  // ----------------------------------------------------
  // SERVER DATA QUERIES
  // ----------------------------------------------------
  const { data: users = [] } = useUsersQuery();

  // Set default active user once loaded
  useEffect(() => {
    if (!activeUser && users.length > 0) {
      setActiveUser(users[0]);
    }
  }, [users, activeUser, setActiveUser]);

  const { data: lists = [] } = useListsQuery(activeUser?.id);
  const { data: tasks = [] } = useTasksQuery({
    listId: activeListId,
    view: activeView,
    userId: activeUser?.id,
  });
  const { data: taskCounts = {} } = useTaskCountsQuery(activeUser?.id);

  // ----------------------------------------------------
  // MUTATIONS
  // ----------------------------------------------------
  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();

  const createListMutation = useCreateListMutation();
  const updateListMutation = useUpdateListMutation();
  const deleteListMutation = useDeleteListMutation();
  const shareListMutation = useShareListMutation();

  const addUserMutation = useAddUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const batchImportUsersMutation = useBatchImportUsersMutation();

  // Derived state
  const activeList = lists.find((l) => l.id === activeListId);
  const selectedTask = selectedTaskId
    ? selectedTaskId < 0
      ? { id: selectedTaskId, title: '', notes: '', list_id: activeListId }
      : tasks.find((t) => t.id === selectedTaskId) || null
    : null;

  // Handlers
  const handleSelectTask = (task) => {
    setSelectedTaskId(task ? task.id : null);
  };

  const handleCreateTask = async (taskData) => {
    return createTaskMutation.mutateAsync({
      ...taskData,
      created_by: activeUser ? activeUser.id : 2,
    });
  };

  const handleUpdateTask = (taskUpdate) => {
    updateTaskMutation.mutate(taskUpdate);
  };

  const handleDeleteTask = (taskId) => {
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    deleteTaskMutation.mutate(taskId);
  };

  const handleToggleTaskComplete = (task) => {
    updateTaskMutation.mutate({
      id: task.id,
      is_completed: task.is_completed ? 0 : 1,
    });
  };

  const handleToggleTaskImportant = (task) => {
    updateTaskMutation.mutate({
      id: task.id,
      is_important: task.is_important ? 0 : 1,
    });
  };

  const handleCreateList = async (title) => {
    try {
      const newList = await createListMutation.mutateAsync({
        title,
        color_theme: 'blue',
        icon: 'list',
        created_by: activeUser ? activeUser.id : 2,
      });
      if (newList?.id) {
        setActiveListId(newList.id);
        setActiveView(null);
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleDeleteList = async (id) => {
    if (activeListId === id) {
      setActiveListId(null);
      setActiveView('all-tasks');
    }
    await deleteListMutation.mutateAsync(id);
    return true;
  };

  const handleUpdateListTheme = (listId, themeColor) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    updateListMutation.mutate({
      id: listId,
      title: list.title,
      color_theme: themeColor,
      icon: list.icon,
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary antialiased font-sans">
      {/* Desktop / Tablet Left Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          if (v === 'contacts') navigate('/contacts');
          else if (v === 'settings') navigate('/settings');
          else navigate('/tasks');
        }}
        activeListId={activeListId}
        setActiveListId={(id) => {
          setActiveListId(id);
          navigate('/tasks');
        }}
        lists={lists}
        activeUser={activeUser}
        users={users}
        onSelectUser={setActiveUser}
        onCreateList={handleCreateList}
        onDeleteList={handleDeleteList}
        taskCounts={taskCounts}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-background">
        <Routes>
          <Route
            path="/contacts"
            element={
              <ContactsPage
                onBack={() => {
                  setActiveView('all-tasks');
                  navigate('/tasks');
                }}
                users={users}
                activeUser={activeUser}
                setActiveUser={setActiveUser}
                onAddUser={(data) => addUserMutation.mutateAsync(data)}
                onUpdateUser={(data) => updateUserMutation.mutateAsync(data)}
                onDeleteUser={(id) => deleteUserMutation.mutateAsync(id)}
                onBatchImportUsers={(contacts) => batchImportUsersMutation.mutateAsync(contacts)}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                onBack={() => {
                  setActiveView('all-tasks');
                  navigate('/tasks');
                }}
                isDarkMode={isDarkMode}
                themeMode={themeMode}
                onSetThemeMode={setThemeMode}
              />
            }
          />
          <Route
            path="*"
            element={
              <TaskMainView
                activeView={activeView}
                activeList={activeList}
                tasks={tasks}
                selectedTaskId={selectedTask?.id}
                onSelectTask={handleSelectTask}
                onCreateTask={handleCreateTask}
                onToggleTaskComplete={handleToggleTaskComplete}
                onToggleTaskImportant={handleToggleTaskImportant}
                onOpenShareModal={(list) => setSharingList(list)}
                onOpenWhatsAppModal={(config) => setWhatsappConfig(config)}
                onUpdateListTheme={handleUpdateListTheme}
                isDarkMode={isDarkMode}
                onOpenSettings={() => {
                  setActiveView('settings');
                  navigate('/settings');
                }}
              />
            }
          />
        </Routes>
      </div>

      {/* Task Details Drawer (Fullscreen on mobile, split-pane on desktop) */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          users={users}
          lists={lists}
          onClose={() => setSelectedTaskId(null)}
          onUpdateTask={handleUpdateTask}
          onCreateTask={handleCreateTask}
          onDeleteTask={handleDeleteTask}
          onOpenWhatsAppModal={(config) => setWhatsappConfig(config)}
        />
      )}

      {/* Mobile Bottom Navigation Bar (Hidden on desktop) */}
      <MobileBottomNav
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          if (v === 'contacts') navigate('/contacts');
          else if (v === 'settings') navigate('/settings');
          else navigate('/tasks');
        }}
        activeListId={activeListId}
        setActiveListId={(id) => {
          setActiveListId(id);
          navigate('/tasks');
        }}
        taskCounts={taskCounts}
        onOpenListsSheet={() => setIsListsSheetOpen(true)}
        onOpenUserLibrary={() => {
          setActiveView('contacts');
          navigate('/contacts');
        }}
        activeUser={activeUser}
        lists={lists}
      />

      {/* Global Modals & Sheets */}
      {sharingList && (
        <ShareListModal
          list={sharingList}
          users={users}
          currentUser={activeUser}
          onClose={() => setSharingList(null)}
          onShareList={(listId, userIds) => shareListMutation.mutateAsync({ listId, userIds })}
          onRemoveUser={(listId, userId) => shareListMutation.mutateAsync({ listId, userId })}
        />
      )}

      {whatsappConfig && (
        <WhatsAppShareModal
          config={whatsappConfig}
          users={users}
          lists={lists}
          tasks={tasks}
          onClose={() => setWhatsappConfig(null)}
        />
      )}

      <ListsSheet
        isOpen={isListsSheetOpen}
        onClose={() => setIsListsSheetOpen(false)}
        lists={lists}
        activeListId={activeListId}
        setActiveListId={(id) => {
          setActiveListId(id);
          setActiveView(null);
          navigate('/tasks');
        }}
        onCreateList={handleCreateList}
        onDeleteList={handleDeleteList}
        taskCounts={taskCounts}
      />
    </div>
  );
}
