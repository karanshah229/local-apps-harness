import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  Linking,
  StyleSheet,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Star,
  Check,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  RotateCcw,
  Send,
  Palette,
  Trash2,
  CheckSquare,
  MoreVertical,
  Phone,
  CheckCircle2,
  Circle,
  ListChecks,
  Eye,
  UserCheck,
  Pencil,
  ListTodo,
  Users,
} from 'lucide-react-native';
import { WhatsAppIcon } from './WhatsAppIcon';
import { WhatsAppGroupModal } from './WhatsAppGroupModal';
import { SortModal } from './SortModal';
import { FilterBottomSheet } from './FilterBottomSheet';
import { useUiStore } from '../store/useUiStore';
import {
  useTasksQuery,
  useListsQuery,
  useUsersQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
  useAddUserMutation,
  prefetchAllTasksInView,
} from '../hooks/useTodoQueries';
import { useTaskNavigation } from '../hooks/useTaskNavigation';
import { BulkDueDatePickerModal } from './BulkDueDatePickerModal';
import { BulkAssigneePickerModal } from './BulkAssigneePickerModal';
import {
  Task,
  List,
  User,
  THEME_COLORS,
  THEME_PALETTES,
  PRESET_CUSTOM_COLORS,
  getThemePrimary,
  getThemeGradient,
  ThemeColor,
  formatWholeListMessage,
  formatBatchTasksMessage,
  generateWhatsAppDeepLink,
  generateWhatsAppWebLink,
  ViewSortConfig,
  DEFAULT_SORT_CONFIG,
  sortTasks,
  getSortDisplayLabel,
  fuzzyMatch,
  getSearchMatchScore,
  getMultiFieldSearchScore,
  formatDueDateDisplay,
  formatDueDateDDMMYY,
  isTaskOverdue,
} from '@shared/todo';

function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(0, 120, 212, ${alpha})`;
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

interface TaskItemProps {
  task: Task;
  isDarkMode: boolean;
  isMultiSelectMode: boolean;
  isCheckedForBatch: boolean;
  themePrimary: string;
  onPress: (task: Task) => void;
  onLongPress: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleImportant: (task: Task) => void;
}

const TaskItem = React.memo(({
  task,
  isDarkMode,
  isMultiSelectMode,
  isCheckedForBatch,
  themePrimary,
  onPress,
  onLongPress,
  onToggleComplete,
  onToggleImportant,
}: TaskItemProps) => {
  return (
    <TouchableOpacity
      onPress={() => onPress(task)}
      onLongPress={() => onLongPress(task)}
      delayLongPress={280}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        minHeight: 58,
        borderRadius: 18,
        backgroundColor: isCheckedForBatch
          ? (isDarkMode ? hexToRgba(themePrimary, 0.2) : hexToRgba(themePrimary, 0.1))
          : (isDarkMode ? '#18181b' : '#ffffff'),
        borderWidth: 1,
        borderColor: isCheckedForBatch
          ? themePrimary
          : (isDarkMode ? '#27272a' : '#e2e8f0'),
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
        <TouchableOpacity
          onPress={() => isMultiSelectMode ? onPress(task) : onToggleComplete(task)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: isCheckedForBatch ? themePrimary : (isDarkMode ? '#52525b' : '#94a3b8'),
            backgroundColor: isCheckedForBatch ? themePrimary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isCheckedForBatch && <Check size={14} color="#ffffff" strokeWidth={3} />}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: isDarkMode ? '#f4f4f5' : '#0f172a',
            }}
            numberOfLines={1}
          >
            {task.title}
          </Text>

          {(task.due_date || (task.subtask_count && task.subtask_count > 0) || task.assignee_name) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {task.due_date && (() => {
                const dueInfo = formatDueDateDisplay(task.due_date, task.is_completed);
                if (!dueInfo) return null;
                const isOverdue = dueInfo.isOverdue;
                return (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: isOverdue
                        ? 'rgba(239, 68, 68, 0.15)'
                        : isDarkMode ? '#27272a' : '#f1f5f9',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 6,
                      borderWidth: isOverdue ? 1 : 0,
                      borderColor: isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'transparent',
                    }}
                  >
                    <Calendar size={11} color={isOverdue ? '#ef4444' : themePrimary} />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: isOverdue ? '#ef4444' : (isDarkMode ? '#d4d4d8' : '#334155'),
                      }}
                    >
                      {dueInfo.label}
                    </Text>
                  </View>
                );
              })()}
              {Boolean(task.subtask_count && task.subtask_count > 0) && (
                <View style={{ backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                    {task.subtask_completed_count || 0}/{task.subtask_count} steps
                  </Text>
                </View>
              )}
              {Boolean(task.assignee_name) && (
                <View style={{ backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                    {task.assignee_name?.split(' ')[0]}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={() => onToggleImportant(task)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ padding: 6 }}
      >
        <Star
          size={20}
          color={task.is_important ? '#f59e0b' : (isDarkMode ? '#52525b' : '#94a3b8')}
          fill={task.is_important ? '#f59e0b' : 'none'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

interface CompletedTaskItemProps {
  task: Task;
  isDarkMode: boolean;
  themePrimary: string;
  isMultiSelectMode?: boolean;
  isCheckedForBatch?: boolean;
  onPress: (task: Task) => void;
  onLongPress?: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

const CompletedTaskItem = React.memo(({
  task,
  isDarkMode,
  themePrimary,
  isMultiSelectMode,
  isCheckedForBatch,
  onPress,
  onLongPress,
  onToggleComplete,
}: CompletedTaskItemProps) => {
  return (
    <TouchableOpacity
      onPress={() => onPress(task)}
      onLongPress={() => onLongPress && onLongPress(task)}
      delayLongPress={280}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: isCheckedForBatch
          ? (isDarkMode ? hexToRgba(themePrimary, 0.2) : hexToRgba(themePrimary, 0.1))
          : (isDarkMode ? 'rgba(39, 39, 42, 0.4)' : '#f1f5f9'),
        borderWidth: 1,
        borderColor: isCheckedForBatch
          ? themePrimary
          : 'transparent',
        opacity: isCheckedForBatch ? 1 : 0.75,
        marginBottom: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
        <TouchableOpacity
          onPress={() => isMultiSelectMode ? onPress(task) : onToggleComplete(task)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: isCheckedForBatch ? themePrimary : (isDarkMode ? '#52525b' : '#94a3b8'),
            backgroundColor: isCheckedForBatch ? themePrimary : (isMultiSelectMode ? 'transparent' : themePrimary),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isCheckedForBatch ? (
            <Check size={13} color="#ffffff" strokeWidth={3} />
          ) : !isMultiSelectMode ? (
            <Check size={13} color="#ffffff" strokeWidth={3} />
          ) : null}
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: isDarkMode ? '#a1a1aa' : '#64748b',
            textDecorationLine: 'line-through',
            flex: 1,
          }}
          numberOfLines={1}
        >
          {task.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

interface SingleListViewProps {
  listId: number;
  onBack: () => void;
}

export function SingleListView({ listId, onBack }: SingleListViewProps) {
  const router = useRouter();

  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const isMultiSelectMode = useUiStore((s) => s.isMultiSelectMode);
  const selectedTaskIds = useUiStore((s) => s.selectedTaskIds);
  const startMultiSelectWithTask = useUiStore((s) => s.startMultiSelectWithTask);
  const toggleSelectTaskForBatch = useUiStore((s) => s.toggleSelectTaskForBatch);
  const selectAllTasks = useUiStore((s) => s.selectAllTasks);
  const clearSelectedBatchTasks = useUiStore((s) => s.clearSelectedBatchTasks);
  const setSelectedTaskId = useUiStore((s) => s.setSelectedTaskId);
  const showConfirmDialog = useUiStore((s) => s.showConfirmDialog);
  const showAlertDialog = useUiStore((s) => s.showAlertDialog);

  const [showBulkDueModal, setShowBulkDueModal] = useState(false);
  const [showBulkAssigneeModal, setShowBulkAssigneeModal] = useState(false);

  const [showCompleted, setShowCompleted] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [activeThemeTab, setActiveThemeTab] = useState<'palette' | 'custom'>('palette');
  const [customColorHex, setCustomColorHex] = useState('');
  const [showEditTitleModal, setShowEditTitleModal] = useState(false);
  const [editListTitle, setEditListTitle] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [contactPickerSearch, setContactPickerSearch] = useState('');
  const [isSharingFromPicker, setIsSharingFromPicker] = useState(false);
  const [showScopePickerModal, setShowScopePickerModal] = useState(false);
  const [showLongPressShareModal, setShowLongPressShareModal] = useState(false);
  const [shareScope, setShareScope] = useState<'pending' | 'all' | 'current_view'>('pending');
  const [longPressRecipient, setLongPressRecipient] = useState<User | null>(null);
  const pendingContactRef = useRef<User | null>(null);

  // Filter States
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterImportance, setFilterImportance] = useState<'all' | 'important' | 'normal'>('all');
  const [filterDue, setFilterDue] = useState<'all' | 'today' | 'tomorrow' | 'overdue' | 'has_due' | 'no_due'>('all');
  const [filterAssigneeId, setFilterAssigneeId] = useState<number | 'unassigned' | 'all'>('all');

  const listsQuery = useListsQuery(1);
  const usersQuery = useUsersQuery();
  const tasksQuery = useTasksQuery({ listId, userId: 1 });

  const lists = listsQuery.data || [];
  const users = usersQuery.data || [];
  const tasks = tasksQuery.data || [];

  const existingGroups = useMemo(() => users.filter((u) => Boolean(u.is_group)), [users]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        tasksQuery.refetch(),
        listsQuery.refetch(),
        usersQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [tasksQuery, listsQuery, usersQuery]);

  const insets = useSafeAreaInsets();
  const updateTaskMutation = useUpdateTaskMutation();
  const updateListMutation = useUpdateListMutation();
  const deleteListMutation = useDeleteListMutation();
  const addUserMutation = useAddUserMutation();
  const { data: prefs } = useUserPreferencesQuery(1);
  const updatePrefs = useUpdateUserPreferencesMutation();
  const { openTask, TaskLoadingIndicator } = useTaskNavigation();

  const handleCreateGroup = useCallback(async (groupName: string) => {
    try {
      const created = await addUserMutation.mutateAsync({
        name: groupName,
        phone: '',
        is_group: 1,
      });
      return created;
    } catch {
      return null;
    }
  }, [addUserMutation]);

  // Pre-fetch all tasks and subtasks when tasks load in this list
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      prefetchAllTasksInView(tasks);
    }
  }, [tasks]);

  // Handle Android hardware back press and back gesture to cancel multi-select mode
  useEffect(() => {
    if (!isMultiSelectMode && selectedTaskIds.length === 0) return;

    const onBackPress = () => {
      clearSelectedBatchTasks();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isMultiSelectMode, selectedTaskIds.length, clearSelectedBatchTasks]);

  const sortPreferences = useUiStore((s) => s.sortPreferences);
  const setViewSort = useUiStore((s) => s.setViewSort);
  const viewKey = `list_${listId}`;
  const currentSort = useMemo(() => sortPreferences[viewKey] || DEFAULT_SORT_CONFIG, [sortPreferences, viewKey]);

  const handleSelectSort = useCallback((config: ViewSortConfig) => {
    setViewSort(viewKey, config);
    const updated = { ...sortPreferences, [viewKey]: config };
    updatePrefs.mutate({ sort_preferences: updated });
  }, [viewKey, sortPreferences, setViewSort, updatePrefs]);


  const activeList = useMemo(() => lists.find((l) => l.id === listId), [lists, listId]);

  const defaultContact = useMemo(() => {
    if (!activeList?.default_whatsapp_contact_id) return null;
    return users.find((u) => u.id === activeList.default_whatsapp_contact_id) || null;
  }, [users, activeList?.default_whatsapp_contact_id]);

  const filteredContacts = useMemo(() => {
    const q = contactPickerSearch.trim();
    if (!q) return users;
    return users
      .filter((u) => fuzzyMatch(u.name || '', q) || fuzzyMatch(u.phone || '', q))
      .sort((a, b) => {
        const scoreA = getMultiFieldSearchScore([a.name, a.phone], q);
        const scoreB = getMultiFieldSearchScore([b.name, b.phone], q);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [users, contactPickerSearch]);

  const listTheme = activeList?.color_theme || 'blue';
  const themePrimary = useMemo(() => {
    return getThemePrimary(listTheme, isDarkMode);
  }, [listTheme, isDarkMode]);
  const gradientColors = useMemo((): [string, string] => {
    return getThemeGradient(listTheme, isDarkMode);
  }, [listTheme, isDarkMode]);

  const handleToggleComplete = useCallback((task: Task) => {
    if (isMultiSelectMode) {
      toggleSelectTaskForBatch(task.id);
    } else {
      updateTaskMutation.mutate({
        id: task.id,
        is_completed: task.is_completed ? 0 : 1,
      });
    }
  }, [isMultiSelectMode, toggleSelectTaskForBatch, updateTaskMutation]);

  const handleToggleImportant = useCallback((task: Task) => {
    updateTaskMutation.mutate({
      id: task.id,
      is_important: task.is_important ? 0 : 1,
    });
  }, [updateTaskMutation]);

  const handleTaskPress = useCallback((task: Task) => {
    if (isMultiSelectMode) {
      toggleSelectTaskForBatch(task.id);
    } else {
      openTask(task.id, listTheme);
    }
  }, [isMultiSelectMode, toggleSelectTaskForBatch, openTask, listTheme]);

  const handleOpenNewTask = useCallback(() => {
    const themeParam = listTheme ? `&themeColor=${encodeURIComponent(listTheme)}` : '';
    router.push(`/task/new?listId=${listId}${themeParam}`);
  }, [listId, listTheme, router]);

  const handleDeleteList = useCallback(() => {
    if (!activeList) return;
    showConfirmDialog({
      title: 'Delete List',
      message: `Are you sure you want to delete "${activeList.title}"?`,
      type: 'danger',
      confirmLabel: 'Delete List',
      onConfirm: async () => {
        await deleteListMutation.mutateAsync(activeList.id);
        onBack();
      },
    });
  }, [activeList, deleteListMutation, onBack, showConfirmDialog]);

  const handleUpdateTheme = (newColor: ThemeColor) => {
    if (!activeList) return;
    updateListMutation.mutate({
      id: activeList.id,
      title: activeList.title,
      color_theme: newColor,
    });
    setShowThemePicker(false);
  };

  const handleOpenEditTitle = useCallback(() => {
    if (!activeList) return;
    setEditListTitle(activeList.title);
    setShowEditTitleModal(true);
  }, [activeList]);

  const handleSaveListTitle = useCallback(() => {
    if (!activeList) return;
    const trimmed = editListTitle.trim();
    if (!trimmed) {
      showAlertDialog('Invalid Name', 'List name cannot be empty.');
      return;
    }
    if (trimmed !== activeList.title) {
      updateListMutation.mutate({
        id: activeList.id,
        title: trimmed,
      });
    }
    setShowEditTitleModal(false);
  }, [activeList, editListTitle, updateListMutation]);

  const openWhatsAppWithMessage = useCallback((phone: string | null | undefined, message: string) => {
    const deepLink = generateWhatsAppDeepLink(phone || '', message);
    Linking.canOpenURL(deepLink).then((supported) => {
      if (supported) {
        Linking.openURL(deepLink);
      } else {
        const webLink = generateWhatsAppWebLink(phone || '', message);
        Linking.openURL(webLink);
      }
    });
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterImportance !== 'all') count++;
    if (filterDue !== 'all') count++;
    if (filterAssigneeId !== 'all') count++;
    return count;
  }, [filterStatus, filterImportance, filterDue, filterAssigneeId]);

  const handleResetFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterImportance('all');
    setFilterDue('all');
    setFilterAssigneeId('all');
  }, []);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const titleMatch = fuzzyMatch(task.title || '', searchQuery);
        const notesMatch = fuzzyMatch(task.notes || '', searchQuery);
        const assigneeMatch = fuzzyMatch(task.assignee_name || '', searchQuery);
        const dueMatch = fuzzyMatch(task.due_date || '', searchQuery);
        if (!titleMatch && !notesMatch && !assigneeMatch && !dueMatch) return false;
      }

      if (filterStatus === 'pending' && task.is_completed) return false;
      if (filterStatus === 'completed' && !task.is_completed) return false;

      if (filterImportance === 'important' && !task.is_important) return false;
      if (filterImportance === 'normal' && task.is_important) return false;

      if (filterDue === 'today' && task.due_date !== todayStr) return false;
      if (filterDue === 'tomorrow' && task.due_date !== tomorrowStr) return false;
      if (filterDue === 'overdue' && (!task.due_date || task.due_date >= todayStr || task.is_completed)) return false;
      if (filterDue === 'has_due' && !task.due_date) return false;
      if (filterDue === 'no_due' && task.due_date) return false;

      if (filterAssigneeId === 'unassigned' && task.assigned_to_user_id) return false;
      if (typeof filterAssigneeId === 'number' && task.assigned_to_user_id !== filterAssigneeId) return false;

      return true;
    });
  }, [tasks, searchQuery, filterStatus, filterImportance, filterDue, filterAssigneeId]);

  const sortedTasks = useMemo(() => {
    const baseSorted = sortTasks(filteredTasks, currentSort);
    const q = searchQuery.trim();
    if (!q) return baseSorted;

    return [...baseSorted].sort((a, b) => {
      const aFields = [a.title, a.notes, a.assignee_name, a.due_date];
      const bFields = [b.title, b.notes, b.assignee_name, b.due_date];
      const scoreA = getMultiFieldSearchScore(aFields, q);
      const scoreB = getMultiFieldSearchScore(bFields, q);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return 0;
    });
  }, [filteredTasks, currentSort, searchQuery]);

  const pendingTasks = useMemo(() => sortedTasks.filter((t) => !t.is_completed), [sortedTasks]);
  const completedTasks = useMemo(() => sortedTasks.filter((t) => t.is_completed), [sortedTasks]);

  useEffect(() => {
    if (activeList?.default_whatsapp_share_scope) {
      setShareScope(activeList.default_whatsapp_share_scope as 'pending' | 'all' | 'current_view');
    }
  }, [activeList?.default_whatsapp_share_scope]);

  const executeShareWithContactAndScope = useCallback(
    (contact: { name?: string; phone?: string }, chosenScope: 'pending' | 'all' | 'current_view') => {
      if (!activeList || !contact.phone) return;

      let targetTasks: Task[] = [];
      if (chosenScope === 'pending') {
        targetTasks = tasks.filter((t) => !t.is_completed);
      } else if (chosenScope === 'all') {
        targetTasks = tasks;
      } else {
        targetTasks = filteredTasks;
      }

      if (targetTasks.length === 0) {
        const msg = chosenScope === 'pending'
          ? 'There are no pending tasks to share in this list.'
          : 'There are no tasks matching the selected option.';
        showAlertDialog('No Tasks to Share', msg);
        return;
      }

      const message = formatWholeListMessage(activeList, targetTasks, { scope: chosenScope });
      openWhatsAppWithMessage(contact.phone, message);
    },
    [activeList, tasks, filteredTasks, openWhatsAppWithMessage, showAlertDialog]
  );

  const handleWhatsAppList = useCallback(() => {
    if (!activeList) return;

    if (tasks.length === 0) {
      showAlertDialog('No Tasks', 'There are no tasks in this list to share.');
      return;
    }

    // 1. Check if default WhatsApp contact is selected
    let defaultContact: { id?: number; name?: string; phone?: string } | null = null;
    if (activeList.default_whatsapp_contact_id) {
      defaultContact = users.find((u) => u.id === activeList.default_whatsapp_contact_id) || null;
    }
    if (!defaultContact && activeList.default_whatsapp_contact_phone) {
      defaultContact = {
        name: activeList.default_whatsapp_contact_name || 'Contact',
        phone: activeList.default_whatsapp_contact_phone,
      };
    }

    if (!defaultContact || !defaultContact.phone) {
      // Ask for default WhatsApp contact if not selected
      setIsSharingFromPicker(true);
      setShowContactPicker(true);
      return;
    }

    // 2. Ask for Tasks to send option first time only (if not yet chosen)
    if (!activeList.default_whatsapp_share_scope) {
      pendingContactRef.current = defaultContact as User;
      setShowScopePickerModal(true);
      return;
    }

    // Both are set -> send immediately
    executeShareWithContactAndScope(
      defaultContact,
      activeList.default_whatsapp_share_scope as 'pending' | 'all' | 'current_view'
    );
  }, [activeList, tasks.length, users, executeShareWithContactAndScope, showAlertDialog]);

  const handleSelectDefaultContact = useCallback(
    (user: User | null) => {
      if (!activeList) return;
      updateListMutation.mutate({
        id: activeList.id,
        default_whatsapp_contact_id: user ? user.id : null,
        default_whatsapp_contact_name: user ? user.name : null,
        default_whatsapp_contact_phone: user ? user.phone : null,
      });
      setLongPressRecipient(user);
      setShowContactPicker(false);

      if (isSharingFromPicker && user?.phone) {
        setIsSharingFromPicker(false);
        // Ask for Tasks to send option first time only if not yet set
        if (!activeList.default_whatsapp_share_scope) {
          pendingContactRef.current = user;
          setShowScopePickerModal(true);
        } else {
          executeShareWithContactAndScope(
            user,
            activeList.default_whatsapp_share_scope as 'pending' | 'all' | 'current_view'
          );
        }
      } else if (!isSharingFromPicker && user) {
        setShowLongPressShareModal(true);
      }
    },
    [activeList, isSharingFromPicker, updateListMutation, executeShareWithContactAndScope]
  );

  const handleChooseTasksToSendScope = useCallback(
    (scope: 'pending' | 'all' | 'current_view') => {
      if (!activeList) return;
      setShareScope(scope);
      updateListMutation.mutate({
        id: activeList.id,
        default_whatsapp_share_scope: scope,
      });
      setShowScopePickerModal(false);

      const contact =
        pendingContactRef.current ||
        (activeList.default_whatsapp_contact_id
          ? users.find((u) => u.id === activeList.default_whatsapp_contact_id)
          : null) ||
        (activeList.default_whatsapp_contact_phone
          ? { name: activeList.default_whatsapp_contact_name || 'Contact', phone: activeList.default_whatsapp_contact_phone }
          : null);

      pendingContactRef.current = null;

      if (contact?.phone) {
        executeShareWithContactAndScope(contact, scope);
      }
    },
    [activeList, users, updateListMutation, executeShareWithContactAndScope]
  );

  const handleSelectShareScope = useCallback(
    (scope: 'pending' | 'all' | 'current_view') => {
      setShareScope(scope);
      if (activeList) {
        updateListMutation.mutate({
          id: activeList.id,
          default_whatsapp_share_scope: scope,
        });
      }
    },
    [activeList, updateListMutation]
  );

  const handleLongPressWhatsApp = useCallback(() => {
    if (!activeList) return;
    const initialScope = (activeList.default_whatsapp_share_scope as 'pending' | 'all' | 'current_view') || 'pending';
    setShareScope(initialScope);

    let recipient: User | null = null;
    if (activeList.default_whatsapp_contact_id) {
      recipient = users.find((u) => u.id === activeList.default_whatsapp_contact_id) || null;
    } else {
      const assignedUserIds = tasks
        .map((t) => t.assigned_to_user_id)
        .filter((id): id is number => typeof id === 'number' && id > 0);
      const uniqueAssignees = Array.from(new Set(assignedUserIds));
      if (tasks.length > 0 && uniqueAssignees.length === 1) {
        recipient = users.find((u) => u.id === uniqueAssignees[0]) || null;
      }
    }
    setLongPressRecipient(recipient);
    setShowLongPressShareModal(true);
  }, [activeList, users, tasks]);

  const deleteTaskMutation = useDeleteTaskMutation();

  const handleTaskLongPress = useCallback((task: Task) => {
    if (!isMultiSelectMode) {
      startMultiSelectWithTask(task.id);
    } else {
      toggleSelectTaskForBatch(task.id);
    }
  }, [isMultiSelectMode, startMultiSelectWithTask, toggleSelectTaskForBatch]);

  // Bulk Actions
  const handleBulkShare = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
    if (selectedTasks.length === 0) return;

    const message = formatBatchTasksMessage(selectedTasks);
    const defaultUser = activeList?.default_whatsapp_contact_id
      ? users.find((u) => u.id === activeList.default_whatsapp_contact_id)
      : null;
    const firstWithPhone = selectedTasks.find((t) => t.assignee_phone);
    const phone = defaultUser?.phone || activeList?.default_whatsapp_contact_phone || firstWithPhone?.assignee_phone || '';
    const waLink = generateWhatsAppWebLink(phone, message);
    Linking.openURL(waLink).catch(() => {
      showAlertDialog('Error', 'Unable to open WhatsApp on this device');
    });
  }, [selectedTaskIds, tasks, activeList, users, showAlertDialog]);

  const handleBulkComplete = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
    const allCompleted = selectedTasks.every((t) => t.is_completed);
    const newStatus = allCompleted ? 0 : 1;

    for (const taskId of selectedTaskIds) {
      updateTaskMutation.mutate({ id: taskId, is_completed: newStatus });
    }
    clearSelectedBatchTasks();
  }, [selectedTaskIds, tasks, updateTaskMutation, clearSelectedBatchTasks]);

  const handleBulkImportant = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
    const allImportant = selectedTasks.every((t) => t.is_important);
    const newStatus = allImportant ? 0 : 1;

    for (const taskId of selectedTaskIds) {
      updateTaskMutation.mutate({ id: taskId, is_important: newStatus });
    }
    clearSelectedBatchTasks();
  }, [selectedTaskIds, tasks, updateTaskMutation, clearSelectedBatchTasks]);

  const handleBulkDueDate = useCallback((dueDate: string | null) => {
    if (selectedTaskIds.length === 0) return;
    for (const taskId of selectedTaskIds) {
      updateTaskMutation.mutate({ id: taskId, due_date: dueDate });
    }
    clearSelectedBatchTasks();
  }, [selectedTaskIds, updateTaskMutation, clearSelectedBatchTasks]);

  const handleBulkAssignee = useCallback((userId: number | null) => {
    if (selectedTaskIds.length === 0) return;
    for (const taskId of selectedTaskIds) {
      updateTaskMutation.mutate({ id: taskId, assigned_to_user_id: userId });
    }
    clearSelectedBatchTasks();
  }, [selectedTaskIds, updateTaskMutation, clearSelectedBatchTasks]);

  const handleBulkDelete = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    showConfirmDialog({
      title: 'Delete Tasks',
      message: `Are you sure you want to delete ${selectedTaskIds.length} selected ${selectedTaskIds.length === 1 ? 'task' : 'tasks'}?`,
      type: 'danger',
      confirmLabel: 'Delete Tasks',
      onConfirm: () => {
        for (const taskId of selectedTaskIds) {
          deleteTaskMutation.mutate(taskId);
        }
        clearSelectedBatchTasks();
      },
    });
  }, [selectedTaskIds, deleteTaskMutation, clearSelectedBatchTasks, showConfirmDialog]);

  const handleExecuteLongPressShare = useCallback(() => {
    if (!activeList) return;

    let targetTasks: Task[] = [];
    if (shareScope === 'pending') {
      targetTasks = tasks.filter((t) => !t.is_completed);
    } else if (shareScope === 'all') {
      targetTasks = tasks;
    } else {
      targetTasks = filteredTasks;
    }

    if (targetTasks.length === 0) {
      showAlertDialog('No Tasks', 'There are no tasks matching the selected filter.');
      return;
    }

    const message = formatWholeListMessage(activeList, targetTasks, { scope: shareScope });
    setShowLongPressShareModal(false);

    const recipientPhone = longPressRecipient?.phone || activeList.default_whatsapp_contact_phone;
    if (recipientPhone) {
      openWhatsAppWithMessage(recipientPhone, message);
    } else {
      setIsSharingFromPicker(true);
      setShowContactPicker(true);
    }
  }, [activeList, shareScope, tasks, filteredTasks, longPressRecipient, openWhatsAppWithMessage]);

  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const renderItem = useCallback(({ item }: { item: Task }) => {
    const isCheckedForBatch = selectedTaskIds.includes(item.id);
    return (
      <TaskItem
        task={item}
        isDarkMode={isDarkMode}
        isMultiSelectMode={isMultiSelectMode}
        isCheckedForBatch={isCheckedForBatch}
        themePrimary={themePrimary}
        onPress={handleTaskPress}
        onLongPress={handleTaskLongPress}
        onToggleComplete={handleToggleComplete}
        onToggleImportant={handleToggleImportant}
      />
    );
  }, [selectedTaskIds, isDarkMode, isMultiSelectMode, themePrimary, handleTaskPress, handleTaskLongPress, handleToggleComplete, handleToggleImportant]);

  const ListHeader = useMemo(() => (
    <View style={{ paddingTop: 4, paddingBottom: 14 }}>
      {/* Search & Filters Row OR Contextual Bulk Actions Bar */}
      {isMultiSelectMode && selectedTaskIds.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 52,
            backgroundColor: isDarkMode ? '#1e293b' : '#0f172a',
            borderRadius: 16,
            paddingHorizontal: 12,
            marginTop: 6,
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#1e293b',
          }}
        >
          {/* Left: Close & Count */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={clearSelectedBatchTasks}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} color="#ffffff" />
            </TouchableOpacity>
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>
              {selectedTaskIds.length} Selected
            </Text>
          </View>

          {/* Right: 6 Action Icons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Share Together */}
            <TouchableOpacity
              onPress={handleBulkShare}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#25D366',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WhatsAppIcon size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Mark Complete */}
            <TouchableOpacity
              onPress={handleBulkComplete}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Mark Important */}
            <TouchableOpacity
              onPress={handleBulkImportant}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Star size={18} color="#f59e0b" fill="#f59e0b" />
            </TouchableOpacity>

            {/* Assign Due Date */}
            <TouchableOpacity
              onPress={() => setShowBulkDueModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Assign Assignee */}
            <TouchableOpacity
              onPress={() => setShowBulkAssigneeModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Delete All */}
            <TouchableOpacity
              onPress={handleBulkDelete}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Search Bar & Filters Button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                height: 52,
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                paddingHorizontal: 14,
              }}
            >
              <Search size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginRight: 10 }} />
              <TextInput
                placeholder="Search"
                placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  height: '100%',
                  fontSize: 15,
                  fontWeight: '600',
                  color: isDarkMode ? '#ffffff' : '#0f172a',
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ padding: 4 }}
                >
                  <X size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.7}
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: activeFiltersCount > 0 ? themePrimary : (isDarkMode ? '#18181b' : '#ffffff'),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: activeFiltersCount > 0 ? themePrimary : (isDarkMode ? '#27272a' : '#e2e8f0'),
              }}
            >
              <SlidersHorizontal size={20} color={activeFiltersCount > 0 ? '#ffffff' : (isDarkMode ? '#ffffff' : '#0f172a')} />
              {activeFiltersCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#f59e0b',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: isDarkMode ? '#09090b' : '#f8fafc',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Sort Trigger Button - 52x52px Touch Target */}
            <TouchableOpacity
              onPress={() => setShowSortModal(true)}
              activeOpacity={0.7}
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: currentSort.field !== 'smart' ? themePrimary : (isDarkMode ? '#18181b' : '#ffffff'),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: currentSort.field !== 'smart' ? themePrimary : (isDarkMode ? '#27272a' : '#e2e8f0'),
              }}
            >
              <ArrowUpDown size={20} color={currentSort.field !== 'smart' ? '#ffffff' : (isDarkMode ? '#ffffff' : '#0f172a')} />
              {currentSort.field !== 'smart' && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: '#f59e0b',
                    borderWidth: 2,
                    borderColor: isDarkMode ? '#09090b' : '#f8fafc',
                  }}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Active Filter & Sort Indicator Chips */}
          {(activeFiltersCount > 0 || currentSort.field !== 'smart') && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {currentSort.field !== 'smart' && (
                <TouchableOpacity
                  onPress={() => setShowSortModal(true)}
                  activeOpacity={0.7}
                  style={{ minHeight: 32, backgroundColor: hexToRgba(themePrimary, 0.12), paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: themePrimary }}>
                    Sort: {getSortDisplayLabel(currentSort)}
                  </Text>
                </TouchableOpacity>
              )}
              {filterStatus !== 'all' && (
                <View style={{ minHeight: 32, backgroundColor: hexToRgba(themePrimary, 0.12), paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: themePrimary }}>Status: {filterStatus}</Text>
                </View>
              )}
              {filterImportance !== 'all' && (
                <View style={{ minHeight: 32, backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#f59e0b' }}>{filterImportance}</Text>
                </View>
              )}
              {filterDue !== 'all' && (
                <View style={{ minHeight: 32, backgroundColor: hexToRgba(themePrimary, 0.12), paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: themePrimary }}>Due: {filterDue}</Text>
                </View>
              )}
              {activeFiltersCount > 0 && (
                <TouchableOpacity
                  onPress={handleResetFilters}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <RotateCcw size={12} color="#ef4444" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </View>
  ), [
    isMultiSelectMode,
    selectedTaskIds,
    isDarkMode,
    themePrimary,
    clearSelectedBatchTasks,
    handleBulkShare,
    handleBulkComplete,
    handleBulkImportant,
    handleBulkDelete,
    searchQuery,
    activeFiltersCount,
    currentSort,
    filterStatus,
    filterImportance,
    filterDue,
    handleResetFilters,
  ]);

  const ListEmpty = useMemo(() => {
    if (completedTasks.length > 0) return null;
    const isFiltered = searchQuery.trim().length > 0 || activeFiltersCount > 0;
    return (
      <View
        style={{
          padding: 40,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
          marginTop: 8,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 20,
            backgroundColor: hexToRgba(themePrimary, 0.1),
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Sparkles size={28} color={themePrimary} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
          {isFiltered ? 'No matching tasks' : 'No tasks yet in this list'}
        </Text>
        <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 4, textAlign: 'center' }}>
          {isFiltered ? 'Try adjusting your search or filters.' : 'Tap the + button below to create your first task in this list.'}
        </Text>
      </View>
    );
  }, [completedTasks.length, searchQuery, activeFiltersCount, isDarkMode, themePrimary]);

  const ListFooter = useMemo(() => {
    if (completedTasks.length === 0) return <View style={{ height: 30 }} />;
    return (
      <View style={{ marginTop: 12, paddingBottom: 30 }}>
        <TouchableOpacity
          onPress={() => setShowCompleted(!showCompleted)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 10,
            paddingHorizontal: 4,
            marginBottom: 6,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: isDarkMode ? '#a1a1aa' : '#64748b',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            Completed ({completedTasks.length})
          </Text>
          {showCompleted ? (
            <ChevronDown size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
          ) : (
            <ChevronRight size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
          )}
        </TouchableOpacity>

        {showCompleted && (
          <View>
            {completedTasks.map((task) => (
              <CompletedTaskItem
                key={task.id}
                task={task}
                isDarkMode={isDarkMode}
                themePrimary={themePrimary}
                isMultiSelectMode={isMultiSelectMode}
                isCheckedForBatch={selectedTaskIds.includes(task.id)}
                onPress={handleTaskPress}
                onLongPress={handleTaskLongPress}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </View>
        )}
      </View>
    );
  }, [completedTasks, isDarkMode, showCompleted, themePrimary, isMultiSelectMode, selectedTaskIds, handleTaskPress, handleTaskLongPress, handleToggleComplete]);

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#09090b' : '#f8fafc', paddingTop: topInset }}>
      {/* Top Header Bar with Navigation and Actions */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#27272a' : '#e2e8f0',
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
          }}
        >
          <ArrowLeft size={20} color={isDarkMode ? '#ffffff' : '#0f172a'} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleOpenEditTitle}
          activeOpacity={0.7}
          style={{ flex: 1, alignItems: 'center', marginHorizontal: 8 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '90%' }}>
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 4.5,
                backgroundColor: themePrimary,
              }}
            />
            <Text
              style={{
                fontSize: 17,
                fontWeight: '800',
                color: isDarkMode ? '#ffffff' : '#0f172a',
              }}
              numberOfLines={1}
            >
              {activeList?.title || 'List Details'}
            </Text>
            <Pencil size={12} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginLeft: 2, opacity: 0.8 }} />
          </View>
          <View
            style={{
              backgroundColor: isDarkMode ? hexToRgba(themePrimary, 0.18) : hexToRgba(themePrimary, 0.1),
              paddingHorizontal: 8,
              paddingVertical: 1.5,
              borderRadius: 10,
              marginTop: 2,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: themePrimary,
              }}
            >
              {pendingTasks.length} {pendingTasks.length === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {activeList && (
            <TouchableOpacity
              onPress={() => setShowMoreMenu(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
              }}
            >
              <MoreVertical size={18} color={isDarkMode ? '#ffffff' : '#0f172a'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main FlatList */}
      <FlatList
        data={pendingTasks}
        keyExtractor={(task) => String(task.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={30}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themePrimary}
            colors={[themePrimary]}
            progressBackgroundColor={isDarkMode ? '#18181b' : '#ffffff'}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {/* Floating Action Button (FAB) for WhatsApp Share (above Add New Task) */}
      {tasks.length > 0 && (
        <TouchableOpacity
          onPress={handleWhatsAppList}
          onLongPress={handleLongPressWhatsApp}
          delayLongPress={350}
          activeOpacity={0.85}
          style={{
            position: 'absolute',
            bottom: 82,
            right: 23,
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: '#25D366',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#25D366',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 6,
            zIndex: 40,
          }}
        >
          <WhatsAppIcon size={26} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Floating Action Button (FAB) for Adding New Task */}
      <TouchableOpacity
        onPress={handleOpenNewTask}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: gradientColors[0] || '#0078d4',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
          zIndex: 40,
        }}
      >
        <Plus size={28} color="#ffffff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* 3-Dot Dropdown Menu Modal */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="none"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            paddingTop: topInset + 56,
            paddingRight: 16,
            alignItems: 'flex-end',
          }}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowMoreMenu(false)}
          />
          <View
            style={{
              width: 230,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderRadius: 18,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 10,
            }}
          >
            {/* Option 1: Default WhatsApp Contact */}
            <TouchableOpacity
              onPress={() => {
                setShowMoreMenu(false);
                setIsSharingFromPicker(false);
                setShowContactPicker(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              activeOpacity={0.7}
            >
              <WhatsAppIcon size={18} color="#25D366" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  WhatsApp Contact
                </Text>
                {defaultContact ? (
                  <Text style={{ fontSize: 11, color: '#25D366', fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
                    {defaultContact.name}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#71717a' : '#94a3b8', fontWeight: '600', marginTop: 1 }}>
                    Not set
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginVertical: 4 }} />

            {/* Option 2: Tasks to Send Scope */}
            <TouchableOpacity
              onPress={() => {
                setShowMoreMenu(false);
                setShowScopePickerModal(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              activeOpacity={0.7}
            >
              <ListTodo size={18} color="#0078d4" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  Tasks to Send
                </Text>
                <Text style={{ fontSize: 11, color: '#0078d4', fontWeight: '700', marginTop: 1 }}>
                  {activeList?.default_whatsapp_share_scope === 'all'
                    ? 'All Tasks'
                    : activeList?.default_whatsapp_share_scope === 'current_view'
                    ? 'Current View'
                    : activeList?.default_whatsapp_share_scope === 'pending'
                    ? 'Pending Tasks'
                    : 'Not set (Ask on send)'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginVertical: 4 }} />

            {/* Option 2: Rename List */}
            <TouchableOpacity
              onPress={() => {
                setShowMoreMenu(false);
                handleOpenEditTitle();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              activeOpacity={0.7}
            >
              <Pencil size={18} color={themePrimary} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                Rename List
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginVertical: 4 }} />

            {/* Option 3: Change Theme */}
            <TouchableOpacity
              onPress={() => {
                setShowMoreMenu(false);
                setShowThemePicker(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              activeOpacity={0.7}
            >
              <Palette size={18} color={themePrimary} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                Change Theme
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginVertical: 4 }} />

            {/* Option 4: Delete List */}
            <TouchableOpacity
              onPress={() => {
                setShowMoreMenu(false);
                handleDeleteList();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color="#ef4444" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>
                Delete List
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit List Name Modal */}
      <Modal
        visible={showEditTitleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditTitleModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowEditTitleModal(false)}
          />
          <View
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
              elevation: 12,
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: isDarkMode ? hexToRgba(themePrimary, 0.2) : hexToRgba(themePrimary, 0.12),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pencil size={18} color={themePrimary} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  Rename List
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEditTitleModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Input field */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                paddingHorizontal: 14,
                marginBottom: 20,
              }}
            >
              <TextInput
                value={editListTitle}
                onChangeText={setEditListTitle}
                placeholder="List name"
                placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                autoFocus
                selectTextOnFocus
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={handleSaveListTitle}
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: '600',
                  color: isDarkMode ? '#ffffff' : '#0f172a',
                  paddingVertical: 14,
                }}
              />
              {editListTitle.length > 0 && (
                <TouchableOpacity
                  onPress={() => setEditListTitle('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ padding: 4 }}
                >
                  <X size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                </TouchableOpacity>
              )}
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowEditTitleModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#d4d4d8' : '#475569' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveListTitle}
                disabled={!editListTitle.trim()}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: editListTitle.trim() ? themePrimary : (isDarkMode ? '#3f3f46' : '#cbd5e1'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Picker Modal */}
      <Modal
        visible={showThemePicker}
        transparent
        animationType="none"
        onRequestClose={() => setShowThemePicker(false)}
      >
        <View
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowThemePicker(false)}
          />
          <View
            style={{
              width: '100%',
              maxWidth: 360,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderRadius: 28,
              padding: 22,
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                List Theme
              </Text>
              <TouchableOpacity onPress={() => setShowThemePicker(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Segmented Tab: 10 Modern Presets vs Custom Color */}
            <View style={{ flexDirection: 'row', backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderRadius: 14, padding: 3, marginBottom: 18 }}>
              <TouchableOpacity
                onPress={() => setActiveThemeTab('palette')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 11,
                  alignItems: 'center',
                  backgroundColor: activeThemeTab === 'palette' ? (isDarkMode ? '#3f3f46' : '#ffffff') : 'transparent',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: activeThemeTab === 'palette' ? 0.1 : 0,
                  shadowRadius: 2,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: activeThemeTab === 'palette' ? (isDarkMode ? '#ffffff' : '#0f172a') : (isDarkMode ? '#a1a1aa' : '#64748b') }}>
                  Curated (10)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setActiveThemeTab('custom');
                  if (activeList?.color_theme?.startsWith('#')) {
                    setCustomColorHex(activeList.color_theme);
                  }
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 11,
                  alignItems: 'center',
                  backgroundColor: activeThemeTab === 'custom' ? (isDarkMode ? '#3f3f46' : '#ffffff') : 'transparent',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: activeThemeTab === 'custom' ? 0.1 : 0,
                  shadowRadius: 2,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: activeThemeTab === 'custom' ? (isDarkMode ? '#ffffff' : '#0f172a') : (isDarkMode ? '#a1a1aa' : '#64748b') }}>
                  Custom Color
                </Text>
              </TouchableOpacity>
            </View>

            {activeThemeTab === 'palette' ? (
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>
                  Select Palette
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                  {THEME_COLORS.map((c) => {
                    const paletteDef = THEME_PALETTES[c];
                    const isSelected = activeList?.color_theme?.toLowerCase() === c.toLowerCase();
                    const colorHex = isDarkMode ? paletteDef?.darkPrimary : paletteDef?.primary;

                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => handleUpdateTheme(c)}
                        activeOpacity={0.8}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          backgroundColor: colorHex,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: isSelected ? 3 : 0,
                          borderColor: '#ffffff',
                          shadowColor: colorHex,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: isSelected ? 0.5 : 0.2,
                          shadowRadius: 6,
                          elevation: isSelected ? 5 : 2,
                        }}
                      >
                        {isSelected && <Check size={20} color="#ffffff" strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>
                  Quick Accents
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
                  {PRESET_CUSTOM_COLORS.map((hex) => {
                    const isSelected = activeList?.color_theme?.toLowerCase() === hex.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={hex}
                        onPress={() => {
                          setCustomColorHex(hex);
                          handleUpdateTheme(hex);
                        }}
                        activeOpacity={0.8}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: hex,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: isSelected ? 3 : 0,
                          borderColor: '#ffffff',
                          shadowColor: hex,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isSelected ? 0.5 : 0.2,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        {isSelected && <Check size={16} color="#ffffff" strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
                  Hex Color Code
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(customColorHex) ? customColorHex : (isDarkMode ? '#27272a' : '#e2e8f0'),
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#3f3f46' : '#cbd5e1',
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      height: 46,
                      backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                    }}
                  >
                    <TextInput
                      placeholder="#3B82F6"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                      value={customColorHex}
                      onChangeText={(t) => {
                        let val = t.trim();
                        if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                        setCustomColorHex(val);
                      }}
                      maxLength={7}
                      autoCapitalize="characters"
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: '700',
                        color: isDarkMode ? '#ffffff' : '#0f172a',
                      }}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (/^#[0-9A-Fa-f]{6}$/.test(customColorHex)) {
                        handleUpdateTheme(customColorHex);
                      } else {
                        showAlertDialog('Invalid Color', 'Please enter a valid 6-digit hex code (e.g. #8B5CF6)');
                      }
                    }}
                    disabled={!/^#[0-9A-Fa-f]{6}$/.test(customColorHex)}
                    style={{
                      backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(customColorHex) ? customColorHex : (isDarkMode ? '#3f3f46' : '#cbd5e1'),
                      paddingHorizontal: 14,
                      height: 46,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Task Filters Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterImportance={filterImportance}
        setFilterImportance={setFilterImportance}
        filterDue={filterDue}
        setFilterDue={setFilterDue}
        filterAssigneeId={filterAssigneeId}
        setFilterAssigneeId={setFilterAssigneeId}
        users={users}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={handleResetFilters}
        totalMatchedTasks={filteredTasks.length}
        hideList={true}
      />

      {/* Default WhatsApp Contact Picker Modal */}
      <Modal
        visible={showContactPicker}
        transparent
        animationType="none"
        onRequestClose={() => {
          setShowContactPicker(false);
          setIsSharingFromPicker(false);
        }}
      >
        <View
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setShowContactPicker(false);
              setIsSharingFromPicker(false);
            }}
          />
          <View
            style={{
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: Math.max(insets.bottom, 24),
              maxHeight: '80%',
              borderTopWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  Default WhatsApp Contact
                </Text>
                <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                  {isSharingFromPicker
                    ? 'Select a contact to share with and save as default'
                    : 'Choose who receives updates for this list'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowContactPicker(false);
                  setIsSharingFromPicker(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                height: 46,
                backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                borderRadius: 14,
                paddingHorizontal: 12,
                marginVertical: 12,
              }}
            >
              <Search size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search contacts..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                value={contactPickerSearch}
                onChangeText={setContactPickerSearch}
                style={{
                  flex: 1,
                  height: '100%',
                  fontSize: 14,
                  fontWeight: '600',
                  color: isDarkMode ? '#ffffff' : '#0f172a',
                }}
              />
              {contactPickerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setContactPickerSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={14} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                </TouchableOpacity>
              )}
            </View>

            {/* Contacts List */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
              {/* Option to clear default */}
              {activeList?.default_whatsapp_contact_id && (
                <TouchableOpacity
                  onPress={() => handleSelectDefaultContact(null)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    marginBottom: 8,
                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>
                    ✕ Clear Default Contact
                  </Text>
                </TouchableOpacity>
              )}

              {/* WhatsApp Group Option */}
              <TouchableOpacity
                onPress={() => {
                  setShowContactPicker(false);
                  setShowGroupModal(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: defaultContact?.is_group
                    ? (isDarkMode ? 'rgba(37, 211, 102, 0.22)' : '#ecfdf5')
                    : (isDarkMode ? '#27272a' : '#f8fafc'),
                  borderWidth: 1.5,
                  borderColor: defaultContact?.is_group ? '#25D366' : (isDarkMode ? '#3f3f46' : '#cbd5e1'),
                  marginBottom: 8,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.25)' : '#dcfce7',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users size={18} color="#25D366" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        WhatsApp Group
                      </Text>
                      <View style={{ backgroundColor: 'rgba(37, 211, 102, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#25D366' }}>Group</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 1 }}>
                      {defaultContact?.is_group ? `Selected: ${defaultContact.name}` : 'Set a WhatsApp Group as default'}
                    </Text>
                  </View>
                </View>
                {Boolean(defaultContact?.is_group) && <Check size={18} color="#25D366" strokeWidth={3} />}
              </TouchableOpacity>

              {filteredContacts.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: isDarkMode ? '#71717a' : '#94a3b8' }}>
                    No contacts found
                  </Text>
                </View>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = activeList?.default_whatsapp_contact_id === contact.id;
                  return (
                    <TouchableOpacity
                      key={contact.id}
                      onPress={() => handleSelectDefaultContact(contact)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        backgroundColor: isSelected
                          ? (isDarkMode ? 'rgba(37, 211, 102, 0.15)' : '#f0fdf4')
                          : (isDarkMode ? '#27272a' : '#f8fafc'),
                        borderWidth: 1,
                        borderColor: isSelected ? '#25D366' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                        marginBottom: 8,
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: isSelected ? '#25D366' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {contact.is_group ? (
                            <Users size={18} color={isSelected ? '#ffffff' : '#25D366'} />
                          ) : (
                            <Text style={{ fontSize: 14, fontWeight: '800', color: isSelected ? '#ffffff' : (isDarkMode ? '#ffffff' : '#0f172a') }}>
                              {contact.name.charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }} numberOfLines={1}>
                              {contact.name}
                            </Text>
                            {Boolean(contact.is_group) && (
                              <View style={{ backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.2)' : '#dcfce7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#25D366' }}>Group</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 1 }}>
                            {contact.is_group ? 'WhatsApp Group' : (contact.phone || 'No phone')}
                          </Text>
                        </View>
                      </View>

                      {isSelected && (
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: '#25D366',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={14} color="#ffffff" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tasks to Send (Share Scope) Modal - First Time Setup */}
      <Modal
        visible={showScopePickerModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowScopePickerModal(false)}
      >
        <View
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowScopePickerModal(false)}
          />
          <View
            style={{
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: Math.max(insets.bottom, 24),
              borderTopWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  Tasks to Send
                </Text>
                <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                  Choose which tasks to include when sharing this list on WhatsApp
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowScopePickerModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Scope Options */}
            <View style={{ gap: 10, marginTop: 6 }}>
              {/* Option 1: Pending tasks */}
              <TouchableOpacity
                onPress={() => handleChooseTasksToSendScope('pending')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: 'rgba(0, 120, 212, 0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ListTodo size={20} color="#0078d4" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        Pending Tasks
                      </Text>
                      <View style={{ backgroundColor: 'rgba(0, 120, 212, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#0078d4' }}>DEFAULT</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                      Only incomplete tasks in this list
                    </Text>
                  </View>
                </View>
                <View style={{ backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                    {pendingTasks.length}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: All tasks */}
              <TouchableOpacity
                onPress={() => handleChooseTasksToSendScope('all')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: 'rgba(37, 211, 102, 0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckSquare size={20} color="#25D366" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                      All Tasks
                    </Text>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                      Both pending and completed tasks
                    </Text>
                  </View>
                </View>
                <View style={{ backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                    {tasks.length}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Current view tasks */}
              <TouchableOpacity
                onPress={() => handleChooseTasksToSendScope('current_view')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SlidersHorizontal size={20} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                      Current View Tasks
                    </Text>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                      Tasks matching current search & filters
                    </Text>
                  </View>
                </View>
                <View style={{ backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                    {filteredTasks.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Long Press WhatsApp Share Dialog */}
      <Modal
        visible={showLongPressShareModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowLongPressShareModal(false)}
      >
        <View
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowLongPressShareModal(false)}
          />
          <View
            style={{
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: Math.max(insets.bottom, 24),
              borderTopWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  Share on WhatsApp
                </Text>
                <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                  Customize recipient and tasks to send
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLongPressShareModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Section 1: Recipient Contact */}
            <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
              Recipient Contact
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowLongPressShareModal(false);
                setIsSharingFromPicker(false);
                setShowContactPicker(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                borderRadius: 16,
                backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                borderWidth: 1,
                borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                marginBottom: 18,
              }}
              activeOpacity={0.7}
            >
              {longPressRecipient ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: 'rgba(37, 211, 102, 0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#25D366' }}>
                      {longPressRecipient.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }} numberOfLines={1}>
                      {longPressRecipient.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 1 }}>
                      {longPressRecipient.phone}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Phone size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                    Tap to choose recipient contact
                  </Text>
                </View>
              )}

              <View
                style={{
                  backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  {longPressRecipient ? 'Change' : 'Select'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Section 2: Task Status Filter */}
            <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
              Tasks to Send
            </Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {/* Option 1: Pending tasks (Default) */}
              <TouchableOpacity
                onPress={() => handleSelectShareScope('pending')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: shareScope === 'pending'
                    ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                    : (isDarkMode ? '#27272a' : '#f8fafc'),
                  borderWidth: 1.5,
                  borderColor: shareScope === 'pending' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  {shareScope === 'pending' ? (
                    <CheckCircle2 size={20} color="#0078d4" />
                  ) : (
                    <Circle size={20} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        Pending Tasks
                      </Text>
                      <View style={{ backgroundColor: 'rgba(0, 120, 212, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#0078d4' }}>DEFAULT</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                      Only incomplete tasks in this list
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: shareScope === 'pending' ? '#0078d4' : (isDarkMode ? '#a1a1aa' : '#64748b') }}>
                  {pendingTasks.length}
                </Text>
              </TouchableOpacity>

              {/* Option 2: All tasks */}
              <TouchableOpacity
                onPress={() => handleSelectShareScope('all')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: shareScope === 'all'
                    ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                    : (isDarkMode ? '#27272a' : '#f8fafc'),
                  borderWidth: 1.5,
                  borderColor: shareScope === 'all' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  {shareScope === 'all' ? (
                    <CheckCircle2 size={20} color="#0078d4" />
                  ) : (
                    <Circle size={20} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                      All Tasks
                    </Text>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                      Both pending and completed tasks
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: shareScope === 'all' ? '#0078d4' : (isDarkMode ? '#a1a1aa' : '#64748b') }}>
                  {tasks.length}
                </Text>
              </TouchableOpacity>

              {/* Option 3: Current view tasks */}
              <TouchableOpacity
                onPress={() => handleSelectShareScope('current_view')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: shareScope === 'current_view'
                    ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                    : (isDarkMode ? '#27272a' : '#f8fafc'),
                  borderWidth: 1.5,
                  borderColor: shareScope === 'current_view' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  {shareScope === 'current_view' ? (
                    <CheckCircle2 size={20} color="#0078d4" />
                  ) : (
                    <Circle size={20} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                      Current View Tasks
                    </Text>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                      All tasks matching current search & filters
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: shareScope === 'current_view' ? '#0078d4' : (isDarkMode ? '#a1a1aa' : '#64748b') }}>
                  {filteredTasks.length}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action CTA Button */}
            <TouchableOpacity
              onPress={handleExecuteLongPressShare}
              style={{
                backgroundColor: '#25D366',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingVertical: 14,
                borderRadius: 16,
                shadowColor: '#25D366',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
              activeOpacity={0.85}
            >
              <WhatsAppIcon size={20} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>
                Share to WhatsApp ({shareScope === 'pending' ? pendingTasks.length : shareScope === 'all' ? tasks.length : filteredTasks.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        currentSort={currentSort}
        onSelectSort={handleSelectSort}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
        viewTitle={activeList?.title}
      />

      {/* Bulk Due Date Picker Modal */}
      <BulkDueDatePickerModal
        visible={showBulkDueModal}
        selectedCount={selectedTaskIds.length}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
        onClose={() => setShowBulkDueModal(false)}
        onSelectDueDate={handleBulkDueDate}
      />

      {/* Bulk Assignee Picker Modal */}
      <BulkAssigneePickerModal
        visible={showBulkAssigneeModal}
        selectedCount={selectedTaskIds.length}
        users={users}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
        onClose={() => setShowBulkAssigneeModal(false)}
        onSelectAssignee={handleBulkAssignee}
        onCreateGroup={handleCreateGroup}
      />

      {/* WhatsApp Group Selection & Creation Modal */}
      <WhatsAppGroupModal
        visible={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onSelectGroup={(group) => {
          handleSelectDefaultContact(group);
        }}
        onCreateGroup={handleCreateGroup}
        existingGroups={existingGroups}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
      />

      {/* 300ms Task Loading HUD */}
      <TaskLoadingIndicator />
    </View>
  );
}

export default SingleListView;
