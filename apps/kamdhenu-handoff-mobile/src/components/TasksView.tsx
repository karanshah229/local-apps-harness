import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
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
  TouchableWithoutFeedback,
  Image,
  RefreshControl,
  Alert,
  Linking,
  BackHandler,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
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
  ListTodo,
  User as UserIcon,
  CheckSquare,
  Trash2,
  UserCheck,
  CheckCircle2,
  Circle,
  ArrowLeft,
  MoreVertical,
  Pencil,
  Palette,
  Eye,
  Pin,
  PinOff,
  Layers,
  Users,
  Phone,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUiStore } from '../store/useUiStore';
import { ListOrViewDropdownModal } from './ListOrViewDropdownModal';
import { WhatsAppFormatBottomSheet, WhatsAppFormatOptions } from './WhatsAppFormatBottomSheet';
import { ContactPickerModal, WHATSAPP_GROUP_USER, SELF_USER } from './ContactPickerModal';
import {
  useTasksQuery,
  useListsQuery,
  useUsersQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useUpdateUserPreferencesMutation,
  useAddUserMutation,
  useUpdateUserMutation,
  useCustomViewQuery,
  useUpdateCustomViewMutation,
  useDeleteCustomViewMutation,
  usePinnedViewsQuery,
  useTogglePinViewMutation,
  prefetchAllTasksInView,
} from '../hooks/useTodoQueries';
import { useTaskNavigation } from '../hooks/useTaskNavigation';
import {
  Task,
  User,
  List,
  CustomView,
  ViewFilterConfig,
  DEFAULT_FILTER_CONFIG,
  THEME_PALETTES,
  CUSTOM_LIST_THEMES,
  ThemeColor,
  getThemeGradient,
  getThemePrimary,
  ViewSortConfig,
  DEFAULT_SORT_CONFIG,
  sortTasks,
  getSortDisplayLabel,
  formatBatchTasksMessage,
  formatWholeListMessage,
  generateWhatsAppWebLink,
  generateWhatsAppDeepLink,
  fuzzyMatch,
  getSearchMatchScore,
  getMultiFieldSearchScore,
  formatDueDateDisplay,
  formatDueDateDDMMYY,
  isTaskOverdue,
  WhatsAppMessageStyle,
} from '@shared/todo';
import { SortModal } from './SortModal';
import { FilterBottomSheet } from './FilterBottomSheet';
import { WhatsAppIcon } from './WhatsAppIcon';
import { BulkDueDatePickerModal } from './BulkDueDatePickerModal';
import { BulkAssigneePickerModal } from './BulkAssigneePickerModal';
import { BulkListPickerModal } from './BulkListPickerModal';

function hexToRgba(hex: string, alpha: number): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((char) => char + char).join('');
  }
  if (cleanHex.length !== 6) return `rgba(0, 120, 212, ${alpha})`;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface TasksViewProps {
  fixedView?: 'all-tasks' | 'important' | 'assigned-to-me';
  fixedCustomViewId?: number | null;
  onBack?: () => void;
}

interface TaskItemProps {
  task: Task;
  isDarkMode: boolean;
  themePrimary: string;
  isMultiSelectMode: boolean;
  isCheckedForBatch: boolean;
  onPress: (task: Task) => void;
  onLongPress: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleImportant: (task: Task) => void;
}

const TaskItem = React.memo(({
  task,
  isDarkMode,
  themePrimary,
  isMultiSelectMode,
  isCheckedForBatch,
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
          ? hexToRgba(themePrimary, isDarkMode ? 0.2 : 0.08)
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

          {(task.due_date || (task.lists && task.lists.length > 0)) && (
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
              {task.lists?.map((l) => {
                const listColor = getThemePrimary((l as any).color_theme || (l as any).theme_color, isDarkMode);
                return (
                  <View
                    key={l.id}
                    style={{
                      backgroundColor: hexToRgba(listColor, isDarkMode ? 0.2 : 0.12),
                      paddingHorizontal: 7,
                      paddingVertical: 2.5,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: listColor }}>{l.title}</Text>
                  </View>
                );
              })}
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
          ? hexToRgba(themePrimary, isDarkMode ? 0.2 : 0.08)
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



export function TasksView({ fixedView, fixedCustomViewId, onBack }: TasksViewProps) {
  const router = useRouter();
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showEditCustomViewModal, setShowEditCustomViewModal] = useState(false);
  const [editViewTitle, setEditViewTitle] = useState('');
  const [editViewTheme, setEditViewTheme] = useState('teal');

  // Custom View WhatsApp & Dropdown States
  const [showCustomViewDropdown, setShowCustomViewDropdown] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactPickerSearch, setContactPickerSearch] = useState('');
  const [showScopePickerModal, setShowScopePickerModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isSharingFromPicker, setIsSharingFromPicker] = useState(false);
  const pendingContactRef = useRef<User | null>(null);

  // Custom View queries
  const customViewQuery = useCustomViewQuery(fixedCustomViewId);
  const customView = customViewQuery.data;
  const updateCustomViewMutation = useUpdateCustomViewMutation();
  const deleteCustomViewMutation = useDeleteCustomViewMutation();
  const updateUserMutation = useUpdateUserMutation();
  const pinnedViewsQuery = usePinnedViewsQuery();
  const pinnedViews = pinnedViewsQuery.data || ['important', 'assigned-to-me'];
  const togglePinViewMutation = useTogglePinViewMutation();
  const isCustomPinned = Boolean(fixedCustomViewId && pinnedViews.includes(`custom_view:${fixedCustomViewId}`));

  // Filter States
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterImportance, setFilterImportance] = useState<'all' | 'important' | 'normal'>('all');
  const [filterDue, setFilterDue] = useState<'all' | 'today' | 'tomorrow' | 'overdue' | 'has_due' | 'no_due'>('all');
  const [filterListId, setFilterListId] = useState<number | 'all'>('all');
  const [filterAssigneeId, setFilterAssigneeId] = useState<number | 'unassigned' | 'all'>('all');

  // Sync filters from customView on load
  useEffect(() => {
    if (fixedCustomViewId && customView) {
      const cfg: ViewFilterConfig = typeof customView.filter_config === 'object' ? customView.filter_config : {};
      setFilterStatus(cfg.status || 'all');
      setFilterImportance(cfg.importance || 'all');
      setFilterDue(cfg.due || 'all');
      setFilterListId(cfg.listId || 'all');
      setFilterAssigneeId(cfg.assigneeId || 'all');
    }
  }, [fixedCustomViewId, customView?.id]);

  const flatListRef = useRef<FlatList>(null);

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
  const activeListId = useUiStore((s) => s.activeListId);
  const storeView = useUiStore((s) => s.activeView);
  const sortPreferences = useUiStore((s) => s.sortPreferences);
  const setViewSort = useUiStore((s) => s.setViewSort);

  const [showBulkDueModal, setShowBulkDueModal] = useState(false);
  const [showBulkAssigneeModal, setShowBulkAssigneeModal] = useState(false);
  const [showBulkListModal, setShowBulkListModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const bulkActionsTriggerRef = useRef<View>(null);
  const [bulkActionsAnchor, setBulkActionsAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [showFormatPickerModal, setShowFormatPickerModal] = useState(false);
  const [showLongPressShareModal, setShowLongPressShareModal] = useState(false);
  const [longPressRecipient, setLongPressRecipient] = useState<User | null>(null);
  const [shareScope, setShareScope] = useState<'pending' | 'all' | 'current_view'>('current_view');
  const defaultWhatsAppStyle = useUiStore((s) => s.defaultWhatsAppStyle);
  const defaultWhatsAppIncludeNotes = useUiStore((s) => s.defaultWhatsAppIncludeNotes);
  const defaultWhatsAppIncludeAssignee = useUiStore((s) => s.defaultWhatsAppIncludeAssignee);
  const defaultWhatsAppIncludeImportant = useUiStore((s) => s.defaultWhatsAppIncludeImportant);
  const defaultWhatsAppIncludeSteps = useUiStore((s) => s.defaultWhatsAppIncludeSteps);
  const defaultWhatsAppIncludeDueDate = useUiStore((s) => s.defaultWhatsAppIncludeDueDate);
  const defaultWhatsAppIncludeListName = useUiStore((s) => s.defaultWhatsAppIncludeListName);
  const hasChosenWhatsAppFormat = useUiStore((s) => s.hasChosenWhatsAppFormat);
  const setHasChosenWhatsAppFormat = useUiStore((s) => s.setHasChosenWhatsAppFormat);
  const { width: windowWidth } = useWindowDimensions();

  const openBulkActions = useCallback(() => {
    bulkActionsTriggerRef.current?.measureInWindow((x, y, width, height) => {
      setBulkActionsAnchor({ x, y, width, height });
      setShowBulkActionsModal(true);
    });
  }, []);

  const effectiveView = fixedCustomViewId ? 'all-tasks' : (fixedView || storeView || 'all-tasks');
  const effectiveListId = (fixedView || fixedCustomViewId) ? null : activeListId;
  const viewKey = fixedCustomViewId ? `custom_view_${fixedCustomViewId}` : (effectiveListId ? `list_${effectiveListId}` : effectiveView);

  // Batch selection is view-local. Clear it when this screen becomes active or changes scope.
  useFocusEffect(useCallback(() => {
    clearSelectedBatchTasks();
  }, [clearSelectedBatchTasks]));
  useEffect(() => {
    clearSelectedBatchTasks();
  }, [viewKey, clearSelectedBatchTasks]);

  const currentSort: ViewSortConfig = useMemo(() => {
    if (fixedCustomViewId && customView?.sort_config) {
      return typeof customView.sort_config === 'object' ? customView.sort_config : DEFAULT_SORT_CONFIG;
    }
    return sortPreferences[viewKey] || DEFAULT_SORT_CONFIG;
  }, [fixedCustomViewId, customView?.sort_config, sortPreferences, viewKey]);

  const updatePrefsMutation = useUpdateUserPreferencesMutation();

  const handleSelectSort = useCallback((config: ViewSortConfig) => {
    if (fixedCustomViewId) {
      updateCustomViewMutation.mutate({ id: fixedCustomViewId, sort_config: config });
    } else {
      setViewSort(viewKey, config);
      const updated = { ...sortPreferences, [viewKey]: config };
      updatePrefsMutation.mutate({ sort_preferences: updated });
    }
  }, [fixedCustomViewId, viewKey, sortPreferences, setViewSort, updatePrefsMutation, updateCustomViewMutation]);

  const listsQuery = useListsQuery(1);
  const usersQuery = useUsersQuery();
  const tasksQuery = useTasksQuery({
    listId: effectiveListId,
    view: effectiveView,
    userId: 1,
  });

  const lists = listsQuery.data || [];
  const users = usersQuery.data || [];
  const tasks = tasksQuery.data || [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        tasksQuery.refetch(),
        listsQuery.refetch(),
        usersQuery.refetch(),
        fixedCustomViewId ? customViewQuery.refetch() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [tasksQuery, listsQuery, usersQuery, fixedCustomViewId, customViewQuery]);

  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const addUserMutation = useAddUserMutation();
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

  // Handle updating and autosaving filter changes
  const handleUpdateFilterStatus = useCallback((status: 'all' | 'pending' | 'completed') => {
    setFilterStatus(status);
    if (fixedCustomViewId) {
      updateCustomViewMutation.mutate({
        id: fixedCustomViewId,
        filter_config: { status, importance: filterImportance, due: filterDue, listId: filterListId, assigneeId: filterAssigneeId },
      });
    }
  }, [fixedCustomViewId, filterImportance, filterDue, filterListId, filterAssigneeId, updateCustomViewMutation]);

  const handleUpdateFilterImportance = useCallback((importance: 'all' | 'important' | 'normal') => {
    setFilterImportance(importance);
    if (fixedCustomViewId) {
      updateCustomViewMutation.mutate({
        id: fixedCustomViewId,
        filter_config: { status: filterStatus, importance, due: filterDue, listId: filterListId, assigneeId: filterAssigneeId },
      });
    }
  }, [fixedCustomViewId, filterStatus, filterDue, filterListId, filterAssigneeId, updateCustomViewMutation]);

  const handleUpdateFilterDue = useCallback((due: 'all' | 'today' | 'tomorrow' | 'overdue' | 'has_due' | 'no_due') => {
    setFilterDue(due);
    if (fixedCustomViewId) {
      updateCustomViewMutation.mutate({
        id: fixedCustomViewId,
        filter_config: { status: filterStatus, importance: filterImportance, due, listId: filterListId, assigneeId: filterAssigneeId },
      });
    }
  }, [fixedCustomViewId, filterStatus, filterImportance, filterListId, filterAssigneeId, updateCustomViewMutation]);

  const handleUpdateFilterListId = useCallback((listId: number | 'all') => {
    setFilterListId(listId);
    if (fixedCustomViewId) {
      updateCustomViewMutation.mutate({
        id: fixedCustomViewId,
        filter_config: { status: filterStatus, importance: filterImportance, due: filterDue, listId, assigneeId: filterAssigneeId },
      });
    }
  }, [fixedCustomViewId, filterStatus, filterImportance, filterDue, filterAssigneeId, updateCustomViewMutation]);

  const handleUpdateFilterAssigneeId = useCallback((assigneeId: number | 'unassigned' | 'all') => {
    setFilterAssigneeId(assigneeId);
    if (fixedCustomViewId) {
      updateCustomViewMutation.mutate({
        id: fixedCustomViewId,
        filter_config: { status: filterStatus, importance: filterImportance, due: filterDue, listId: filterListId, assigneeId },
      });
    }
  }, [fixedCustomViewId, filterStatus, filterImportance, filterDue, filterListId, updateCustomViewMutation]);

  const handleClearAllFiltersAndSort = useCallback(() => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterImportance('all');
    setFilterDue('all');
    setFilterListId('all');
    setFilterAssigneeId('all');
    handleSelectSort(DEFAULT_SORT_CONFIG);
    if (fixedCustomViewId) {
      updateCustomViewMutation.mutate({
        id: fixedCustomViewId,
        filter_config: DEFAULT_FILTER_CONFIG,
        sort_config: DEFAULT_SORT_CONFIG,
      });
    }
  }, [fixedCustomViewId, handleSelectSort, updateCustomViewMutation]);

  // Pre-fetch all tasks and subtasks whenever tasks in view load
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      prefetchAllTasksInView(tasks);
    }
  }, [tasks]);

  // Handle Android hardware back press and back gesture to cancel multi-select mode
  // Handle Android hardware back press and back gesture to cancel multi-select mode or navigate back
  useEffect(() => {
    const onBackPress = () => {
      if (isMultiSelectMode || selectedTaskIds.length > 0) {
        clearSelectedBatchTasks();
        return true;
      }
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isMultiSelectMode, selectedTaskIds.length, clearSelectedBatchTasks, onBack]);

  const activeList = useMemo(() => (
    effectiveListId ? lists.find((l) => l.id === effectiveListId) : null
  ), [lists, effectiveListId]);

  const headerTitle = useMemo(() => {
    if (fixedCustomViewId && customView) return customView.title;
    if (activeList) return activeList.title;
    switch (effectiveView) {
      case 'important':
        return 'Important';
      case 'assigned-to-me':
        return 'Assigned to me';
      case 'all-tasks':
      default:
        return 'All tasks';
    }
  }, [fixedCustomViewId, customView, activeList, effectiveView]);

  const currentViewTheme = useMemo(() => {
    if (fixedCustomViewId && customView) return customView.color_theme || 'teal';
    if (activeList) return activeList.color_theme || 'blue';
    if (effectiveView === 'important') return 'orange';
    if (effectiveView === 'assigned-to-me') return 'purple';
    return 'blue';
  }, [fixedCustomViewId, customView, activeList, effectiveView]);

  const themePrimary = useMemo(() => {
    return getThemePrimary(currentViewTheme, isDarkMode);
  }, [currentViewTheme, isDarkMode]);

  const gradientColors = useMemo((): [string, string] => {
    return getThemeGradient(currentViewTheme, isDarkMode);
  }, [currentViewTheme, isDarkMode]);

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
      openTask(task.id, currentViewTheme);
    }
  }, [isMultiSelectMode, toggleSelectTaskForBatch, openTask, currentViewTheme]);

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
    const firstWithPhone = selectedTasks.find((t) => t.assignee_phone);
    const phone = firstWithPhone?.assignee_phone || '';
    const waLink = generateWhatsAppWebLink(phone, message);
    Linking.openURL(waLink).catch(() => {
      showAlertDialog('Error', 'Unable to open WhatsApp on this device');
    });
  }, [selectedTaskIds, tasks, showAlertDialog]);

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

  const handleBulkAddToLists = useCallback((listIds: number[]) => {
    if (selectedTaskIds.length === 0 || listIds.length === 0) return;
    const selectedListIdSet = new Set(listIds);
    const selectedTasks = tasks.filter((task) => selectedTaskIds.includes(task.id));

    for (const task of selectedTasks) {
      const existingListIds = task.list_ids?.length
        ? task.list_ids
        : (task.lists?.map((list) => list.id) || (task.list_id ? [task.list_id] : []));
      const nextListIds = Array.from(new Set([...existingListIds, ...selectedListIdSet]));
      updateTaskMutation.mutate({ id: task.id, list_ids: nextListIds });
    }
    clearSelectedBatchTasks();
  }, [selectedTaskIds, tasks, updateTaskMutation, clearSelectedBatchTasks]);

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

  const handleOpenNewTask = useCallback(() => {
    const params = new URLSearchParams();
    if (effectiveListId) {
      params.append('listId', String(effectiveListId));
    }
    if (effectiveView) {
      params.append('view', effectiveView);
    }
    if (currentViewTheme) {
      params.append('themeColor', currentViewTheme);
    }
    if (effectiveView === 'important') {
      params.append('isImportant', '1');
    }
    if (effectiveView === 'assigned-to-me') {
      params.append('assignedToUserId', '1');
    }
    const query = params.toString();
    router.push(`/task/new${query ? `?${query}` : ''}`);
  }, [effectiveListId, effectiveView, currentViewTheme, router]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (effectiveView !== 'important' && filterImportance !== 'all') count++;
    if (filterDue !== 'all') count++;
    if (filterListId !== 'all') count++;
    if (effectiveView !== 'assigned-to-me' && filterAssigneeId !== 'all') count++;
    return count;
  }, [filterStatus, filterImportance, filterDue, filterListId, filterAssigneeId, effectiveView]);

  const handleResetFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterImportance('all');
    setFilterDue('all');
    setFilterListId('all');
    setFilterAssigneeId('all');
  }, []);

  const keyExtractor = useCallback((task: Task) => String(task.id), []);

  const renderItem = useCallback(({ item }: { item: Task }) => {
    const isCheckedForBatch = selectedTaskIds.includes(item.id);
    return (
      <TaskItem
        task={item}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
        isMultiSelectMode={isMultiSelectMode}
        isCheckedForBatch={isCheckedForBatch}
        onPress={handleTaskPress}
        onLongPress={handleTaskLongPress}
        onToggleComplete={handleToggleComplete}
        onToggleImportant={handleToggleImportant}
      />
    );
  }, [selectedTaskIds, isDarkMode, themePrimary, isMultiSelectMode, handleTaskPress, handleTaskLongPress, handleToggleComplete, handleToggleImportant]);

  // Filter & Fuzzy Search Matching
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    return tasks.filter((task) => {
      // 1. Fuzzy Search matching
      if (searchQuery.trim()) {
        const titleMatch = fuzzyMatch(task.title || '', searchQuery);
        const notesMatch = fuzzyMatch(task.notes || '', searchQuery);
        const assigneeMatch = fuzzyMatch(task.assignee_name || '', searchQuery);
        const listsMatch = (task.lists || []).some((l) => fuzzyMatch(l.title || '', searchQuery));
        const dueMatch = fuzzyMatch(task.due_date || '', searchQuery);
        if (!titleMatch && !notesMatch && !assigneeMatch && !listsMatch && !dueMatch) {
          return false;
        }
      }

      // 2. Status Filter
      if (filterStatus === 'pending' && task.is_completed) return false;
      if (filterStatus === 'completed' && !task.is_completed) return false;

      // 3. Importance Filter (ignored on Important page where all tasks are already important)
      if (effectiveView !== 'important') {
        if (filterImportance === 'important' && !task.is_important) return false;
        if (filterImportance === 'normal' && task.is_important) return false;
      }

      // 4. Due Date Filter
      if (filterDue === 'today' && task.due_date !== todayStr) return false;
      if (filterDue === 'tomorrow' && task.due_date !== tomorrowStr) return false;
      if (filterDue === 'overdue' && (!task.due_date || task.due_date >= todayStr || task.is_completed)) return false;
      if (filterDue === 'has_due' && !task.due_date) return false;
      if (filterDue === 'no_due' && task.due_date) return false;

      // 5. List Filter
      if (filterListId !== 'all') {
        const belongsToList = task.list_id === filterListId || (task.lists && task.lists.some((l) => l.id === filterListId));
        if (!belongsToList) return false;
      }

      // 6. Assignee Filter (ignored on Assigned to me page where all tasks are already assigned to me)
      if (effectiveView !== 'assigned-to-me') {
        if (filterAssigneeId === 'unassigned' && task.assigned_to_user_id) return false;
        if (typeof filterAssigneeId === 'number' && task.assigned_to_user_id !== filterAssigneeId) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, filterStatus, filterImportance, filterDue, filterListId, filterAssigneeId, effectiveView]);

  const sortedTasks = useMemo(() => {
    const baseSorted = sortTasks(filteredTasks, currentSort);
    const q = searchQuery.trim();
    if (!q) return baseSorted;

    return [...baseSorted].sort((a, b) => {
      const aFields = [a.title, a.notes, a.assignee_name, a.due_date, ...(a.lists || []).map((l) => l.title)];
      const bFields = [b.title, b.notes, b.assignee_name, b.due_date, ...(b.lists || []).map((l) => l.title)];
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

  const formattedDate = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }), []);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  // Filter labels
  const statusLabel = useMemo(() => {
    switch (filterStatus) {
      case 'pending': return 'Pending / Incomplete';
      case 'completed': return 'Completed';
      default: return 'All Statuses';
    }
  }, [filterStatus]);

  const importanceLabel = useMemo(() => {
    switch (filterImportance) {
      case 'important': return '★ Important';
      case 'normal': return 'Normal';
      default: return 'All';
    }
  }, [filterImportance]);

  const dueLabel = useMemo(() => {
    switch (filterDue) {
      case 'today': return 'Today';
      case 'tomorrow': return 'Tomorrow';
      case 'overdue': return 'Overdue';
      case 'has_due': return 'Has Due Date';
      case 'no_due': return 'No Due Date';
      default: return 'All Dates';
    }
  }, [filterDue]);

  const listLabel = useMemo(() => {
    if (filterListId === 'all') return 'All Lists';
    const l = lists.find((item) => item.id === filterListId);
    return l ? l.title : 'Selected List';
  }, [filterListId, lists]);

  const assigneeLabel = useMemo(() => {
    if (filterAssigneeId === 'all') return 'All Assignees';
    if (filterAssigneeId === 'unassigned') return 'Unassigned';
    const u = users.find((item) => item.id === filterAssigneeId);
    return u ? u.name : 'Selected Assignee';
  }, [filterAssigneeId, users]);

  const defaultContact = useMemo(() => {
    if (!customView?.default_whatsapp_contact_id) return null;
    return users.find((u) => u.id === customView.default_whatsapp_contact_id) || null;
  }, [customView?.default_whatsapp_contact_id, users]);

  const filteredContacts = useMemo(() => {
    if (!contactPickerSearch.trim()) return users;
    return users.filter(
      (u) =>
        fuzzyMatch(contactPickerSearch, u.name) ||
        fuzzyMatch(contactPickerSearch, u.phone || '') ||
        fuzzyMatch(contactPickerSearch, u.email || '')
    );
  }, [users, contactPickerSearch]);

  const customViewScopeLabel = useMemo(() => {
    if (!customView) return 'Not set (Ask on send)';
    if (customView.default_whatsapp_share_scope === 'all') return 'All Tasks';
    if (customView.default_whatsapp_share_scope === 'current_view') return 'Current View';
    if (customView.default_whatsapp_share_scope === 'pending') return 'Pending Tasks';
    return 'Not set (Ask on send)';
  }, [customView?.default_whatsapp_share_scope]);

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

  const executeShareWithContactAndScope = useCallback(
    (
      contact: { id?: number; name?: string; phone?: string; is_group?: number | boolean },
      chosenScope: 'pending' | 'all' | 'current_view',
      overrideStyle?: WhatsAppMessageStyle,
      overrideNotes?: boolean | WhatsAppFormatOptions
    ) => {
      if (!customView || !contact) return;

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
          ? 'There are no pending tasks to share in this view.'
          : 'There are no tasks matching the selected option.';
        showAlertDialog('No Tasks to Share', msg);
        return;
      }

      const styleToUse = overrideStyle || (customView as any).whatsapp_message_style || defaultWhatsAppStyle || 'executive';
      const notesToUse = overrideNotes !== undefined
        ? (typeof overrideNotes === 'object' ? overrideNotes.includeNotes : overrideNotes)
        : ((customView as any).whatsapp_include_notes != null ? (customView as any).whatsapp_include_notes !== 0 : defaultWhatsAppIncludeNotes);
      const assigneeToUse = typeof overrideNotes === 'object' && overrideNotes.includeAssignee !== undefined
        ? overrideNotes.includeAssignee
        : ((customView as any).whatsapp_include_assignee != null ? (customView as any).whatsapp_include_assignee !== 0 : defaultWhatsAppIncludeAssignee);
      const importantToUse = typeof overrideNotes === 'object' && overrideNotes.includeImportant !== undefined
        ? overrideNotes.includeImportant
        : ((customView as any).whatsapp_include_important != null ? (customView as any).whatsapp_include_important !== 0 : defaultWhatsAppIncludeImportant);
      const stepsToUse = typeof overrideNotes === 'object' && overrideNotes.includeSteps !== undefined
        ? overrideNotes.includeSteps
        : ((customView as any).whatsapp_include_steps != null ? (customView as any).whatsapp_include_steps !== 0 : defaultWhatsAppIncludeSteps);
      const dueDateToUse = typeof overrideNotes === 'object' && overrideNotes.includeDueDate !== undefined
        ? overrideNotes.includeDueDate
        : ((customView as any).whatsapp_include_due_date != null ? (customView as any).whatsapp_include_due_date !== 0 : defaultWhatsAppIncludeDueDate);
      const listNameToUse = typeof overrideNotes === 'object' && overrideNotes.includeListName !== undefined
        ? overrideNotes.includeListName
        : ((customView as any).whatsapp_include_list_name != null ? (customView as any).whatsapp_include_list_name !== 0 : defaultWhatsAppIncludeListName);

      const message = formatWholeListMessage(customView, targetTasks, {
        scope: chosenScope,
        style: styleToUse,
        includeNotes: notesToUse,
        includeAssignee: assigneeToUse,
        includeImportant: importantToUse,
        includeSteps: stepsToUse,
        includeDueDate: dueDateToUse,
        includeListName: listNameToUse,
      });
      openWhatsAppWithMessage(contact.phone || '', message);
    },
    [customView, tasks, filteredTasks, defaultWhatsAppStyle, openWhatsAppWithMessage, showAlertDialog]
  );

  const handleWhatsAppView = useCallback(() => {
    if (!customView) return;
    if (tasks.length === 0) {
      showAlertDialog('No Tasks', 'There are no tasks in this view to share.');
      return;
    }

    let defContact: User | null = null;
    if (customView.default_whatsapp_contact_id === -1) {
      defContact = WHATSAPP_GROUP_USER;
    } else if (customView.default_whatsapp_contact_id === 1) {
      defContact = SELF_USER;
    } else if (customView.default_whatsapp_contact_id) {
      defContact = users.find((u) => u.id === customView.default_whatsapp_contact_id) || null;
    }

    if (!defContact) {
      // Step 1: Open contact picker
      setIsSharingFromPicker(true);
      setShowContactPicker(true);
      return;
    }

    // Step 2: Check if share scope is chosen
    if (!customView.default_whatsapp_share_scope) {
      pendingContactRef.current = defContact;
      setShowScopePickerModal(true);
      return;
    }

    // Step 3: Check format picker only first time
    if (!hasChosenWhatsAppFormat) {
      pendingContactRef.current = defContact;
      setShowFormatPickerModal(true);
      return;
    }

    // All set
    const scope = (customView.default_whatsapp_share_scope || 'current_view') as 'pending' | 'all' | 'current_view';
    executeShareWithContactAndScope(defContact, scope);
  }, [customView, tasks.length, users, hasChosenWhatsAppFormat, executeShareWithContactAndScope, showAlertDialog]);

  const handleSelectDefaultContact = useCallback(
    (user: User | null) => {
      if (!fixedCustomViewId) return;
      updateCustomViewMutation.mutate({
        id: fixedCustomViewId,
        default_whatsapp_contact_id: user ? user.id : null,
      });
      setLongPressRecipient(user);
      setShowContactPicker(false);

      if (isSharingFromPicker && user) {
        setIsSharingFromPicker(false);
        pendingContactRef.current = user;
        if (!customView?.default_whatsapp_share_scope) {
          setShowScopePickerModal(true);
        } else if (!hasChosenWhatsAppFormat) {
          setShowFormatPickerModal(true);
        } else {
          pendingContactRef.current = null;
          const scope = (customView?.default_whatsapp_share_scope || 'current_view') as 'pending' | 'all' | 'current_view';
          executeShareWithContactAndScope(user, scope);
        }
      }
    },
    [
      fixedCustomViewId,
      isSharingFromPicker,
      customView,
      hasChosenWhatsAppFormat,
      updateCustomViewMutation,
      executeShareWithContactAndScope,
    ]
  );

  const handleChooseTasksToSendScope = useCallback(
    (scope: string | null) => {
      if (!fixedCustomViewId) return;
      updateCustomViewMutation.mutate({
        id: fixedCustomViewId,
        default_whatsapp_share_scope: scope || undefined,
      });
      setShowScopePickerModal(false);

      if (pendingContactRef.current) {
        if (!hasChosenWhatsAppFormat) {
          // Advance to step 3: Format bottom sheet only on first time ever
          setShowFormatPickerModal(true);
        } else {
          const contact = pendingContactRef.current;
          pendingContactRef.current = null;
          executeShareWithContactAndScope(
            contact,
            (scope as any) || 'pending'
          );
        }
      }
    },
    [fixedCustomViewId, hasChosenWhatsAppFormat, updateCustomViewMutation, executeShareWithContactAndScope]
  );

  const handleSaveWhatsAppFormat = useCallback(
    (style: WhatsAppMessageStyle, options: WhatsAppFormatOptions) => {
      if (fixedCustomViewId) {
        updateCustomViewMutation.mutate({
          id: fixedCustomViewId,
          whatsapp_message_style: style,
          whatsapp_include_notes: options.includeNotes ? 1 : 0,
          whatsapp_include_assignee: options.includeAssignee ? 1 : 0,
          whatsapp_include_important: options.includeImportant ? 1 : 0,
          whatsapp_include_steps: options.includeSteps ? 1 : 0,
          whatsapp_include_due_date: options.includeDueDate ? 1 : 0,
          whatsapp_include_list_name: options.includeListName ? 1 : 0,
        });
      }
      setHasChosenWhatsAppFormat(true);
      updatePrefsMutation.mutate({ has_chosen_whatsapp_format: 1 });
    },
    [
      fixedCustomViewId,
      updateCustomViewMutation,
      setHasChosenWhatsAppFormat,
      updatePrefsMutation,
    ]
  );

  const handleCloseFormatPicker = useCallback(() => {
    setShowFormatPickerModal(false);
    if (!hasChosenWhatsAppFormat) {
      setHasChosenWhatsAppFormat(true);
      updatePrefsMutation.mutate({ has_chosen_whatsapp_format: 1 });
    }
    const contact = pendingContactRef.current;
    pendingContactRef.current = null;
    if (contact) {
      const scope = (customView?.default_whatsapp_share_scope || 'current_view') as 'pending' | 'all' | 'current_view';
      executeShareWithContactAndScope(contact, scope);
    }
  }, [hasChosenWhatsAppFormat, setHasChosenWhatsAppFormat, updatePrefsMutation, customView?.default_whatsapp_share_scope, executeShareWithContactAndScope]);

  const handleSelectShareScope = useCallback(
    (scope: 'pending' | 'all' | 'current_view') => {
      setShareScope(scope);
      if (fixedCustomViewId) {
        updateCustomViewMutation.mutate({
          id: fixedCustomViewId,
          default_whatsapp_share_scope: scope,
        });
      }
    },
    [fixedCustomViewId, updateCustomViewMutation]
  );

  const handleLongPressWhatsApp = useCallback(() => {
    if (!fixedCustomViewId || !customView) return;
    const initialScope = (customView.default_whatsapp_share_scope as 'pending' | 'all' | 'current_view') || 'current_view';
    setShareScope(initialScope);

    let recipient: User | null = null;
    if (customView.default_whatsapp_contact_id === -1) {
      recipient = WHATSAPP_GROUP_USER;
    } else if (customView.default_whatsapp_contact_id === 1) {
      recipient = SELF_USER;
    } else if (customView.default_whatsapp_contact_id) {
      recipient = users.find((u) => u.id === customView.default_whatsapp_contact_id) || null;
    }
    setLongPressRecipient(recipient);
    setShowLongPressShareModal(true);
  }, [fixedCustomViewId, customView, users]);

  const handleExecuteLongPressShare = useCallback(() => {
    if (!longPressRecipient) {
      setShowLongPressShareModal(false);
      setIsSharingFromPicker(false);
      setShowContactPicker(true);
      return;
    }
    setShowLongPressShareModal(false);
    const st = ((customView as any)?.whatsapp_message_style as WhatsAppMessageStyle) || defaultWhatsAppStyle || 'modern';
    const incNotes = (customView as any)?.whatsapp_include_notes !== 0;
    executeShareWithContactAndScope(longPressRecipient, shareScope, st, incNotes);
  }, [longPressRecipient, customView, defaultWhatsAppStyle, shareScope, executeShareWithContactAndScope]);

  const ListHeader = useMemo(() => (
    <View style={{ paddingTop: 8, paddingBottom: 14 }}>
      {/* Top Banner */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 24,
          padding: 20,
          shadowColor: themePrimary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        {Boolean(onBack) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <TouchableOpacity
              onPress={onBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={18} color="#ffffff" />
            </TouchableOpacity>

            {Boolean(fixedCustomViewId) && (
              <TouchableOpacity
                onPress={() => setShowCustomViewDropdown(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MoreVertical size={18} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        )}
        <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {formattedDate}
        </Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#ffffff', marginTop: 2 }} numberOfLines={1}>
          {headerTitle}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>
          {pendingTasks.length} pending • {completedTasks.length} completed
        </Text>
      </LinearGradient>

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
            marginTop: 14,
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

          {/* Keep the most frequent actions visible; secondary actions scale in the menu. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={handleBulkShare}
              accessibilityLabel="Share selected tasks on WhatsApp"
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
            <TouchableOpacity
              onPress={handleBulkDelete}
              accessibilityLabel="Delete selected tasks"
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
            <TouchableOpacity
              ref={bulkActionsTriggerRef}
              onPress={openBulkActions}
              accessibilityLabel="More bulk actions"
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
            >
              <MoreVertical size={19} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Standardized Search Box & Filters Button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
            {/* Search Bar - 52px Touch Target */}
            <View
              style={{
                flex: 1,
                height: 52,
                flexDirection: 'row',
                alignItems: 'center',
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

            {/* Filters Trigger Button - 52x52px Touch Target */}
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

            {/* Universal Clear All Filters, Search & Sort Button */}
            {(activeFiltersCount > 0 || currentSort.field !== 'smart' || searchQuery.trim().length > 0) && (
              <TouchableOpacity
                onPress={handleClearAllFiltersAndSort}
                activeOpacity={0.7}
                style={{
                  height: 52,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                  borderWidth: 1,
                  borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <RotateCcw size={16} color="#ef4444" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#ef4444' }}>Clear</Text>
              </TouchableOpacity>
            )}
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
                <TouchableOpacity
                  onPress={() => setFilterStatus('all')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{ minHeight: 32, backgroundColor: hexToRgba(themePrimary, 0.12), paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: themePrimary }}>Status: {filterStatus}</Text>
                  <X size={12} color={themePrimary} />
                </TouchableOpacity>
              )}
              {effectiveView !== 'important' && filterImportance !== 'all' && (
                <TouchableOpacity
                  onPress={() => setFilterImportance('all')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{ minHeight: 32, backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#f59e0b' }}>{filterImportance}</Text>
                  <X size={12} color="#f59e0b" />
                </TouchableOpacity>
              )}
              {filterDue !== 'all' && (
                <TouchableOpacity
                  onPress={() => setFilterDue('all')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{ minHeight: 32, backgroundColor: 'rgba(2,132,199,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284c7' }}>Due: {dueLabel}</Text>
                  <X size={12} color="#0284c7" />
                </TouchableOpacity>
              )}
              {filterListId !== 'all' && (
                <TouchableOpacity
                  onPress={() => setFilterListId('all')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{ minHeight: 32, backgroundColor: 'rgba(168,85,247,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#a855f7' }}>List: {listLabel}</Text>
                  <X size={12} color="#a855f7" />
                </TouchableOpacity>
              )}
              {effectiveView !== 'assigned-to-me' && filterAssigneeId !== 'all' && (
                <TouchableOpacity
                  onPress={() => setFilterAssigneeId('all')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{ minHeight: 32, backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#10b981' }}>Assignee: {assigneeLabel}</Text>
                  <X size={12} color="#10b981" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </View>
  ), [gradientColors, themePrimary, formattedDate, headerTitle, pendingTasks.length, completedTasks.length, isDarkMode, isMultiSelectMode, selectedTaskIds, clearSelectedBatchTasks, handleBulkShare, handleBulkComplete, handleBulkImportant, handleBulkDelete, searchQuery, activeFiltersCount, currentSort, filterStatus, filterImportance, filterDue, filterListId, filterAssigneeId, dueLabel, listLabel, assigneeLabel, handleResetFilters]);

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
            backgroundColor: hexToRgba(themePrimary, 0.12),
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Sparkles size={28} color={themePrimary} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
          {isFiltered ? 'No matching tasks' : 'No tasks yet'}
        </Text>
        <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 4, textAlign: 'center' }}>
          {isFiltered ? 'Try adjusting your search terms or filters.' : 'Tap the + button below to create your first task.'}
        </Text>
      </View>
    );
  }, [completedTasks.length, searchQuery, activeFiltersCount, isDarkMode, themePrimary]);

  const ListFooter = useMemo(() => {
    if (completedTasks.length === 0) return <View style={{ height: 16 }} />;
    return (
      <View style={{ marginTop: 12, paddingBottom: 16 }}>
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
  }, [completedTasks, isDarkMode, themePrimary, showCompleted, isMultiSelectMode, selectedTaskIds, handleTaskPress, handleTaskLongPress, handleToggleComplete]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDarkMode ? '#09090b' : '#f8fafc',
        paddingTop: topInset,
      }}
    >
      {/* Virtualized Tasks FlatList */}
      <FlatList
        ref={flatListRef}
        data={pendingTasks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themePrimary}
            colors={[themePrimary]}
            progressBackgroundColor={isDarkMode ? '#18181b' : '#ffffff'}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button (FAB) for WhatsApp Share in Custom View */}
      {Boolean(fixedCustomViewId) && tasks.length > 0 && (
        <TouchableOpacity
          onPress={handleWhatsAppView}
          onLongPress={handleLongPressWhatsApp}
          delayLongPress={350}
          activeOpacity={0.85}
          style={{
            position: 'absolute',
            bottom: 86,
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
            zIndex: 50,
          }}
        >
          <WhatsAppIcon size={26} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Floating Action Button (FAB) for Add Task */}
      <TouchableOpacity
        onPress={handleOpenNewTask}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: gradientColors[0] || themePrimary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: themePrimary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 10,
          elevation: 6,
          zIndex: 50,
        }}
      >
        <Plus size={28} color="#ffffff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* 3-Dot Dropdown Menu Modal for Custom View */}
      {Boolean(fixedCustomViewId && customView) && (
        <ListOrViewDropdownModal
          visible={showCustomViewDropdown}
          onClose={() => setShowCustomViewDropdown(false)}
          targetType="view"
          item={customView}
          users={users}
          isPinned={isCustomPinned}
          isDarkMode={isDarkMode}
          onOpenContactPicker={() => {
            setIsSharingFromPicker(false);
            setShowContactPicker(true);
          }}
          onOpenScopePicker={() => {
            setShowScopePickerModal(true);
          }}
          onOpenFormatPicker={() => {
            setShowFormatPickerModal(true);
          }}
          onTogglePin={() => {
            if (fixedCustomViewId) {
              togglePinViewMutation.mutate(`custom_view:${fixedCustomViewId}`);
            }
          }}
          onRename={() => {
            setEditViewTitle(customView?.title || '');
            setShowRenameModal(true);
          }}
          onChangeTheme={() => {
            setEditViewTheme(customView?.color_theme || 'teal');
            setShowThemeModal(true);
          }}
          onDelete={() => {
            showConfirmDialog({
              title: 'Delete View',
              message: `Are you sure you want to delete "${customView?.title}"? (Tasks will not be deleted)`,
              type: 'danger',
              confirmLabel: 'Delete View',
              onConfirm: () => {
                if (fixedCustomViewId) {
                  deleteCustomViewMutation.mutate(fixedCustomViewId);
                }
                if (onBack) onBack();
              },
            });
          }}
        />
      )}

      {/* Task Filters Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterStatus={filterStatus}
        setFilterStatus={handleUpdateFilterStatus}
        filterImportance={filterImportance}
        setFilterImportance={handleUpdateFilterImportance}
        filterDue={filterDue}
        setFilterDue={handleUpdateFilterDue}
        filterAssigneeId={filterAssigneeId}
        setFilterAssigneeId={handleUpdateFilterAssigneeId}
        filterListId={filterListId}
        setFilterListId={handleUpdateFilterListId}
        users={users}
        lists={lists}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={handleClearAllFiltersAndSort}
        totalMatchedTasks={filteredTasks.length}
        hideImportance={effectiveView === 'important'}
        hideAssignee={effectiveView === 'assigned-to-me'}
        hideList={Boolean(effectiveListId)}
      />

      {/* Sort Modal */}
      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        currentSort={currentSort}
        onSelectSort={handleSelectSort}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
        viewTitle={headerTitle}
      />

      {/* Overflow keeps the selection bar stable as bulk actions grow. */}
      <Modal
        visible={showBulkActionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBulkActionsModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowBulkActionsModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.08)' }}>
            <TouchableWithoutFeedback onPress={(event) => event.stopPropagation()}>
              <View style={{ position: 'absolute', top: bulkActionsAnchor.y + bulkActionsAnchor.height + 8, right: Math.max(12, windowWidth - (bulkActionsAnchor.x + bulkActionsAnchor.width)), width: 250, backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderRadius: 16, paddingVertical: 7, borderWidth: 1, borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0', shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 12 }}>
                {[
                  { label: 'Mark complete', icon: <View style={{ width: 20, height: 20, borderRadius: 7, borderWidth: 2, borderColor: themePrimary, backgroundColor: themePrimary, alignItems: 'center', justifyContent: 'center' }}><Check size={13} color="#ffffff" strokeWidth={3} /></View>, onPress: handleBulkComplete },
                  { label: 'Mark important', icon: <Star size={18} color="#f59e0b" fill="#f59e0b" />, onPress: handleBulkImportant },
                  { label: 'Add to list', icon: <ListTodo size={18} color={themePrimary} />, onPress: () => setShowBulkListModal(true) },
                  { label: 'Set due date', icon: <Calendar size={18} color={themePrimary} />, onPress: () => setShowBulkDueModal(true) },
                  { label: 'Assign task', icon: <UserCheck size={18} color={themePrimary} />, onPress: () => setShowBulkAssigneeModal(true) },
                ].map((action) => (
                  <TouchableOpacity key={action.label} onPress={() => { setShowBulkActionsModal(false); action.onPress(); }} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
                    {action.icon}
                    <Text style={{ color: isDarkMode ? '#f4f4f5' : '#0f172a', fontSize: 14, fontWeight: '700' }}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <BulkListPickerModal
        visible={showBulkListModal}
        selectedCount={selectedTaskIds.length}
        lists={lists}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
        onClose={() => setShowBulkListModal(false)}
        onAddToLists={handleBulkAddToLists}
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
      />

      {/* Default WhatsApp Contact Picker Modal for Custom View */}
      <ContactPickerModal
        visible={showContactPicker}
        onClose={() => {
          setShowContactPicker(false);
          setIsSharingFromPicker(false);
        }}
        title="Default WhatsApp Contact"
        subtitle={`Choose who receives updates for "${customView?.title || 'this view'}"`}
        selectedContactId={customView?.default_whatsapp_contact_id}
        users={users}
        onSelectContact={(user) => {
          handleSelectDefaultContact(user);
        }}
        onClearContact={() => {
          handleSelectDefaultContact(null);
        }}
        isDarkMode={isDarkMode}
      />

      {/* Tasks to Send Scope Picker Modal for Custom View */}
      <Modal
        visible={showScopePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowScopePickerModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
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
                  Choose which tasks to include when sharing "{customView?.title}" on WhatsApp
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
              {/* Option 1: Current View (Default for views) */}
              <TouchableOpacity
                onPress={() => handleChooseTasksToSendScope('current_view')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: (customView?.default_whatsapp_share_scope || 'current_view') === 'current_view'
                    ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                    : (isDarkMode ? '#27272a' : '#f8fafc'),
                  borderWidth: (customView?.default_whatsapp_share_scope || 'current_view') === 'current_view' ? 2 : 1,
                  borderColor: (customView?.default_whatsapp_share_scope || 'current_view') === 'current_view' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: 'rgba(168, 85, 247, 0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Layers size={20} color="#a855f7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                      Current View
                    </Text>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                      Tasks matching active search and filters
                    </Text>
                  </View>
                </View>
                {(customView?.default_whatsapp_share_scope || 'current_view') === 'current_view' && (
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0078d4', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#ffffff" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Option 2: Pending tasks */}
              <TouchableOpacity
                onPress={() => handleChooseTasksToSendScope('pending')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: customView?.default_whatsapp_share_scope === 'pending'
                    ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                    : (isDarkMode ? '#27272a' : '#f8fafc'),
                  borderWidth: customView?.default_whatsapp_share_scope === 'pending' ? 2 : 1,
                  borderColor: customView?.default_whatsapp_share_scope === 'pending' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
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
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                      Pending Tasks
                    </Text>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                      Only incomplete tasks in this view
                    </Text>
                  </View>
                </View>
                {customView?.default_whatsapp_share_scope === 'pending' && (
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0078d4', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#ffffff" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Option 3: All Tasks */}
              <TouchableOpacity
                onPress={() => handleChooseTasksToSendScope('all')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: customView?.default_whatsapp_share_scope === 'all'
                    ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                    : (isDarkMode ? '#27272a' : '#f8fafc'),
                  borderWidth: customView?.default_whatsapp_share_scope === 'all' ? 2 : 1,
                  borderColor: customView?.default_whatsapp_share_scope === 'all' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: 'rgba(34, 197, 94, 0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckSquare size={20} color="#22c55e" />
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
                {customView?.default_whatsapp_share_scope === 'all' && (
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0078d4', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#ffffff" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* WhatsApp Message Format Bottom Sheet */}
      <WhatsAppFormatBottomSheet
        visible={showFormatPickerModal}
        onClose={handleCloseFormatPicker}
        currentStyle={((customView as any)?.whatsapp_message_style as WhatsAppMessageStyle) || defaultWhatsAppStyle || 'executive'}
        includeNotes={(customView as any)?.whatsapp_include_notes != null ? (customView as any)?.whatsapp_include_notes !== 0 : defaultWhatsAppIncludeNotes}
        includeAssignee={(customView as any)?.whatsapp_include_assignee != null ? (customView as any)?.whatsapp_include_assignee !== 0 : defaultWhatsAppIncludeAssignee}
        includeImportant={(customView as any)?.whatsapp_include_important != null ? (customView as any)?.whatsapp_include_important !== 0 : defaultWhatsAppIncludeImportant}
        includeSteps={(customView as any)?.whatsapp_include_steps != null ? (customView as any)?.whatsapp_include_steps !== 0 : defaultWhatsAppIncludeSteps}
        includeDueDate={(customView as any)?.whatsapp_include_due_date != null ? (customView as any)?.whatsapp_include_due_date !== 0 : defaultWhatsAppIncludeDueDate}
        includeListName={(customView as any)?.whatsapp_include_list_name != null ? (customView as any)?.whatsapp_include_list_name !== 0 : defaultWhatsAppIncludeListName}
        listNameLabel="View Name"
        onSave={handleSaveWhatsAppFormat}
        title={`Message Format: ${customView?.title || 'View'}`}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
      />

      {/* Long Press WhatsApp Share Dialog for Custom View */}
      {Boolean(fixedCustomViewId) && (
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
                {/* Option 1: Current View Tasks (Default for views) */}
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                          Current View
                        </Text>
                        <View style={{ backgroundColor: 'rgba(0, 120, 212, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#0078d4' }}>DEFAULT</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                        Tasks matching active search and filters
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: shareScope === 'current_view' ? '#0078d4' : (isDarkMode ? '#a1a1aa' : '#64748b') }}>
                    {tasks.length}
                  </Text>
                </TouchableOpacity>

                {/* Option 2: Pending Tasks */}
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
                      <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        Pending Tasks
                      </Text>
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                        Only incomplete tasks in this view
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: shareScope === 'pending' ? '#0078d4' : (isDarkMode ? '#a1a1aa' : '#64748b') }}>
                    {tasks.filter((t) => !t.is_completed).length}
                  </Text>
                </TouchableOpacity>

                {/* Option 3: All Tasks */}
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
              </View>

              {/* Section 3: Message Format */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Message Format
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowLongPressShareModal(false);
                    setShowFormatPickerModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#8b5cf6' }}>
                    Customize & Preview
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {(['modern', 'executive', 'crisp'] as const).map((st) => {
                  const currentSt = ((customView as any)?.whatsapp_message_style as WhatsAppMessageStyle) || defaultWhatsAppStyle || 'modern';
                  const isSelected = currentSt === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      onPress={() => {
                        if (fixedCustomViewId) {
                          updateCustomViewMutation.mutate({
                            id: fixedCustomViewId,
                            whatsapp_message_style: st,
                          });
                        }
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        paddingHorizontal: 6,
                        borderRadius: 14,
                        backgroundColor: isSelected
                          ? (isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#f5f3ff')
                          : (isDarkMode ? '#27272a' : '#f8fafc'),
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? '#8b5cf6' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                        alignItems: 'center',
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: isSelected ? '#8b5cf6' : (isDarkMode ? '#e4e4e7' : '#334155'),
                          textTransform: 'capitalize',
                        }}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
                  Share to WhatsApp
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Quick Rename Custom View Modal */}
      {Boolean(fixedCustomViewId) && (
        <Modal
          visible={showRenameModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRenameModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowRenameModal(false)}
            />
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                borderRadius: 24,
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
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a', marginBottom: 14 }}>
                Rename View
              </Text>
              <TextInput
                value={editViewTitle}
                onChangeText={setEditViewTitle}
                placeholder="Enter view title..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                autoFocus
                style={{
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                  paddingHorizontal: 14,
                  fontSize: 15,
                  fontWeight: '600',
                  color: isDarkMode ? '#ffffff' : '#0f172a',
                  marginBottom: 18,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setShowRenameModal(false)}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#d4d4d8' : '#475569' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (!editViewTitle.trim() || !fixedCustomViewId) return;
                    updateCustomViewMutation.mutate({
                      id: fixedCustomViewId,
                      title: editViewTitle.trim(),
                    });
                    setShowRenameModal(false);
                  }}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: themePrimary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Theme Picker Modal for Custom View */}
      {Boolean(fixedCustomViewId) && (
        <Modal
          visible={showThemeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowThemeModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowThemeModal(false)}
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  View Theme
                </Text>
                <TouchableOpacity onPress={() => setShowThemeModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginBottom: 16 }}>
                Choose an accent color for "{customView?.title}":
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
                {CUSTOM_LIST_THEMES.map((theme) => {
                  const themeHex = getThemePrimary(theme, isDarkMode);
                  const isSelected = (customView?.color_theme || 'teal') === theme;
                  return (
                    <TouchableOpacity
                      key={theme}
                      onPress={() => {
                        if (fixedCustomViewId) {
                          updateCustomViewMutation.mutate({
                            id: fixedCustomViewId,
                            color_theme: theme,
                          });
                        }
                        setShowThemeModal(false);
                      }}
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        backgroundColor: themeHex,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isSelected ? 3.5 : 0,
                        borderColor: isDarkMode ? '#ffffff' : '#0f172a',
                      }}
                      activeOpacity={0.8}
                    >
                      {isSelected && <Check size={20} color="#ffffff" strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={() => setShowThemeModal(false)}
                style={{
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#d4d4d8' : '#475569' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Edit Custom View Modal */}
      {Boolean(fixedCustomViewId) && (
        <Modal
          visible={showEditCustomViewModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEditCustomViewModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowEditCustomViewModal(false)}>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.6)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
              }}
            >
              <TouchableWithoutFeedback>
                <View
                  style={{
                    width: '100%',
                    maxWidth: 380,
                    borderRadius: 24,
                    backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                    padding: 20,
                  }}
                >
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                      Edit View
                    </Text>
                    <TouchableOpacity onPress={() => setShowEditCustomViewModal(false)} style={{ padding: 4 }}>
                      <X size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                    </TouchableOpacity>
                  </View>

                  {/* View Name Input */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#a1a1aa' : '#64748b', marginBottom: 8 }}>
                    View Name
                  </Text>
                  <TextInput
                    value={editViewTitle}
                    onChangeText={setEditViewTitle}
                    placeholder="Enter view name..."
                    placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                    style={{
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                      paddingHorizontal: 14,
                      fontSize: 15,
                      fontWeight: '600',
                      color: isDarkMode ? '#ffffff' : '#0f172a',
                      marginBottom: 16,
                    }}
                  />

                  {/* Theme Color Selector */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#a1a1aa' : '#64748b', marginBottom: 8 }}>
                    Theme Color
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                      {CUSTOM_LIST_THEMES.map((theme) => {
                        const themeColorHex = getThemePrimary(theme, isDarkMode);
                        const isSelected = editViewTheme === theme;
                        return (
                          <TouchableOpacity
                            key={theme}
                            onPress={() => setEditViewTheme(theme)}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: themeColorHex,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: isSelected ? 3 : 0,
                              borderColor: isDarkMode ? '#ffffff' : '#0f172a',
                            }}
                          >
                            {isSelected && <Check size={16} color="#ffffff" strokeWidth={3} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Pin to Bottom Bar Toggle */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#a1a1aa' : '#64748b', marginBottom: 8 }}>
                    Bottom Bar
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (fixedCustomViewId) {
                        togglePinViewMutation.mutate(`custom_view:${fixedCustomViewId}`);
                      }
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 14,
                      backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                      marginBottom: 20,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {isCustomPinned ? (
                        <Pin size={18} color={themePrimary} fill={themePrimary} />
                      ) : (
                        <PinOff size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                      )}
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        Pin to Bottom Bar
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: isCustomPinned
                          ? (isDarkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0, 120, 212, 0.1)')
                          : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: isCustomPinned ? '#0078d4' : (isDarkMode ? '#a1a1aa' : '#64748b'),
                        }}
                      >
                        {isCustomPinned ? 'PINNED' : 'NOT PINNED'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => {
                        showConfirmDialog({
                          title: 'Delete View',
                          message: `Are you sure you want to delete "${customView?.title}"? (Tasks will not be deleted)`,
                          type: 'danger',
                          confirmLabel: 'Delete View',
                          onConfirm: () => {
                            if (fixedCustomViewId) {
                              deleteCustomViewMutation.mutate(fixedCustomViewId);
                            }
                            setShowEditCustomViewModal(false);
                            if (onBack) onBack();
                          },
                        });
                      }}
                      style={{
                        flex: 1,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        if (!editViewTitle.trim() || !fixedCustomViewId) return;
                        updateCustomViewMutation.mutate({
                          id: fixedCustomViewId,
                          title: editViewTitle.trim(),
                          color_theme: editViewTheme,
                        });
                        setShowEditCustomViewModal(false);
                      }}
                      style={{
                        flex: 2,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: themePrimary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* 300ms Task Loading HUD */}
      <TaskLoadingIndicator />
    </View>
  );
}
