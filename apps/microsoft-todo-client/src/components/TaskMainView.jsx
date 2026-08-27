import React, { useState } from 'react';
import {
  Plus,
  Star,
  Check,
  Calendar,
  Share2,
  Send,
  MoreHorizontal,
  Palette,
  CheckSquare,
  Square,
  Sun,
  Moon,
  CheckCircle2,
  Circle,
  ListTodo
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

export default function TaskMainView({
  activeView,
  activeList,
  tasks,
  selectedTaskId,
  onSelectTask,
  onCreateTask,
  onToggleTaskComplete,
  onToggleTaskImportant,
  onOpenShareModal,
  onOpenWhatsAppModal,
  onUpdateListTheme,
  isDarkMode,
  onToggleDarkMode
}) {
  const [taskInput, setTaskInput] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

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
    if (activeView === 'important') return 'theme-gradient-purple';
    if (activeView === 'assigned-to-me') return 'theme-gradient-orange';
    return 'theme-gradient-blue';
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    onCreateTask({
      title: taskInput.trim(),
      is_important: activeView === 'important' ? 1 : 0,
      list_id: activeList ? activeList.id : null
    });
    setTaskInput('');
  };

  const toggleSelectTaskForBatch = (taskId, e) => {
    e.stopPropagation();
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header Banner */}
      <div
        className={cn(
          'text-white p-4 pt-safe sm:p-6 transition-all duration-300 shadow-md flex-shrink-0',
          getThemeGradient()
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Title and date */}
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                {getHeaderTitle()}
              </h1>
              {activeList && activeList.members && activeList.members.length > 0 && (
                <div
                  className="flex items-center -space-x-2 flex-shrink-0"
                  title={`Shared with ${activeList.members.length} member(s)`}
                >
                  {activeList.members.map((m) => (
                    <img
                      key={m.id}
                      src={
                        m.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`
                      }
                      alt={m.name}
                      className="w-6 h-6 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-white/80 font-medium mt-0.5">{formattedToday}</p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Multi-select toggle */}
            <Button
              type="button"
              variant="glass"
              size="iconSm"
              className={cn(
                'min-h-[40px] min-w-[40px] rounded-xl',
                isMultiSelectMode && 'bg-white text-blue-900 font-bold'
              )}
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedTaskIds([]);
              }}
              title={isMultiSelectMode ? 'Cancel Selection' : 'Select Tasks'}
              aria-label="Multi-select tasks"
            >
              {isMultiSelectMode ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </Button>

            {/* Custom List Actions: Share, WhatsApp, Theme */}
            {activeList && (
              <>
                <Button
                  type="button"
                  variant="glass"
                  size="iconSm"
                  className="min-h-[40px] min-w-[40px] rounded-xl"
                  onClick={() => onOpenShareModal(activeList)}
                  title="Share List"
                  aria-label="Share List"
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                <Button
                  type="button"
                  variant="glass"
                  size="iconSm"
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-[#25D366]/80 hover:bg-[#25D366] text-white"
                  onClick={() =>
                    onOpenWhatsAppModal({ type: 'list', listId: activeList.id })
                  }
                  title="WhatsApp Full List"
                  aria-label="WhatsApp Full List"
                >
                  <Send className="w-4 h-4" />
                </Button>

                <div className="relative">
                  <Button
                    type="button"
                    variant="glass"
                    size="iconSm"
                    className="min-h-[40px] min-w-[40px] rounded-xl"
                    onClick={() => setShowThemePicker(!showThemePicker)}
                    title="Change Theme Color"
                    aria-label="Change Theme Color"
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
                            'w-7 h-7 rounded-full shadow-sm transition-transform active:scale-90',
                            c === 'blue' && 'bg-blue-600',
                            c === 'purple' && 'bg-purple-600',
                            c === 'green' && 'bg-emerald-600',
                            c === 'orange' && 'bg-orange-500',
                            c === 'red' && 'bg-red-600',
                            c === 'dark' && 'bg-zinc-800',
                            activeList.color_theme === c &&
                              'ring-2 ring-offset-2 ring-primary'
                          )}
                          aria-label={`Theme ${c}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Dark / Light Mode Toggle */}
            <Button
              type="button"
              variant="glass"
              size="iconSm"
              className="min-h-[40px] min-w-[40px] rounded-xl"
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-yellow-300" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Add Task Input Card */}
      <div className="p-3 sm:p-4 pb-2 flex-shrink-0">
        <form
          onSubmit={handleAddTask}
          className="flex items-center gap-3 bg-card border border-border p-2.5 sm:p-3 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all"
        >
          <div className="p-1 rounded-full bg-primary/10 text-primary">
            <Plus className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder={`Add a task to "${getHeaderTitle()}"...`}
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {taskInput.trim() && (
            <Button type="submit" size="sm" className="h-9 px-3 rounded-xl font-bold">
              Add
            </Button>
          )}
        </form>
      </div>

      {/* Scrollable Tasks Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 pt-1 space-y-2 pb-24 md:pb-6">
        {/* Batch Selection Action Bar */}
        {isMultiSelectMode && selectedTaskIds.length > 0 && (
          <div className="sticky top-0 z-20 flex items-center justify-between p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg animate-in slide-in-from-top-2">
            <span className="text-xs sm:text-sm font-bold">
              {selectedTaskIds.length} Task(s) Selected
            </span>
            <Button
              type="button"
              variant="whatsapp"
              size="sm"
              className="h-9 px-3 text-xs font-bold gap-1.5 shadow"
              onClick={() =>
                onOpenWhatsAppModal({
                  type: 'batch',
                  taskIds: selectedTaskIds
                })
              }
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send WhatsApp Digest ({selectedTaskIds.length})</span>
            </Button>
          </div>
        )}

        {/* Empty State */}
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center mb-3">
              <ListTodo className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-base font-bold text-foreground">No tasks here yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Stay organized by adding tasks above or assigning them from your lists.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const isSelected = selectedTaskId === task.id;
            const isCheckedForBatch = selectedTaskIds.includes(task.id);

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={cn(
                  'group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-150 shadow-sm cursor-pointer min-h-[56px] touch-manipulation',
                  isSelected
                    ? 'bg-primary/10 border-primary shadow-md'
                    : 'bg-card border-border hover:bg-muted/40',
                  task.is_completed && 'opacity-70 bg-muted/20'
                )}
              >
                {/* Left: Checkbox & Content */}
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  {isMultiSelectMode ? (
                    <button
                      type="button"
                      onClick={(e) => toggleSelectTaskForBatch(task.id, e)}
                      className="min-h-[44px] min-w-[44px] -m-2 flex items-center justify-center touch-manipulation flex-shrink-0"
                      aria-label="Select task for batch"
                    >
                      {isCheckedForBatch ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTaskComplete(task);
                      }}
                      className="min-h-[44px] min-w-[44px] -m-2 flex items-center justify-center touch-manipulation flex-shrink-0"
                      aria-label="Toggle task status"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>
                  )}

                  <div className="overflow-hidden flex-1">
                    <span
                      className={cn(
                        'text-sm font-medium text-foreground block truncate leading-tight',
                        task.is_completed && 'line-through text-muted-foreground'
                      )}
                    >
                      {task.title}
                    </span>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                          <Calendar className="w-3 h-3" /> {task.due_date}
                        </span>
                      )}
                      {task.subtask_count > 0 && (
                        <span className="bg-muted px-1.5 py-0.5 rounded-md font-medium">
                          {task.subtask_completed_count}/{task.subtask_count} steps
                        </span>
                      )}
                      {task.assignee_name && (
                        <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-full font-medium text-foreground">
                          <img
                            src={
                              task.assignee_avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignee_name}`
                            }
                            alt={task.assignee_name}
                            className="w-3.5 h-3.5 rounded-full object-cover"
                          />
                          <span>{task.assignee_name.split(' ')[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Star Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTaskImportant(task);
                  }}
                  className="min-h-[44px] min-w-[44px] -m-2 flex items-center justify-center touch-manipulation text-muted-foreground hover:text-amber-500 flex-shrink-0 transition-transform active:scale-125"
                  title={task.is_important ? 'Unmark Important' : 'Mark Important'}
                  aria-label="Toggle Important"
                >
                  <Star
                    className={cn(
                      'w-5 h-5',
                      task.is_important &&
                        'text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400'
                    )}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
