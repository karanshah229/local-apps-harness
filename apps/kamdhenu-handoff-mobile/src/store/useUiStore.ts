import { create } from 'zustand';
import { Appearance } from 'react-native';
import { User, List, Task, WhatsAppPayloadConfig, ViewSortConfig, SortPreferences, DEFAULT_SORT_CONFIG, WhatsAppMessageStyle } from '@shared/todo';

const getInitialDarkMode = (mode: 'system' | 'light' | 'dark'): boolean => {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return Appearance.getColorScheme() === 'dark';
};

interface UiState {
  themeMode: 'system' | 'light' | 'dark';
  isDarkMode: boolean;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
  setIsDarkMode: (isDark: boolean) => void;

  activeView: string | null;
  setActiveView: (view: string | null) => void;

  activeListId: number | null;
  setActiveListId: (id: number | null) => void;

  activeCustomViewId: number | null;
  setActiveCustomViewId: (id: number | null) => void;

  selectedTaskId: number | null;
  setSelectedTaskId: (id: number | null) => void;

  isMultiSelectMode: boolean;
  selectedTaskIds: number[];
  toggleMultiSelectMode: () => void;
  startMultiSelectWithTask: (taskId: number) => void;
  toggleSelectTaskForBatch: (taskId: number) => void;
  selectAllTasks: (taskIds: number[]) => void;
  clearSelectedBatchTasks: () => void;

  activeUser: User | null;
  setActiveUser: (user: User | null) => void;

  sharingList: List | null;
  setSharingList: (list: List | null) => void;

  whatsappConfig: WhatsAppPayloadConfig | null;
  setWhatsappConfig: (config: WhatsAppPayloadConfig | null) => void;

  defaultWhatsAppStyle: WhatsAppMessageStyle;
  setDefaultWhatsAppStyle: (style: WhatsAppMessageStyle) => void;
  defaultWhatsAppIncludeNotes: boolean;
  setDefaultWhatsAppIncludeNotes: (include: boolean) => void;

  isListsSheetOpen: boolean;
  setIsListsSheetOpen: (open: boolean) => void;

  dialogConfig: DialogConfig | null;
  showConfirmDialog: (config: DialogConfig) => void;
  showAlertDialog: (title: string, message: string, onOk?: () => void) => void;
  closeDialog: () => void;

  sortPreferences: SortPreferences;
  getViewSort: (viewKey: string) => ViewSortConfig;
  setViewSort: (viewKey: string, config: ViewSortConfig) => void;
  setAllSortPreferences: (prefs: SortPreferences) => void;
}

export interface DialogConfig {
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | 'default';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  themeMode: 'system',
  isDarkMode: getInitialDarkMode('system'),
  setThemeMode: (mode) => set({ themeMode: mode, isDarkMode: getInitialDarkMode(mode) }),
  setIsDarkMode: (isDark) => set({ isDarkMode: isDark }),

  activeView: 'all-tasks',
  setActiveView: (view) => set({ activeView: view, activeListId: null, activeCustomViewId: null }),

  activeListId: null,
  setActiveListId: (id) => set({ activeListId: id, activeView: null, activeCustomViewId: null }),

  activeCustomViewId: null,
  setActiveCustomViewId: (id) => set({ activeCustomViewId: id, activeView: null, activeListId: null }),

  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  isMultiSelectMode: false,
  selectedTaskIds: [],
  toggleMultiSelectMode: () => {
    const next = !get().isMultiSelectMode;
    set({ isMultiSelectMode: next, selectedTaskIds: [] });
  },
  startMultiSelectWithTask: (taskId: number) => {
    set({ isMultiSelectMode: true, selectedTaskIds: [taskId] });
  },
  toggleSelectTaskForBatch: (taskId: number) => {
    const current = get().selectedTaskIds;
    if (current.includes(taskId)) {
      const next = current.filter((id) => id !== taskId);
      set({ selectedTaskIds: next, isMultiSelectMode: next.length > 0 });
    } else {
      set({ selectedTaskIds: [...current, taskId], isMultiSelectMode: true });
    }
  },
  selectAllTasks: (taskIds: number[]) => {
    set({ isMultiSelectMode: true, selectedTaskIds: taskIds });
  },
  clearSelectedBatchTasks: () => set({ selectedTaskIds: [], isMultiSelectMode: false }),

  activeUser: null,
  setActiveUser: (user) => set({ activeUser: user }),

  sharingList: null,
  setSharingList: (list) => set({ sharingList: list }),

  whatsappConfig: null,
  setWhatsappConfig: (config) => set({ whatsappConfig: config }),

  defaultWhatsAppStyle: 'modern',
  setDefaultWhatsAppStyle: (style) => set({ defaultWhatsAppStyle: style }),
  defaultWhatsAppIncludeNotes: true,
  setDefaultWhatsAppIncludeNotes: (include) => set({ defaultWhatsAppIncludeNotes: include }),

  isListsSheetOpen: false,
  setIsListsSheetOpen: (open) => set({ isListsSheetOpen: open }),

  dialogConfig: null,
  showConfirmDialog: (config) => set({ dialogConfig: config }),
  showAlertDialog: (title, message, onOk) =>
    set({
      dialogConfig: {
        title,
        message,
        type: 'info',
        confirmLabel: 'OK',
        cancelLabel: '',
        onConfirm: onOk,
      },
    }),
  closeDialog: () => set({ dialogConfig: null }),

  sortPreferences: {},
  getViewSort: (viewKey: string) => {
    return get().sortPreferences[viewKey] || DEFAULT_SORT_CONFIG;
  },
  setViewSort: (viewKey: string, config: ViewSortConfig) => {
    const next = { ...get().sortPreferences, [viewKey]: config };
    set({ sortPreferences: next });
  },
  setAllSortPreferences: (prefs: SortPreferences) => {
    set({ sortPreferences: prefs || {} });
  },
}));
