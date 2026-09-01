import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus,
  Star,
  Check,
  Calendar,
  Clock,
  Share2,
  Send,
  Palette,
  CheckSquare,
  Square,
  ListTodo,
  Settings,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Sparkles,
  Layers,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  RotateCcw,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Badge } from './ui/badge.jsx';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.jsx';
import { WhatsAppIcon } from './WhatsAppIcon.jsx';
import { SortModal } from './SortModal.jsx';
import { FilterModal } from './FilterModal.jsx';
import { BulkDueDatePickerModal } from './BulkDueDatePickerModal.jsx';
import { BulkAssigneePickerModal } from './BulkAssigneePickerModal.jsx';
import { WhatsAppLongPressModal } from './WhatsAppLongPressModal.jsx';
import { HeaderBanner } from './HeaderBanner.jsx';
import { useUiStore } from '../store/useUiStore.js';
import {
  useTasksQuery,
  useListsQuery,
  useUsersQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
} from '../hooks/useTodoQueries.js';
import {
  THEME_COLORS,
  PRESET_CUSTOM_COLORS,
  getThemePrimary,
  formatWholeListMessage,
  formatBatchTasksMessage,
  generateWhatsAppWebLink,
  DEFAULT_SORT_CONFIG,
  sortTasks,
  getSortDisplayLabel,
  fuzzyMatch,
  formatDueDateDisplay,
  formatReminderDisplay,
} from '@shared/todo';
import { cn } from '../lib/utils';

export default function TaskMainView({
  activeView,
  activeList,
  tasks = [],
  selectedTaskId,
  onSelectTask,
  onCreateTask,
  onToggleTaskComplete,
  onToggleTaskImportant,
  onOpenShareModal,
  onOpenWhatsAppModal,
  onUpdateListTheme,
  isDarkMode,
  onOpenSettings,
}) {
  const [taskInput, setTaskInput] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showBulkDueModal, setShowBulkDueModal] = useState(false);
  const [showBulkAssigneeModal, setShowBulkAssigneeModal] = useState(false);
  const [showLongPressShareModal, setShowLongPressShareModal] = useState(false);

  // Filter States
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterImportance, setFilterImportance] = useState('all');
  const [filterDue, setFilterDue] = useState('all');
  const [filterAssigneeId, setFilterAssigneeId] = useState('all');
  const [filterListId, setFilterListId] = useState('all');

  const taskInputRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const {
    isMultiSelectMode,
    selectedTaskIds,
    toggleMultiSelectMode,
    startMultiSelectWithTask,
    toggleSelectTaskForBatch,
    clearSelectedBatchTasks,
    sortPreferences,
    setViewSort,
  } = useUiStore();

  const { data: users = [] } = useUsersQuery();
  const { data: lists = [] } = useListsQuery(1);
  const { data: prefs } = useUserPreferencesQuery(1);
  const updatePrefs = useUpdateUserPreferencesMutation();

  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const updateListMutation = useUpdateListMutation();

  // Keyboard shortcut listener to focus task input on typing
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isEditable =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.isContentEditable;

      if (isEditable) return;

      if (
        e.key === 'Escape' ||
        e.key === 'Tab' ||
        e.key === 'Enter' ||
        e.key.startsWith('Arrow') ||
        e.key === 'Shift' ||
        e.key === 'Control' ||
        e.key === 'Alt' ||
        e.key === 'Meta'
      ) {
        return;
      }

      if (e.key.length === 1 && taskInputRef.current) {
        taskInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const viewKey = activeList ? `list_${activeList.id}` : `view_${activeView || 'all-tasks'}`;
  const currentSort = useMemo(() => sortPreferences[viewKey] || DEFAULT_SORT_CONFIG, [sortPreferences, viewKey]);

  const handleSelectSort = useCallback((config) => {
    setViewSort(viewKey, config);
    const updated = { ...sortPreferences, [viewKey]: config };
    updatePrefs.mutate({ sort_preferences: updated });
  }, [viewKey, sortPreferences, setViewSort, updatePrefs]);

  const getHeaderTitle = () => {
    if (activeList) return activeList.title;
    switch (activeView) {
      case 'important': return 'Important';
      case 'assigned-to-me': return 'Assigned to me';
      case 'all-tasks':
      default:
        return 'Tasks';
    }
  };

  const themePrimary = useMemo(() => {
    if (activeList) return getThemePrimary(activeList.color_theme || 'blue', isDarkMode);
    if (activeView === 'important') return '#f59e0b';
    if (activeView === 'assigned-to-me') return '#7c3aed';
    return '#0078d4';
  }, [activeList, activeView, isDarkMode]);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    onCreateTask({
      title: taskInput.trim(),
      is_important: activeView === 'important' ? 1 : 0,
      assigned_to_user_id: activeView === 'assigned-to-me' ? 1 : null,
      list_id: activeList ? activeList.id : null,
    });
    setTaskInput('');
  };

  // Touch / Long press
  const handlePointerDown = (taskId) => {
    longPressTimerRef.current = setTimeout(() => {
      startMultiSelectWithTask(taskId);
    }, 280);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

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
    window.open(waLink, '_blank');
  }, [selectedTaskIds, tasks, activeList, users]);

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

  const handleBulkDueDate = useCallback((dueDate) => {
    if (selectedTaskIds.length === 0) return;
    for (const taskId of selectedTaskIds) {
      updateTaskMutation.mutate({ id: taskId, due_date: dueDate });
    }
    clearSelectedBatchTasks();
  }, [selectedTaskIds, updateTaskMutation, clearSelectedBatchTasks]);

  const handleBulkAssignee = useCallback((userId) => {
    if (selectedTaskIds.length === 0) return;
    for (const taskId of selectedTaskIds) {
      updateTaskMutation.mutate({ id: taskId, assigned_to_user_id: userId });
    }
    clearSelectedBatchTasks();
  }, [selectedTaskIds, updateTaskMutation, clearSelectedBatchTasks]);

  const handleBulkDelete = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedTaskIds.length} selected tasks?`)) {
      for (const taskId of selectedTaskIds) {
        deleteTaskMutation.mutate(taskId);
      }
      clearSelectedBatchTasks();
    }
  }, [selectedTaskIds, deleteTaskMutation, clearSelectedBatchTasks]);

  // Filtering Logic (Declared before WhatsApp handlers that reference filteredTasks)
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const titleMatch = fuzzyMatch(task.title || '', searchQuery);
        const notesMatch = fuzzyMatch(task.notes || '', searchQuery);
        if (!titleMatch && !notesMatch) return false;
      }
      if (filterStatus === 'pending' && task.is_completed) return false;
      if (filterStatus === 'completed' && !task.is_completed) return false;
      if (activeView !== 'important' && !activeList) {
        if (filterImportance === 'important' && !task.is_important) return false;
        if (filterImportance === 'normal' && task.is_important) return false;
      }

      if (filterDue === 'today' && task.due_date !== todayStr) return false;
      if (filterDue === 'tomorrow' && task.due_date !== tomorrowStr) return false;
      if (filterDue === 'overdue' && (!task.due_date || task.due_date >= todayStr)) return false;
      if (filterDue === 'has_due' && !task.due_date) return false;
      if (filterDue === 'no_due' && task.due_date) return false;

      if (!activeList && filterListId !== 'all') {
        const tListIds = Array.isArray(task.list_ids) && task.list_ids.length > 0
          ? task.list_ids
          : (task.list_id ? [task.list_id] : []);
        if (!tListIds.includes(filterListId)) return false;
      }

      if (activeView !== 'assigned-to-me') {
        if (filterAssigneeId === 'unassigned' && task.assigned_to_user_id) return false;
        if (typeof filterAssigneeId === 'number' && task.assigned_to_user_id !== filterAssigneeId) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, filterStatus, filterImportance, filterDue, filterListId, filterAssigneeId, activeView, activeList]);

  // WhatsApp List Share
  const handleWhatsAppList = useCallback(() => {
    if (!activeList) return;
    const message = formatWholeListMessage(activeList, tasks);

    if (activeList.default_whatsapp_contact_id) {
      const defaultUser = users.find((u) => u.id === activeList.default_whatsapp_contact_id);
      const phone = defaultUser?.phone || activeList.default_whatsapp_contact_phone;
      if (phone) {
        window.open(generateWhatsAppWebLink(phone, message), '_blank');
        return;
      }
    }

    const assignedUserIds = tasks
      .map((t) => t.assigned_to_user_id)
      .filter((id) => typeof id === 'number' && id > 0);
    const uniqueAssignees = Array.from(new Set(assignedUserIds));
    if (tasks.length > 0 && uniqueAssignees.length === 1) {
      const singleUser = users.find((u) => u.id === uniqueAssignees[0]);
      if (singleUser?.phone) {
        updateListMutation.mutate({
          id: activeList.id,
          default_whatsapp_contact_id: singleUser.id,
        });
        window.open(generateWhatsAppWebLink(singleUser.phone, message), '_blank');
        return;
      }
    }

    setShowLongPressShareModal(true);
  }, [activeList, tasks, users, updateListMutation]);

  const handleExecuteLongPressShare = useCallback((scope) => {
    if (!activeList) return;
    let targetTasks = tasks;
    if (scope === 'pending') {
      targetTasks = tasks.filter((t) => !t.is_completed);
    } else if (scope === 'current_view') {
      targetTasks = filteredTasks;
    }
    const message = formatWholeListMessage(activeList, targetTasks);
    setShowLongPressShareModal(false);

    const defaultUser = activeList.default_whatsapp_contact_id
      ? users.find((u) => u.id === activeList.default_whatsapp_contact_id)
      : null;
    const phone = defaultUser?.phone || activeList.default_whatsapp_contact_phone || '';
    window.open(generateWhatsAppWebLink(phone, message), '_blank');
  }, [activeList, tasks, filteredTasks, users]);

  const sortedTasks = useMemo(() => {
    return sortTasks(filteredTasks, currentSort);
  }, [filteredTasks, currentSort]);

  const pendingTasks = sortedTasks.filter((t) => !t.is_completed);
  const completedTasks = sortedTasks.filter((t) => t.is_completed);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterImportance !== 'all') count++;
    if (filterDue !== 'all') count++;
    if (filterListId !== 'all') count++;
    if (filterAssigneeId !== 'all') count++;
    return count;
  }, [filterStatus, filterImportance, filterDue, filterListId, filterAssigneeId]);

  const handleResetFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterImportance('all');
    setFilterDue('all');
    setFilterAssigneeId('all');
    setFilterListId('all');
  }, []);

  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background relative select-none">
      {/* Header Banner */}
      <HeaderBanner
        headerTitle={getHeaderTitle()}
        formattedDate={formattedToday}
        pendingCount={pendingTasks.length}
        completedCount={completedTasks.length}
        activeList={activeList}
        isMultiSelectMode={isMultiSelectMode}
        onToggleMultiSelect={() => {
          if (isMultiSelectMode) clearSelectedBatchTasks();
          else toggleMultiSelectMode();
        }}
        onOpenShareModal={onOpenShareModal}
        onWhatsAppList={handleWhatsAppList}
        onLongPressWhatsApp={() => setShowLongPressShareModal(true)}
        onUpdateListTheme={onUpdateListTheme}
        onOpenSettings={onOpenSettings}
        isDarkMode={isDarkMode}
      />

      {/* Main Scrollable Tasks Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {/* Search, Sort, Filter Row OR Contextual Bulk Actions Bar */}
        {isMultiSelectMode && selectedTaskIds.length > 0 ? (
          <div className="sticky top-0 z-20 flex items-center justify-between min-h-[52px] p-3 px-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-2xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={clearSelectedBatchTasks}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-200">
                {selectedTaskIds.length} Selected
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleBulkShare}
                className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs hover:opacity-90"
                title="Bulk WhatsApp Share"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleBulkComplete}
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Toggle Complete"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleBulkImportant}
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-amber-400 flex items-center justify-center transition-all cursor-pointer"
                title="Toggle Star"
              >
                <Star className="w-4 h-4 fill-amber-400" />
              </button>

              <button
                type="button"
                onClick={() => setShowBulkDueModal(true)}
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Assign Due Date"
              >
                <Calendar className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowBulkAssigneeModal(true)}
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Assign Contact"
              >
                <UserCheck className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className="w-8 h-8 rounded-lg bg-red-500/25 hover:bg-red-500/40 text-red-400 flex items-center justify-center transition-all cursor-pointer"
                title="Delete Selected Tasks"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="flex-1 relative flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-card border border-border/80 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Trigger Button */}
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer relative shadow-xs',
                  activeFiltersCount > 0
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border/80 text-muted-foreground hover:text-foreground'
                )}
                title="Filter tasks"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-background">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Sort Trigger Button */}
              <button
                type="button"
                onClick={() => setShowSortModal(true)}
                className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer relative shadow-xs',
                  currentSort.field !== 'smart'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border/80 text-muted-foreground hover:text-foreground'
                )}
                title="Sort tasks"
              >
                <ArrowUpDown className="w-4 h-4" />
                {currentSort.field !== 'smart' && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 ring-2 ring-background" />
                )}
              </button>
            </div>

            {/* Active Sort & Filter Indicator Chips */}
            {(activeFiltersCount > 0 || currentSort.field !== 'smart') && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {currentSort.field !== 'smart' && (
                  <button
                    type="button"
                    onClick={() => setShowSortModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    <span>Sort: {getSortDisplayLabel(currentSort)}</span>
                  </button>
                )}

                {filterStatus !== 'all' && (
                  <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary text-xs font-bold">
                    Status: {filterStatus}
                  </span>
                )}

                {filterImportance !== 'all' && (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-500 text-xs font-bold">
                    {filterImportance}
                  </span>
                )}

                {filterDue !== 'all' && (
                  <span className="px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-500 text-xs font-bold">
                    Due: {filterDue}
                  </span>
                )}

                {!activeList && filterListId !== 'all' && (
                  <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-500 text-xs font-bold">
                    List: {lists.find((l) => l.id === filterListId)?.title || filterListId}
                  </span>
                )}

                {filterAssigneeId !== 'all' && (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                    Assignee: {filterAssigneeId === 'unassigned' ? 'Unassigned' : 'Specific'}
                  </span>
                )}

                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[260px] p-8 text-center border border-dashed border-border/80 rounded-3xl bg-card/40">
            <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No tasks yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              Add your first task below or clear your filters to stay organized.
            </p>
            {activeFiltersCount > 0 ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => taskInputRef.current?.focus()}
                className="rounded-full px-4 text-xs font-bold"
              >
                Add a Task
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Pending Tasks */}
            <div className="space-y-2">
              {pendingTasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                const isCheckedForBatch = selectedTaskIds.includes(task.id);
                const dueInfo = formatDueDateDisplay(task.due_date);
                const reminderInfo = formatReminderDisplay(task.reminder_time);
                const hasMetadata =
                  task.due_date ||
                  task.reminder_time ||
                  task.assignee_name ||
                  (task.subtask_count && task.subtask_count > 0) ||
                  (task.lists && task.lists.length > 0);

                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      if (isMultiSelectMode) {
                        toggleSelectTaskForBatch(task.id);
                      } else {
                        onSelectTask(task);
                      }
                    }}
                    onPointerDown={() => handlePointerDown(task.id)}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={cn(
                      'group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-150 shadow-xs cursor-pointer select-none',
                      isCheckedForBatch
                        ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-500 ring-1 ring-sky-500/30'
                        : isSelected
                        ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20'
                        : 'bg-card border-border/70 hover:border-primary/40 hover:bg-muted/30'
                    )}
                  >
                    {/* Left: Checkbox & Content */}
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isMultiSelectMode) {
                            toggleSelectTaskForBatch(task.id);
                          } else {
                            onToggleTaskComplete(task);
                          }
                        }}
                        className="w-8 h-8 -ml-1 flex items-center justify-center flex-shrink-0 cursor-pointer"
                        aria-label="Toggle complete"
                      >
                        {isCheckedForBatch ? (
                          <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : isMultiSelectMode ? (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-400 dark:border-slate-500 bg-background/60" />
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-400 dark:border-slate-500 group-hover:border-primary transition-colors bg-background/60" />
                        )}
                      </button>

                      {/* Task Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </div>

                        {hasMetadata && (
                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                            {dueInfo && (
                              <span
                                className={cn(
                                  'flex items-center gap-1 font-semibold',
                                  dueInfo.isOverdue
                                    ? 'text-destructive font-bold'
                                    : dueInfo.isToday
                                    ? 'text-primary font-bold'
                                    : 'text-muted-foreground'
                                )}
                              >
                                <Calendar className="w-3 h-3" />
                                {dueInfo.label}
                              </span>
                            )}

                            {Boolean(task.subtask_count && task.subtask_count > 0) && (
                              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 bg-muted/60 px-2 py-0.5 rounded-md">
                                <CheckSquare className="w-3 h-3" />
                                {task.subtask_completed_count || 0}/{task.subtask_count}
                              </span>
                            )}

                            {task.assignee_name && (
                              <span className="bg-muted/60 px-2 py-0.5 rounded-full font-medium truncate max-w-[100px]">
                                {task.assignee_name.split(' ')[0]}
                              </span>
                            )}

                            {task.lists && task.lists.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {task.lists.map((l) => (
                                  <span
                                    key={l.id}
                                    className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold text-[10px]"
                                  >
                                    {l.title}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Star Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTaskImportant(task);
                      }}
                      className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0',
                        task.is_important
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-muted-foreground/40 hover:text-amber-500 hover:bg-amber-500/10'
                      )}
                      title="Toggle importance"
                    >
                      <Star className={cn('w-4 h-4', task.is_important && 'fill-amber-500')} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Completed Tasks Group */}
            {completedTasks.length > 0 && (
              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors px-1 cursor-pointer"
                >
                  {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>Completed ({completedTasks.length})</span>
                </button>

                {showCompleted && (
                  <div className="space-y-1.5 opacity-75">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="group flex items-center justify-between p-2.5 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTaskComplete(task);
                            }}
                            className="w-8 h-8 -ml-1 flex items-center justify-center flex-shrink-0 text-primary cursor-pointer"
                          >
                            <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </button>
                          <span className="text-xs line-through text-muted-foreground font-medium truncate">
                            {task.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Docked Quick-Add Input Card */}
      <div className="p-3 sm:p-4 pt-2 pb-20 md:pb-3 flex-shrink-0 bg-background/90 backdrop-blur-md border-t border-border/50">
        <form
          onSubmit={handleAddTask}
          className="flex items-center gap-2 bg-card border border-border/80 pl-4 pr-1.5 py-1.5 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all"
        >
          <input
            ref={taskInputRef}
            type="text"
            placeholder={`Add a task to "${getHeaderTitle()}"...`}
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={!taskInput.trim()}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all cursor-pointer',
              taskInput.trim()
                ? 'bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-95'
                : 'bg-muted text-muted-foreground opacity-40 cursor-not-allowed'
            )}
            title="Add task"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>

      {/* Modals */}
      <SortModal
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        currentSort={currentSort}
        onSelectSort={handleSelectSort}
        themePrimary={themePrimary}
        viewTitle={getHeaderTitle()}
        isDarkMode={isDarkMode}
      />

      <FilterModal
        isOpen={showFilterModal}
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
        isSmartView={!activeList}
        onResetFilters={handleResetFilters}
      />

      <BulkDueDatePickerModal
        isOpen={showBulkDueModal}
        selectedCount={selectedTaskIds.length}
        onClose={() => setShowBulkDueModal(false)}
        onSelectDueDate={handleBulkDueDate}
      />

      <BulkAssigneePickerModal
        isOpen={showBulkAssigneeModal}
        selectedCount={selectedTaskIds.length}
        users={users}
        onClose={() => setShowBulkAssigneeModal(false)}
        onSelectAssignee={handleBulkAssignee}
      />

      <WhatsAppLongPressModal
        isOpen={showLongPressShareModal}
        onClose={() => setShowLongPressShareModal(false)}
        list={activeList}
        pendingCount={pendingTasks.length}
        allCount={tasks.length}
        filteredCount={filteredTasks.length}
        recipient={users.find((u) => u.id === activeList?.default_whatsapp_contact_id)}
        onExecuteShare={handleExecuteLongPressShare}
      />
    </main>
  );
}
