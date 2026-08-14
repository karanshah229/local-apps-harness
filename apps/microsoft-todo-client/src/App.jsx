import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import TaskMainView from './components/TaskMainView';
import TaskDetailDrawer from './components/TaskDetailDrawer';
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
  const [activeView, setActiveView] = useState('my-day');

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const [taskCounts, setTaskCounts] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [isUserLibraryOpen, setIsUserLibraryOpen] = useState(false);
  const [sharingList, setSharingList] = useState(null);
  const [whatsappConfig, setWhatsappConfig] = useState(null);

  // 1. Load initial users (User Library)
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (!activeUser && data.length > 0) {
          setActiveUser(data[0]); // Default to Alex Johnson
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

  // 4. Calculate task counts for sidebar badges
  const fetchTaskCounts = useCallback(async () => {
    if (!activeUser) return;
    try {
      const views = ['my-day', 'important', 'planned', 'assigned-to-me', 'all-tasks'];
      const counts = {};
      for (const v of views) {
        const res = await fetch(`/api/tasks?view=${v}&userId=${activeUser.id}`);
        if (res.ok) {
          const data = await res.json();
          counts[v] = data.filter(t => !t.is_completed).length;
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
      setSelectedTask(prev => (prev && prev.id === updatedTask.id ? updatedTask : prev));
    });

    socket.on('task_deleted', ({ id }) => {
      fetchTasks();
      fetchTaskCounts();
      fetchLists();
      setSelectedTask(prev => (prev && prev.id === parseInt(id) ? null : prev));
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

  // Handler functions
  const handleAddUser = async (userObj) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userObj)
      });
      if (res.ok) {
        const newUser = await res.json();
        setUsers(prev => [...prev, newUser]);
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
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
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
        setUsers(prev => prev.filter(u => u.id !== userId));
        if (activeUser && activeUser.id === userId) {
          const remaining = users.filter(u => u.id !== userId);
          if (remaining.length > 0) setActiveUser(remaining[0]);
        }
        setToastMessage('Contact deleted from user library.');
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
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
          setActiveView('my-day');
        }
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateListTheme = async (listId, themeColor) => {
    const list = lists.find(l => l.id === listId);
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
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
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

  const activeList = lists.find(l => l.id === activeListId);

  return (
    <div className="app-container">
      {/* Sidebar */}
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
        onOpenShareModal={(list) => setSharingList(list)}
        onCreateList={handleCreateList}
        onDeleteList={handleDeleteList}
        taskCounts={taskCounts}
      />

      {/* Main View */}
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
      />

      {/* Right Task Details Drawer */}
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

      {/* Modals */}
      <UserLibraryModal
        isOpen={isUserLibraryOpen}
        onClose={() => setIsUserLibraryOpen(false)}
        users={users}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
      />

      <ShareListModal
        isOpen={!!sharingList}
        onClose={() => setSharingList(null)}
        list={sharingList}
        users={users}
        onShareList={handleShareList}
        onRemoveShare={handleRemoveShare}
      />

      <WhatsAppShareModal
        isOpen={!!whatsappConfig}
        onClose={() => setWhatsappConfig(null)}
        config={whatsappConfig}
        users={users}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="toast-alert">
          <span>📲 {toastMessage}</span>
        </div>
      )}
    </div>
  );
}
