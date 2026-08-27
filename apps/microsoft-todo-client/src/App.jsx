import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import TaskMainView from './components/TaskMainView';
import TaskDetailDrawer from './components/TaskDetailDrawer';
import MobileBottomNav from './components/MobileBottomNav';
import ListsSheet from './components/ListsSheet';
import UserLibraryModal from './components/UserLibraryModal';
import ShareListModal from './components/ShareListModal';
import WhatsAppShareModal from './components/WhatsAppShareModal';
import './App.css';

const getBaseUrl = () => {
  let path = window.location.pathname;
  if (path.endsWith('.html')) {
    path = path.substring(0, path.lastIndexOf('/'));
  }
  if (!path.endsWith('/')) {
    path += '/';
  }
  return path;
};

const socket = io('/', {
  path: `${getBaseUrl()}socket.io`.replace(/\/+/g, '/'),
  autoConnect: true
});

export default function App() {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);

  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [activeView, setActiveView] = useState('all-tasks');

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const [taskCounts, setTaskCounts] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  // Modals and Sheet state
  const [isUserLibraryOpen, setIsUserLibraryOpen] = useState(false);
  const [isListsSheetOpen, setIsListsSheetOpen] = useState(false);
  const [sharingList, setSharingList] = useState(null);
  const [whatsappConfig, setWhatsappConfig] = useState(null);

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('todo_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('todo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('todo_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // 1. Load initial users
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (!activeUser && data.length > 0) {
          setActiveUser(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // 2. Load accessible lists for active user
  const fetchLists = useCallback(async () => {
    if (!activeUser) return;
    try {
      const res = await fetch(`/api/lists?userId=${activeUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (err) {
      console.error('Error fetching lists:', err);
    }
  }, [activeUser]);

  // 3. Load tasks for current view or current list
  const fetchTasks = useCallback(async () => {
    if (!activeUser) return;
    try {
      let url = '/api/tasks?';
      if (activeListId) {
        url += `listId=${activeListId}`;
      } else {
        url += `view=${activeView}&userId=${activeUser.id}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  }, [activeListId, activeView, activeUser]);

  // 4. Calculate task counts for badges
  const fetchTaskCounts = useCallback(async () => {
    if (!activeUser) return;
    try {
      const views = ['all-tasks', 'important', 'assigned-to-me'];
      const counts = {};
      for (const v of views) {
        const res = await fetch(`/api/tasks?view=${v}&userId=${activeUser.id}`);
        if (res.ok) {
          const data = await res.json();
          counts[v] = data.filter((t) => !t.is_completed).length;
        }
      }
      setTaskCounts(counts);
    } catch (err) {
      console.error('Error fetching task counts:', err);
    }
  }, [activeUser]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeUser) {
      fetchLists();
      fetchTasks();
      fetchTaskCounts();
    }
  }, [activeUser, fetchLists, fetchTasks, fetchTaskCounts]);

  // 5. Setup Socket.io real-time sync listeners
  useEffect(() => {
    socket.on('task_created', () => {
      fetchTasks();
      fetchTaskCounts();
      fetchLists();
    });

    socket.on('task_updated', (updatedTask) => {
      fetchTasks();
      fetchTaskCounts();
      fetchLists();
      setSelectedTask((prev) =>
        prev && prev.id === updatedTask.id ? updatedTask : prev
      );
    });

    socket.on('task_deleted', ({ id }) => {
      fetchTasks();
      fetchTaskCounts();
      fetchLists();
      setSelectedTask((prev) => (prev && prev.id === parseInt(id) ? null : prev));
    });

    socket.on('list_created', () => fetchLists());
    socket.on('list_updated', () => fetchLists());
    socket.on('list_deleted', () => fetchLists());
    socket.on('list_shared', () => fetchLists());
    socket.on('users_updated', () => fetchUsers());

    socket.on('reminder_alert', ({ message }) => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(''), 6000);
    });

    return () => {
      socket.off('task_created');
      socket.off('task_updated');
      socket.off('task_deleted');
      socket.off('list_created');
      socket.off('list_updated');
      socket.off('list_deleted');
      socket.off('list_shared');
      socket.off('users_updated');
      socket.off('reminder_alert');
    };
  }, [fetchTasks, fetchTaskCounts, fetchLists]);

  // Handlers
  const handleAddUser = async (userObj) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userObj)
      });
      if (res.ok) {
        const newUser = await res.json();
        setUsers((prev) => [...prev, newUser]);
        setToastMessage(`Contact "${newUser.name}" added to user library!`);
        setTimeout(() => setToastMessage(''), 3000);
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleUpdateUser = async (userObj) => {
    try {
      const res = await fetch(`/api/users/${userObj.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userObj)
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        if (activeUser && activeUser.id === updated.id) {
          setActiveUser(updated);
        }
        setToastMessage(`Contact "${updated.name}" updated successfully!`);
        setTimeout(() => setToastMessage(''), 3000);
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleDeleteUser = async (userId) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        if (activeUser && activeUser.id === userId) {
          const remaining = users.filter((u) => u.id !== userId);
          if (remaining.length > 0) setActiveUser(remaining[0]);
        }
        setToastMessage('Contact deleted from user library.');
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBatchImportUsers = async (contactsArray) => {
    try {
      const res = await fetch('/api/users/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: contactsArray })
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        const count = (data.importedCount || 0) + (data.updatedCount || 0);
        setToastMessage(`Imported ${count} contact(s) from device!`);
        setTimeout(() => setToastMessage(''), 4000);
        return data;
      }
    } catch (err) {
      console.error('Error batch importing users:', err);
    }
    return null;
  };

  const handleCreateList = async (title) => {
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          created_by: activeUser ? activeUser.id : 1
        })
      });
      if (res.ok) {
        const newList = await res.json();
        setActiveListId(newList.id);
        setActiveView(null);
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteList = async (listId) => {
    try {
      const res = await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
      if (res.ok) {
        if (activeListId === listId) {
          setActiveListId(null);
          setActiveView('all-tasks');
        }
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateListTheme = async (listId, themeColor) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    try {
      await fetch(`/api/lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: list.title,
          color_theme: themeColor,
          icon: list.icon
        })
      });
      fetchLists();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          created_by: activeUser ? activeUser.id : 1
        })
      });
      if (res.ok) {
        fetchTasks();
        fetchTaskCounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTask = async (taskUpdate) => {
    try {
      const res = await fetch(`/api/tasks/${taskUpdate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskUpdate)
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        if (selectedTask && selectedTask.id === updated.id) {
          setSelectedTask(updated);
        }
        fetchTaskCounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaskComplete = (task) => {
    handleUpdateTask({ id: task.id, is_completed: task.is_completed ? 0 : 1 });
  };

  const handleToggleTaskImportant = (task) => {
    handleUpdateTask({ id: task.id, is_important: task.is_important ? 0 : 1 });
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedTask(null);
        fetchTasks();
        fetchTaskCounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareList = async (listId, userId) => {
    try {
      const res = await fetch(`/api/lists/${listId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveShare = async (listId, userId) => {
    try {
      const res = await fetch(`/api/lists/${listId}/share/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <div className="flex h-screen h-[100dvh] w-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        lists={lists}
        activeListId={activeListId}
        setActiveListId={setActiveListId}
        users={users}
        activeUser={activeUser}
        setActiveUser={setActiveUser}
        onOpenUserLibrary={() => setIsUserLibraryOpen(true)}
        onCreateList={handleCreateList}
        onDeleteList={handleDeleteList}
        taskCounts={taskCounts}
      />

      {/* Main Task List View */}
      <TaskMainView
        activeView={activeView}
        activeList={activeList}
        tasks={tasks}
        selectedTaskId={selectedTask?.id}
        onSelectTask={(task) => setSelectedTask(task)}
        onCreateTask={handleCreateTask}
        onToggleTaskComplete={handleToggleTaskComplete}
        onToggleTaskImportant={handleToggleTaskImportant}
        onOpenShareModal={(list) => setSharingList(list)}
        onOpenWhatsAppModal={(config) => setWhatsappConfig(config)}
        onUpdateListTheme={handleUpdateListTheme}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Task Details Drawer (Fullscreen on mobile, side-panel on desktop) */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onOpenWhatsAppModal={(config) => setWhatsappConfig(config)}
        />
      )}

      {/* Mobile Bottom CTA Navigation Bar (hidden on desktop) */}
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
      />

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
      />

      {/* Share List Sheet */}
      <ShareListModal
        isOpen={!!sharingList}
        onClose={() => setSharingList(null)}
        list={sharingList}
        users={users}
        onShareList={handleShareList}
        onRemoveShare={handleRemoveShare}
      />

      {/* WhatsApp Share & Reminder Sheet */}
      <WhatsAppShareModal
        isOpen={!!whatsappConfig}
        onClose={() => setWhatsappConfig(null)}
        config={whatsappConfig}
        users={users}
      />

      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-semibold max-w-[90vw] animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="text-base">📲</span>
          <span className="truncate">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
