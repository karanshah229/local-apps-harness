import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useUiStore } from '../store/useUiStore.js';
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
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const taskInputRef = useRef(null);

  const {
    isMultiSelectMode,
    selectedTaskIds,
    toggleMultiSelectMode,
    toggleSelectTaskForBatch,
    clearSelectedBatchTasks,
  } = useUiStore();

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

  const themeColors = ['blue', 'purple', 'green', 'orange', 'red', 'dark'];

  const getHeaderTitle = () => {
    if (activeList) return activeList.title;
    switch (activeView) {
      case 'important':
        return 'Important';
      case 'assigned-to-me':
        return 'Assigned to me';
      case 'all-tasks':
      default:
        return 'Tasks';
    }
  };

  const getThemeGradient = () => {
    if (activeList) {
      return `theme-gradient-${activeList.color_theme || 'blue'}`;
    }
    if (activeView === 'important') return 'theme-gradient-orange';
    if (activeView === 'assigned-to-me') return 'theme-gradient-purple';
    return 'theme-gradient-blue';
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    onCreateTask({
      title: taskInput.trim(),
      is_important: activeView === 'important' ? 1 : 0,
      list_id: activeList ? activeList.id : null,
    });
    setTaskInput('');
  };

  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const pendingTasks = tasks.filter((t) => !t.is_completed);
  const completedTasks = tasks.filter((t) => t.is_completed);

  const formatDueDateDisplay = (dueDate) => {
    if (!dueDate) return null;
    try {
      const parts = dueDate.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(d);
        target.setHours(0, 0, 0, 0);
        const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
        const formatted = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        if (diffDays === 0) return { label: 'Today', isOverdue: false, isToday: true };
        if (diffDays === 1) return { label: 'Tomorrow', isOverdue: false, isToday: false };
        if (diffDays < 0) return { label: `Overdue, ${formatted}`, isOverdue: true, isToday: false };
        return { label: formatted, isOverdue: false, isToday: false };
      }
      return { label: dueDate, isOverdue: false, isToday: false };
    } catch {
      return { label: dueDate, isOverdue: false, isToday: false };
    }
  };

  const formatReminderDisplay = (reminderTime) => {
    if (!reminderTime) return null;
    try {
      const cleaned = reminderTime.replace(' ', 'T');
      const d = new Date(cleaned);
      if (isNaN(d.getTime())) return reminderTime;
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      const timeStr = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return isToday ? `Today ${timeStr}` : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${timeStr}`;
    } catch {
      return reminderTime;
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background relative select-none">
      {/* Top Header Banner Card */}
      <div className="flex-shrink-0 p-3 sm:p-4 pb-0 z-10">
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white shadow-lg transition-all duration-300',
            getThemeGradient()
          )}
        >
          {/* Subtle Ambient Light Decoration */}
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-1 overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                <span>{formattedToday}</span>
                {activeList?.members?.length > 0 && (
                  <Badge variant="glass" className="text-[10px] px-2 py-0.5 rounded-full">
                    Shared with {activeList.members.length}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate drop-shadow-xs">
                {getHeaderTitle()}
              </h1>
              <div className="text-xs font-medium text-white/85">
                {pendingTasks.length} pending • {completedTasks.length} completed
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                type="button"
                variant="glass"
                size="sm"
                className={cn(
                  'h-9 px-3 rounded-xl font-bold text-xs gap-1.5 transition-all active:scale-95',
                  isMultiSelectMode && 'bg-white text-slate-900 shadow-md font-extrabold'
                )}
                onClick={toggleMultiSelectMode}
                title="Select multiple tasks"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isMultiSelectMode ? 'Cancel' : 'Select'}</span>
              </Button>

              {activeList && (
                <>
                  <Button
                    type="button"
                    variant="glass"
                    size="icon"
                    className="w-9 h-9 rounded-xl transition-all active:scale-95"
                    onClick={() => onOpenShareModal(activeList)}
                    title="Share list with contacts"
                    aria-label="Share list"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="glass"
                    size="icon"
                    className="w-9 h-9 rounded-xl bg-[#25D366]/80 hover:bg-[#25D366] text-white transition-all active:scale-95"
                    onClick={() =>
                      onOpenWhatsAppModal({
                        type: 'list',
                        listId: activeList.id,
                      })
                    }
                    title="Send full list via WhatsApp"
                    aria-label="WhatsApp Full List"
                  >
                    <Send className="w-4 h-4" />
                  </Button>

                  {/* Theme Color Picker */}
                  <div className="relative">
                    <Button
                      type="button"
                      variant="glass"
                      size="icon"
                      className="w-9 h-9 rounded-xl transition-all active:scale-95"
                      onClick={() => setShowThemePicker(!showThemePicker)}
                      title="Change List Theme"
                      aria-label="Change Theme"
                    >
                      <Palette className="w-4 h-4" />
                    </Button>

                    {showThemePicker && (
                      <div className="absolute right-0 top-12 bg-card p-2 rounded-2xl shadow-2xl border border-border flex gap-2 z-30 animate-in fade-in-50 zoom-in-95">
                        {themeColors.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              onUpdateListTheme(activeList.id, c);
                              setShowThemePicker(false);
                            }}
                            className={cn(
                              'w-7 h-7 rounded-full shadow-xs transition-transform active:scale-90',
                              c === 'blue' && 'bg-[#0078d4]',
                              c === 'purple' && 'bg-[#742774]',
                              c === 'green' && 'bg-[#107c41]',
                              c === 'orange' && 'bg-[#d83b01]',
                              c === 'red' && 'bg-[#e81123]',
                              c === 'dark' && 'bg-[#2b2b2b]',
                              activeList.color_theme === c && 'ring-2 ring-offset-2 ring-primary'
                            )}
                            aria-label={`Theme ${c}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Settings Action */}
              <Button
                type="button"
                variant="glass"
                size="icon"
                className="w-9 h-9 rounded-xl transition-all active:scale-95"
                onClick={onOpenSettings}
                title="Settings"
                aria-label="Open Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scrollable Tasks Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {/* Floating Multi-Select Action Bar */}
        {isMultiSelectMode && selectedTaskIds.length > 0 && (
          <div className="sticky top-0 z-20 flex items-center justify-between min-h-[52px] p-3 px-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-2xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                {selectedTaskIds.length}
              </div>
              <span className="text-xs font-bold text-slate-200">
                Task{selectedTaskIds.length > 1 ? 's' : ''} Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="whatsapp"
                size="sm"
                className="h-8 px-3 text-xs font-bold gap-1.5 shadow-sm active:scale-95"
                onClick={() =>
                  onOpenWhatsAppModal({
                    type: 'batch',
                    taskIds: selectedTaskIds,
                  })
                }
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send WhatsApp</span>
              </Button>

              <button
                type="button"
                onClick={clearSelectedBatchTasks}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] p-8 text-center border border-dashed border-border/80 rounded-3xl bg-card/40">
            <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-xs">
              <Sparkles className="w-7 h-7 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-foreground">No tasks yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              Add your first task below or pick a category from the sidebar to stay organized.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => taskInputRef.current?.focus()}
              className="rounded-full px-4 text-xs font-bold"
            >
              Add a Task
            </Button>
          </div>
        ) : (
          <>
            {/* Pending Tasks List */}
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
                  task.subtask_count > 0 ||
                  (task.lists && task.lists.length > 0);

                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={cn(
                      'group flex items-center justify-between p-3 rounded-2xl border transition-all duration-150 shadow-xs cursor-pointer',
                      isCheckedForBatch
                        ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-500 ring-1 ring-sky-500/30'
                        : isSelected
                        ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20'
                        : 'bg-card border-border/70 hover:border-primary/40 hover:bg-muted/30'
                    )}
                  >
                    {/* Left: Checkbox & Content */}
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                      {isMultiSelectMode ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectTaskForBatch(task.id);
                          }}
                          className="w-9 h-9 -ml-1.5 flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label="Select task for batch"
                        >
                          {isCheckedForBatch ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <div className="w-5 h-5 rounded-md border-2 border-slate-400 dark:border-slate-500 group-hover:border-primary transition-colors bg-background/60" />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTaskComplete(task);
                          }}
                          className="w-9 h-9 -ml-1.5 flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                          aria-label="Toggle complete"
                        >
                          <div className="w-5 h-5 rounded-md border-2 border-slate-400 dark:border-slate-500 group-hover:border-primary transition-colors flex items-center justify-center bg-background/60" />
                        </button>
                      )}

                      {/* Task Info & Metadata Badges */}
                      <div className="flex-1 min-w-0 overflow-hidden space-y-1">
                        <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </div>

                        {hasMetadata && (
                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                            {/* Steps Progress */}
                            {task.subtask_count > 0 && (
                              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                                <CheckSquare className="w-3 h-3" />
                                {task.subtask_completed_count}/{task.subtask_count}
                              </span>
                            )}

                            {/* Due Date */}
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

                            {/* Reminder Time */}
                            {reminderInfo && (
                              <span className="flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400">
                                <Clock className="w-3 h-3" />
                                {reminderInfo}
                              </span>
                            )}

                            {/* Assignee */}
                            {task.assignee_name && (
                              <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded-full font-medium">
                                <Avatar className="w-4 h-4">
                                  <AvatarImage
                                    src={
                                      task.assignee_avatar ||
                                      `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(task.assignee_name)}`
                                    }
                                  />
                                  <AvatarFallback className="text-[8px]">
                                    {task.assignee_name.slice(0, 1)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[90px]">{task.assignee_name.split(' ')[0]}</span>
                              </div>
                            )}

                            {/* List Tags */}
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

                    {/* Right: Important Star Button */}
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
                      title={task.is_important ? 'Remove importance' : 'Mark as important'}
                      aria-label="Toggle importance"
                    >
                      <Star
                        className={cn(
                          'w-4 h-4',
                          task.is_important && 'fill-amber-500'
                        )}
                      />
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
                            aria-label="Uncomplete task"
                          >
                            <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </button>

                          <div className="flex-1 min-w-0 truncate">
                            <span className="text-xs line-through text-muted-foreground font-medium truncate">
                              {task.title}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTaskImportant(task);
                          }}
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer',
                            task.is_important ? 'text-amber-500' : 'text-muted-foreground/30 hover:text-amber-500'
                          )}
                          aria-label="Toggle importance"
                        >
                          <Star className={cn('w-3.5 h-3.5', task.is_important && 'fill-amber-500')} />
                        </button>
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
          <Button
            type="submit"
            size="icon"
            disabled={!taskInput.trim()}
            className={cn(
              'w-8 h-8 rounded-xl flex-shrink-0 transition-all cursor-pointer',
              taskInput.trim()
                ? 'bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-95'
                : 'bg-muted text-muted-foreground opacity-40 cursor-not-allowed'
            )}
            title="Add task"
            aria-label="Add task"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </Button>
        </form>
      </div>
    </main>
  );
}
