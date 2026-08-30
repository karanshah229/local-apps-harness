import { create } from 'zustand';
import { DEFAULT_SORT_CONFIG } from '@shared/todo';

function getInitialThemeMode() {
  const saved = localStorage.getItem('todo_theme_mode') || localStorage.getItem('todo_theme');
  if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  return 'system';
}

function computeIsDark(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function computeIsPortrait() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || window.innerHeight > window.innerWidth;
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

  // Responsive Layout (Portrait vs Landscape)
  isPortrait: computeIsPortrait(),
  setIsPortrait: (val) => set({ isPortrait: val }),

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

  // Sorting Preferences
  sortPreferences: {},
  setViewSort: (viewKey, config) => {
    set((state) => ({
      sortPreferences: {
        ...state.sortPreferences,
        [viewKey]: config,
      },
    }));
  },
  setSortPreferences: (prefs) => set({ sortPreferences: prefs || {} }),

  // Multi-select Batch mode
  isMultiSelectMode: false,
  selectedTaskIds: [],
  toggleMultiSelectMode: () => {
    const next = !get().isMultiSelectMode;
    set({ isMultiSelectMode: next, selectedTaskIds: [] });
  },
  startMultiSelectWithTask: (taskId) => {
    set({ isMultiSelectMode: true, selectedTaskIds: [taskId] });
  },
  toggleSelectTaskForBatch: (taskId) => {
    const current = get().selectedTaskIds;
    if (current.includes(taskId)) {
      const next = current.filter((id) => id !== taskId);
      set({ selectedTaskIds: next, isMultiSelectMode: next.length > 0 });
    } else {
      set({ selectedTaskIds: [...current, taskId], isMultiSelectMode: true });
    }
  },
  selectAllTasks: (taskIds) => {
    set({ isMultiSelectMode: true, selectedTaskIds: taskIds });
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
