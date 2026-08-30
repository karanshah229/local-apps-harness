import { create } from 'zustand';

function getInitialThemeMode() {
  const saved = localStorage.getItem('todo_theme_mode') || localStorage.getItem('todo_theme');
  if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  return 'system';
}

function computeIsDark(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const useUiStore = create((set, get) => ({
  // Theme state
  themeMode: getInitialThemeMode(),
  isDarkMode: computeIsDark(getInitialThemeMode()),
  setThemeMode: (mode) => {
    localStorage.setItem('todo_theme_mode', mode);
    const isDark = computeIsDark(mode);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ themeMode: mode, isDarkMode: isDark });
  },

  // Sidebar collapse state
  isSidebarCollapsed: localStorage.getItem('todo_sidebar_collapsed') === 'true',
  toggleSidebar: () => {
    const next = !get().isSidebarCollapsed;
    localStorage.setItem('todo_sidebar_collapsed', String(next));
    set({ isSidebarCollapsed: next });
  },

  // Navigation & View state
  activeView: 'all-tasks',
  setActiveView: (view) => set({ activeView: view, activeListId: null, selectedTaskId: null }),

  activeListId: null,
  setActiveListId: (listId) => set({ activeListId: listId, activeView: null, selectedTaskId: null }),

  // Selected Task for Detail Drawer
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  // Search & Filters
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Multi-select Batch mode
  isMultiSelectMode: false,
  selectedTaskIds: [],
  toggleMultiSelectMode: () => {
    const next = !get().isMultiSelectMode;
    set({ isMultiSelectMode: next, selectedTaskIds: [] });
  },
  toggleSelectTaskForBatch: (taskId) => {
    const current = get().selectedTaskIds;
    if (current.includes(taskId)) {
      set({ selectedTaskIds: current.filter((id) => id !== taskId) });
    } else {
      set({ selectedTaskIds: [...current, taskId] });
    }
  },
  clearSelectedBatchTasks: () => set({ selectedTaskIds: [], isMultiSelectMode: false }),

  // Active User Profile
  activeUser: null,
  setActiveUser: (user) => set({ activeUser: user }),

  // Modals & Sheets
  sharingList: null,
  setSharingList: (list) => set({ sharingList: list }),

  whatsappConfig: null,
  setWhatsappConfig: (config) => set({ whatsappConfig: config }),

  isListsSheetOpen: false,
  setIsListsSheetOpen: (open) => set({ isListsSheetOpen: open }),
}));
