import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useUiStore } from './store/useUiStore.js';
import {
  useUsersQuery,
  useListsQuery,
  useTasksQuery,
  useTaskQuery,
  useTaskCountsQuery,
  useUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
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
import TasksView from './components/TasksView.jsx';
import SingleListView from './components/SingleListView.jsx';
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
    isPortrait,
    setIsPortrait,
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
    setSortPreferences,
  } = useUiStore();

  // Handle responsive viewport orientation & resize listener
  useEffect(() => {
    const handleResize = () => {
      const portrait = window.innerWidth <= 768 || window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [setIsPortrait]);

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
      setIsListsSheetOpen(true);
    }
  }, [location.pathname, setActiveView, setIsListsSheetOpen]);

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

  // Sync user preferences (sort preferences, last view)
  const { data: prefs } = useUserPreferencesQuery(activeUser?.id || 1);
  const updatePrefs = useUpdateUserPreferencesMutation(activeUser?.id || 1);

  useEffect(() => {
    if (prefs?.sort_preferences) {
      try {
        const parsed = typeof prefs.sort_preferences === 'string'
          ? JSON.parse(prefs.sort_preferences)
          : prefs.sort_preferences;
        setSortPreferences(parsed);
      } catch {
        // Ignore JSON parse errors
      }
    }
  }, [prefs?.sort_preferences, setSortPreferences]);

  // Single task query when drawer is open
  const { data: fetchedTask } = useTaskQuery(selectedTaskId && selectedTaskId > 0 ? selectedTaskId : null);

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
  const activeList = lists.find((l) => l.id === activeListId) || null;
  const selectedTask = selectedTaskId
    ? selectedTaskId < 0
      ? { id: selectedTaskId, title: '', notes: '', list_id: activeListId }
      : fetchedTask || tasks.find((t) => t.id === selectedTaskId) || null
    : null;

  // Handlers
  const handleSelectTask = (task) => {
    setSelectedTaskId(task ? task.id : null);
  };

  const handleCreateTask = async (taskData) => {
    return createTaskMutation.mutateAsync({
      ...taskData,
      created_by: activeUser ? activeUser.id : 1,
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
        created_by: activeUser ? activeUser.id : 1,
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

  // Render content based on Portrait (Mobile Parity) vs Landscape (Desktop Web)
  const renderMainContent = () => {
    if (activeView === 'contacts') {
      return (
        <ContactsPage
          onBack={() => {
            setActiveView('all-tasks');
            navigate('/');
          }}
          users={users}
          activeUser={activeUser}
          setActiveUser={setActiveUser}
          onAddUser={(data) => addUserMutation.mutateAsync(data)}
          onUpdateUser={(data) => updateUserMutation.mutateAsync(data)}
          onDeleteUser={(id) => deleteUserMutation.mutateAsync(id)}
          onBatchImportUsers={(contacts) => batchImportUsersMutation.mutateAsync(contacts)}
        />
      );
    }

    if (activeView === 'settings') {
      return (
        <SettingsPage
          onBack={() => {
            setActiveView('all-tasks');
            navigate('/');
          }}
          isDarkMode={isDarkMode}
          themeMode={themeMode}
          onSetThemeMode={setThemeMode}
        />
      );
    }

    if (activeListId) {
      return (
        <SingleListView
          listId={activeListId}
          onBack={() => {
            setActiveListId(null);
            setActiveView('all-tasks');
          }}
          onOpenShareModal={(list) => setSharingList(list)}
          onOpenSettings={() => {
            setActiveView('settings');
            navigate('/settings');
          }}
        />
      );
    }

    if (isPortrait) {
      return (
        <TasksView
          fixedView={activeView || 'all-tasks'}
          onOpenSettings={() => {
            setActiveView('settings');
            navigate('/settings');
          }}
        />
      );
    }

    return (
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
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary antialiased font-sans">
      {/* Desktop / Tablet Left Sidebar (Hidden on Portrait / Mobile) */}
      {!isPortrait && (
        <Sidebar
          activeView={activeView}
          setActiveView={(v) => {
            setActiveView(v);
            if (v === 'contacts') navigate('/contacts');
            else if (v === 'settings') navigate('/settings');
            else navigate('/');
          }}
          activeListId={activeListId}
          setActiveListId={(id) => {
            setActiveListId(id);
            navigate('/');
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
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-background">
        <Routes>
          <Route path="/contacts" element={renderMainContent()} />
          <Route path="/settings" element={renderMainContent()} />
          <Route path="*" element={renderMainContent()} />
        </Routes>
      </div>

      {/* Task Details Drawer (Fullscreen on portrait, split-pane on landscape) */}
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

      {/* Mobile Bottom Navigation Bar (Hidden on desktop landscape) */}
      {isPortrait && (
        <MobileBottomNav
          activeView={activeView}
          setActiveView={(v) => {
            setActiveView(v);
            if (v === 'contacts') navigate('/contacts');
            else if (v === 'settings') navigate('/settings');
            else navigate('/');
          }}
          activeListId={activeListId}
          setActiveListId={(id) => {
            setActiveListId(id);
            navigate('/');
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
      )}

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
          navigate('/');
        }}
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          setActiveListId(null);
          navigate('/');
        }}
        onCreateList={handleCreateList}
        onDeleteList={handleDeleteList}
        taskCounts={taskCounts}
      />
    </div>
  );
}
