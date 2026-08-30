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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUiStore } from '../store/useUiStore';
import {
  useTasksQuery,
  useListsQuery,
  useUsersQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useUpdateUserPreferencesMutation,
  prefetchAllTasksInView,
} from '../hooks/useTodoQueries';
import { useTaskNavigation } from '../hooks/useTaskNavigation';
import {
  Task,
  User,
  List,
  THEME_PALETTES,
  ThemeColor,
  getThemeGradient,
  getThemePrimary,
  ViewSortConfig,
  DEFAULT_SORT_CONFIG,
  sortTasks,
  getSortDisplayLabel,
  formatBatchTasksMessage,
  generateWhatsAppWebLink,
} from '@shared/todo';
import { SortModal } from './SortModal';
import { FilterBottomSheet } from './FilterBottomSheet';
import { WhatsAppIcon } from './WhatsAppIcon';
import { BulkDueDatePickerModal } from './BulkDueDatePickerModal';
import { BulkAssigneePickerModal } from './BulkAssigneePickerModal';

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

interface TasksViewProps {
  fixedView?: 'all-tasks' | 'important' | 'assigned-to-me';
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
              {task.due_date && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} color={themePrimary} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: themePrimary }}>{task.due_date}</Text>
                </View>
              )}
              {task.lists?.map((l) => (
                <View
                  key={l.id}
                  style={{
                    backgroundColor: hexToRgba(themePrimary, 0.12),
                    paddingHorizontal: 7,
                    paddingVertical: 2.5,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: themePrimary }}>{l.title}</Text>
                </View>
              ))}
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

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const cleanText = text.toLowerCase();
  const cleanQuery = query.toLowerCase().trim();
  if (cleanText.includes(cleanQuery)) return true;

  let queryIdx = 0;
  for (let i = 0; i < cleanText.length && queryIdx < cleanQuery.length; i++) {
    if (cleanText[i] === cleanQuery[queryIdx]) {
      queryIdx++;
    }
  }
  return queryIdx === cleanQuery.length;
}

export function TasksView({ fixedView }: TasksViewProps) {
  const router = useRouter();
  const [showCompleted, setShowCompleted] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Filter States
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterImportance, setFilterImportance] = useState<'all' | 'important' | 'normal'>('all');
  const [filterDue, setFilterDue] = useState<'all' | 'today' | 'tomorrow' | 'overdue' | 'has_due' | 'no_due'>('all');
  const [filterListId, setFilterListId] = useState<number | 'all'>('all');
  const [filterAssigneeId, setFilterAssigneeId] = useState<number | 'unassigned' | 'all'>('all');

  const flatListRef = useRef<FlatList>(null);

  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const isMultiSelectMode = useUiStore((s) => s.isMultiSelectMode);
  const selectedTaskIds = useUiStore((s) => s.selectedTaskIds);
  const startMultiSelectWithTask = useUiStore((s) => s.startMultiSelectWithTask);
  const toggleSelectTaskForBatch = useUiStore((s) => s.toggleSelectTaskForBatch);
  const selectAllTasks = useUiStore((s) => s.selectAllTasks);
  const clearSelectedBatchTasks = useUiStore((s) => s.clearSelectedBatchTasks);
  const setSelectedTaskId = useUiStore((s) => s.setSelectedTaskId);
  const activeListId = useUiStore((s) => s.activeListId);
  const storeView = useUiStore((s) => s.activeView);
  const sortPreferences = useUiStore((s) => s.sortPreferences);
  const setViewSort = useUiStore((s) => s.setViewSort);

  const [showBulkDueModal, setShowBulkDueModal] = useState(false);
  const [showBulkAssigneeModal, setShowBulkAssigneeModal] = useState(false);

  const effectiveView = fixedView || storeView || 'all-tasks';
  const effectiveListId = fixedView ? null : activeListId;
  const viewKey = effectiveListId ? `list_${effectiveListId}` : effectiveView;

  const currentSort = useMemo(() => sortPreferences[viewKey] || DEFAULT_SORT_CONFIG, [sortPreferences, viewKey]);

  const updatePrefsMutation = useUpdateUserPreferencesMutation();

  const handleSelectSort = useCallback((config: ViewSortConfig) => {
    setViewSort(viewKey, config);
    const updated = { ...sortPreferences, [viewKey]: config };
    updatePrefsMutation.mutate({ sort_preferences: updated });
  }, [viewKey, sortPreferences, setViewSort, updatePrefsMutation]);

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
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [tasksQuery, listsQuery, usersQuery]);

  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const { openTask, TaskLoadingIndicator } = useTaskNavigation();

  // Pre-fetch all tasks and subtasks whenever tasks in view load
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

  const activeList = useMemo(() => (
    effectiveListId ? lists.find((l) => l.id === effectiveListId) : null
  ), [lists, effectiveListId]);

  const headerTitle = useMemo(() => {
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
  }, [activeList, effectiveView]);

  const currentViewTheme = useMemo(() => {
    if (activeList) return activeList.color_theme || 'blue';
    if (effectiveView === 'important') return 'orange';
    if (effectiveView === 'assigned-to-me') return 'purple';
    return 'blue';
  }, [activeList, effectiveView]);

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
      openTask(task.id, themePrimary);
    }
  }, [isMultiSelectMode, toggleSelectTaskForBatch, openTask, themePrimary]);

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
      Alert.alert('Error', 'Unable to open WhatsApp on this device');
    });
  }, [selectedTaskIds, tasks]);

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
    Alert.alert(
      'Delete Tasks',
      `Are you sure you want to delete ${selectedTaskIds.length} selected ${selectedTaskIds.length === 1 ? 'task' : 'tasks'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            for (const taskId of selectedTaskIds) {
              deleteTaskMutation.mutate(taskId);
            }
            clearSelectedBatchTasks();
          },
        },
      ]
    );
  }, [selectedTaskIds, deleteTaskMutation, clearSelectedBatchTasks]);

  const handleOpenNewTask = useCallback(() => {
    const params = new URLSearchParams();
    if (effectiveListId) {
      params.append('listId', String(effectiveListId));
    }
    if (effectiveView === 'important') {
      params.append('isImportant', '1');
    }
    const query = params.toString();
    router.push(`/task/new${query ? `?${query}` : ''}`);
  }, [effectiveListId, effectiveView, router]);

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
    return sortTasks(filteredTasks, currentSort);
  }, [filteredTasks, currentSort]);

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
              {effectiveView !== 'important' && filterImportance !== 'all' && (
                <View style={{ minHeight: 32, backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#f59e0b' }}>{filterImportance}</Text>
                </View>
              )}
              {filterDue !== 'all' && (
                <View style={{ minHeight: 32, backgroundColor: 'rgba(2,132,199,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284c7' }}>Due: {dueLabel}</Text>
                </View>
              )}
              {filterListId !== 'all' && (
                <View style={{ minHeight: 32, backgroundColor: 'rgba(168,85,247,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#a855f7' }}>List: {listLabel}</Text>
                </View>
              )}
              {effectiveView !== 'assigned-to-me' && filterAssigneeId !== 'all' && (
                <View style={{ minHeight: 32, backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#10b981' }}>Assignee: {assigneeLabel}</Text>
                </View>
              )}
              {activeFiltersCount > 0 && (
                <TouchableOpacity
                  onPress={handleResetFilters}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 }}
                >
                  <RotateCcw size={12} color="#ef4444" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#ef4444' }}>Reset</Text>
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
        filterListId={filterListId}
        setFilterListId={setFilterListId}
        users={users}
        lists={lists}
        isDarkMode={isDarkMode}
        themePrimary={themePrimary}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={handleResetFilters}
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

      {/* 300ms Task Loading HUD */}
      <TaskLoadingIndicator />
    </View>
  );
}
