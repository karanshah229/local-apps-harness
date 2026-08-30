import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  Star,
  Check,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
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
  CheckCircle2,
  ListChecks,
  UserCheck,
} from 'lucide-react';
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

export default function SingleListView({ listId, onBack, onOpenShareModal, onOpenSettings }) {
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const isMultiSelectMode = useUiStore((s) => s.isMultiSelectMode);
  const selectedTaskIds = useUiStore((s) => s.selectedTaskIds);
  const toggleMultiSelectMode = useUiStore((s) => s.toggleMultiSelectMode);
  const startMultiSelectWithTask = useUiStore((s) => s.startMultiSelectWithTask);
  const toggleSelectTaskForBatch = useUiStore((s) => s.toggleSelectTaskForBatch);
  const clearSelectedBatchTasks = useUiStore((s) => s.clearSelectedBatchTasks);
  const setSelectedTaskId = useUiStore((s) => s.setSelectedTaskId);
  const sortPreferences = useUiStore((s) => s.sortPreferences);
  const setViewSort = useUiStore((s) => s.setViewSort);

  const [taskInput, setTaskInput] = useState('');
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
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

  const longPressTimerRef = useRef(null);
  const taskInputRef = useRef(null);

  const listsQuery = useListsQuery(1);
  const usersQuery = useUsersQuery();
  const tasksQuery = useTasksQuery({ listId, userId: 1 });

  const lists = listsQuery.data || [];
  const users = usersQuery.data || [];
  const tasks = tasksQuery.data || [];

  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const updateListMutation = useUpdateListMutation();
  const deleteListMutation = useDeleteListMutation();

  const { data: prefs } = useUserPreferencesQuery(1);
  const updatePrefs = useUpdateUserPreferencesMutation();

  const activeList = useMemo(() => lists.find((l) => l.id === listId), [lists, listId]);
  const viewKey = `list_${listId}`;
  const currentSort = useMemo(() => sortPreferences[viewKey] || DEFAULT_SORT_CONFIG, [sortPreferences, viewKey]);

  const handleSelectSort = useCallback((config) => {
    setViewSort(viewKey, config);
    const updated = { ...sortPreferences, [viewKey]: config };
    updatePrefs.mutate({ sort_preferences: updated });
  }, [viewKey, sortPreferences, setViewSort, updatePrefs]);

  const themePrimary = useMemo(() => {
    return getThemePrimary(activeList?.color_theme || 'blue', isDarkMode);
  }, [activeList?.color_theme, isDarkMode]);

  // Touch / Pointer Long-Press handler
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

  // Task Action Handlers
  const handleTaskClick = (task) => {
    if (isMultiSelectMode) {
      toggleSelectTaskForBatch(task.id);
    } else {
      setSelectedTaskId(task.id);
    }
  };

  const handleToggleComplete = (task, e) => {
    e?.stopPropagation?.();
    if (isMultiSelectMode) {
      toggleSelectTaskForBatch(task.id);
    } else {
      updateTaskMutation.mutate({
        id: task.id,
        is_completed: task.is_completed ? 0 : 1,
      });
    }
  };

  const handleToggleImportant = (task, e) => {
    e?.stopPropagation?.();
    updateTaskMutation.mutate({
      id: task.id,
      is_important: task.is_important ? 0 : 1,
    });
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    createTaskMutation.mutate({
      title: taskInput.trim(),
      list_id: listId,
      created_by: 1,
    });
    setTaskInput('');
    setShowQuickAddModal(false);
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

  // Filtering Logic
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const titleMatch = fuzzyMatch(task.title || '', searchQuery);
        const notesMatch = fuzzyMatch(task.notes || '', searchQuery);
        const assigneeMatch = fuzzyMatch(task.assignee_name || '', searchQuery);
        if (!titleMatch && !notesMatch && !assigneeMatch) return false;
      }
      if (filterStatus === 'pending' && task.is_completed) return false;
      if (filterStatus === 'completed' && !task.is_completed) return false;
      if (filterImportance === 'important' && !task.is_important) return false;
      if (filterImportance === 'normal' && task.is_important) return false;

      if (filterDue === 'today' && task.due_date !== todayStr) return false;
      if (filterDue === 'tomorrow' && task.due_date !== tomorrowStr) return false;
      if (filterDue === 'overdue' && (!task.due_date || task.due_date >= todayStr)) return false;
      if (filterDue === 'has_due' && !task.due_date) return false;
      if (filterDue === 'no_due' && task.due_date) return false;

      if (filterAssigneeId === 'unassigned' && task.assigned_to_user_id) return false;
      if (typeof filterAssigneeId === 'number' && task.assigned_to_user_id !== filterAssigneeId) return false;

      return true;
    });
  }, [tasks, searchQuery, filterStatus, filterImportance, filterDue, filterAssigneeId]);

  // WhatsApp List Share
  const handleWhatsAppList = useCallback(() => {
    if (!activeList) return;
    const scope = activeList.default_whatsapp_share_scope || 'pending';
    let targetTasks = tasks;
    if (scope === 'pending') {
      targetTasks = tasks.filter((t) => !t.is_completed);
    } else if (scope === 'current_view') {
      targetTasks = filteredTasks;
    }
    const message = formatWholeListMessage(activeList, targetTasks, { scope });

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
  }, [activeList, tasks, filteredTasks, users, updateListMutation]);

  const handleExecuteLongPressShare = useCallback((scope) => {
    if (!activeList) return;
    updateListMutation.mutate({
      id: activeList.id,
      default_whatsapp_share_scope: scope,
    });
    let targetTasks = tasks;
    if (scope === 'pending') {
      targetTasks = tasks.filter((t) => !t.is_completed);
    } else if (scope === 'current_view') {
      targetTasks = filteredTasks;
    }
    const message = formatWholeListMessage(activeList, targetTasks, { scope });
    setShowLongPressShareModal(false);

    const defaultUser = activeList.default_whatsapp_contact_id
      ? users.find((u) => u.id === activeList.default_whatsapp_contact_id)
      : null;
    const phone = defaultUser?.phone || activeList.default_whatsapp_contact_phone || '';
    window.open(generateWhatsAppWebLink(phone, message), '_blank');
  }, [activeList, tasks, filteredTasks, users, updateListMutation]);

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
    if (filterAssigneeId !== 'all') count++;
    return count;
  }, [filterStatus, filterImportance, filterDue, filterAssigneeId]);

  const handleResetFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterImportance('all');
    setFilterDue('all');
    setFilterAssigneeId('all');
  }, []);

  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b] text-foreground relative select-none pb-16">
      {/* Header Banner */}
      <HeaderBanner
        headerTitle={activeList?.title || 'List'}
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
        onUpdateListTheme={(listId, color) => updateListMutation.mutate({ id: listId, color_theme: color })}
        onDeleteList={() => {
          if (window.confirm(`Delete list "${activeList?.title}"?`)) {
            deleteListMutation.mutate(activeList.id);
            onBack?.();
          }
        }}
        onOpenSettings={onOpenSettings}
        isDarkMode={isDarkMode}
      />

      {/* Main Tasks List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Search, Sort, Filter Row OR Contextual Bulk Actions Bar */}
        {isMultiSelectMode && selectedTaskIds.length > 0 ? (
          <div className="sticky top-0 z-20 flex items-center justify-between min-h-[54px] p-2.5 px-3.5 rounded-2xl bg-[#1e293b] text-white border border-[#334155] shadow-2xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelectedBatchTasks}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="text-xs font-black text-white">
                {selectedTaskIds.length} Selected
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleBulkShare}
                className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs hover:opacity-90 active:scale-95"
                title="Bulk WhatsApp Share"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleBulkComplete}
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Toggle Complete"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleBulkImportant}
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-amber-400 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Toggle Star"
              >
                <Star className="w-4 h-4 fill-amber-400" />
              </button>

              <button
                type="button"
                onClick={() => setShowBulkDueModal(true)}
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Assign Due Date"
              >
                <Calendar className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowBulkAssigneeModal(true)}
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Assign Contact"
              >
                <UserCheck className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className="w-9 h-9 rounded-xl bg-red-500/25 hover:bg-red-500/40 text-red-400 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Delete Selected Tasks"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              {/* Search Bar */}
              <div className="flex-1 h-[52px] relative flex items-center bg-[#18181b] border border-[#27272a] rounded-2xl px-3.5 shadow-xs focus-within:border-sky-500 transition-colors">
                <Search className="w-4 h-4 text-[#71717a] mr-2.5 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-[#71717a] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#71717a] hover:text-white cursor-pointer ml-1"
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
                  'w-[52px] h-[52px] rounded-2xl flex items-center justify-center border transition-all cursor-pointer relative shadow-xs flex-shrink-0',
                  activeFiltersCount > 0
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'bg-[#18181b] border-[#27272a] text-white hover:border-[#3f3f46]'
                )}
                title="Filter tasks"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[10px] font-black text-white flex items-center justify-center ring-2 ring-[#09090b]">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Sort Trigger Button */}
              <button
                type="button"
                onClick={() => setShowSortModal(true)}
                className={cn(
                  'w-[52px] h-[52px] rounded-2xl flex items-center justify-center border transition-all cursor-pointer relative shadow-xs flex-shrink-0',
                  currentSort.field !== 'smart'
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'bg-[#18181b] border-[#27272a] text-white hover:border-[#3f3f46]'
                )}
                title="Sort tasks"
              >
                <ArrowUpDown className="w-4 h-4" />
                {currentSort.field !== 'smart' && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 ring-2 ring-[#09090b]" />
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
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/25 text-xs font-bold hover:bg-sky-500/25 transition-colors cursor-pointer"
                  >
                    <span>Sort: {getSortDisplayLabel(currentSort)}</span>
                  </button>
                )}

                {filterStatus !== 'all' && (
                  <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-400 text-xs font-bold">
                    Status: {filterStatus}
                  </span>
                )}

                {filterImportance !== 'all' && (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-400 text-xs font-bold">
                    {filterImportance}
                  </span>
                )}

                {filterDue !== 'all' && (
                  <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-400 text-xs font-bold">
                    Due: {filterDue}
                  </span>
                )}

                {filterAssigneeId !== 'all' && (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold">
                    Assignee: {filterAssigneeId === 'unassigned' ? 'Unassigned' : 'Specific'}
                  </span>
                )}

                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Task Cards List */}
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[240px] p-8 text-center border border-dashed border-[#27272a] rounded-3xl bg-[#18181b]/50 mt-2">
            <div className="w-14 h-14 rounded-3xl bg-sky-500/15 text-sky-400 flex items-center justify-center mb-3 shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No tasks yet</h3>
            <p className="text-xs text-[#a1a1aa] max-w-xs mt-1 mb-4">
              Tap the <span className="text-sky-400 font-bold">+</span> button below to create your first task.
            </p>
          </div>
        ) : (
          <>
            {/* Pending Tasks */}
            <div className="space-y-2.5">
              {pendingTasks.map((task) => {
                const isCheckedForBatch = selectedTaskIds.includes(task.id);
                const dueInfo = formatDueDateDisplay(task.due_date);

                return (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    onPointerDown={() => handlePointerDown(task.id)}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={cn(
                      'group flex items-center justify-between p-4 rounded-2xl transition-all duration-150 shadow-xs cursor-pointer select-none',
                      isCheckedForBatch
                        ? 'bg-sky-500/20 border-2 border-sky-500 ring-1 ring-sky-500/40'
                        : 'bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46]'
                    )}
                  >
                    {/* Left: Checkbox & Content */}
                    <div className="flex items-center gap-3.5 overflow-hidden flex-1 min-w-0 pr-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleComplete(task, e)}
                        className="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
                        style={{
                          borderColor: isCheckedForBatch ? '#0078d4' : '#52525b',
                          backgroundColor: isCheckedForBatch ? '#0078d4' : 'transparent',
                        }}
                        aria-label="Toggle complete"
                      >
                        {isCheckedForBatch && (
                          <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                        )}
                      </button>

                      {/* Task Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="text-[15px] font-bold text-white truncate">
                          {task.title}
                        </div>

                        {/* Metadata Tags */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          {dueInfo && (
                            <span
                              className={cn(
                                'flex items-center gap-1 font-bold',
                                dueInfo.isOverdue
                                  ? 'text-red-400'
                                  : dueInfo.isToday
                                  ? 'text-sky-400'
                                  : 'text-[#a1a1aa]'
                              )}
                            >
                              <Calendar className="w-3 h-3" />
                              {dueInfo.label}
                            </span>
                          )}

                          {Boolean(task.subtask_count && task.subtask_count > 0) && (
                            <span className="flex items-center gap-1 font-bold text-[#a1a1aa] bg-[#27272a] px-2 py-0.5 rounded-md">
                              <CheckSquare className="w-3 h-3" />
                              {task.subtask_completed_count || 0}/{task.subtask_count}
                            </span>
                          )}

                          {task.assignee_name && (
                            <span className="bg-[#27272a] text-[#a1a1aa] px-2 py-0.5 rounded-md font-semibold truncate max-w-[100px]">
                              {task.assignee_name.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Star Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleImportant(task, e)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                      title="Toggle importance"
                    >
                      <Star
                        className={cn(
                          'w-5 h-5 transition-transform active:scale-125',
                          task.is_important
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-[#52525b] hover:text-amber-400'
                        )}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Completed Tasks Group */}
            {completedTasks.length > 0 && (
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-2 text-xs font-bold text-[#a1a1aa] uppercase tracking-wider hover:text-white transition-colors px-1 cursor-pointer"
                >
                  {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>COMPLETED ({completedTasks.length})</span>
                </button>

                {showCompleted && (
                  <div className="space-y-1.5 opacity-80">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="group flex items-center justify-between p-3.5 rounded-2xl bg-[#18181b]/60 border border-[#27272a]/70 hover:bg-[#18181b] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => handleToggleComplete(task, e)}
                            className="w-5 h-5 rounded-md bg-sky-500 text-white flex items-center justify-center flex-shrink-0 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <span className="text-sm line-through text-[#71717a] font-medium truncate">
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

      {/* Floating Action Button (FAB) for Add Task */}
      <button
        type="button"
        onClick={() => setShowQuickAddModal(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#0078d4] hover:bg-[#006cbd] text-white flex items-center justify-center shadow-2xl z-30 transition-transform active:scale-90 cursor-pointer"
        title="Add a task"
        aria-label="Add a task"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Quick Add Modal Sheet */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in-50">
          <div className="w-full sm:max-w-md bg-[#18181b] border border-[#27272a] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Add Task to "{activeList?.title}"</h3>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="text-[#a1a1aa] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <input
                ref={taskInputRef}
                type="text"
                autoFocus
                placeholder="What needs to be done?"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[#27272a] border border-[#3f3f46] text-sm font-semibold text-white placeholder:text-[#71717a] focus:outline-none focus:border-sky-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#a1a1aa] hover:bg-[#27272a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!taskInput.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-[#0078d4] text-white disabled:opacity-40 shadow-xs"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <SortModal
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        currentSort={currentSort}
        onSelectSort={handleSelectSort}
        themePrimary={themePrimary}
        viewTitle={activeList?.title || 'List'}
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
        filterListId="all"
        setFilterListId={() => {}}
        users={users}
        lists={lists}
        isSmartView={false}
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
    </div>
  );
}
