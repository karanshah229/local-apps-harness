import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  X,
  Calendar,
  Clock,
  User as UserIcon,
  Trash2,
  Send,
  Plus,
  Check,
  FileText,
  CheckSquare,
  Square,
  Search,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { cn } from '../lib/utils';

export default function TaskDetailDrawer({
  task,
  users = [],
  lists = [],
  onClose,
  onUpdateTask,
  onCreateTask,
  onDeleteTask,
  onOpenWhatsAppModal,
}) {
  const isDraft = !task || !task.id || task.id <= 0;

  const [subtasks, setSubtasks] = useState([]);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [notes, setNotes] = useState(task?.notes || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task?.title || '');
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showListPicker, setShowListPicker] = useState(false);
  const [listSearch, setListSearch] = useState('');

  // Draft / Optimistic states
  const [draftListIds, setDraftListIds] = useState([]);
  const [draftAssigneeId, setDraftAssigneeId] = useState(null);
  const [draftDueDate, setDraftDueDate] = useState(null);
  const [draftReminderTime, setDraftReminderTime] = useState(null);
  const [draftIsImportant, setDraftIsImportant] = useState(0);
  const [draftIsCompleted, setDraftIsCompleted] = useState(0);

  const dateInputRef = useRef(null);
  const reminderInputRef = useRef(null);

  useEffect(() => {
    if (task) {
      setNotes(task.notes || '');
      setTitleValue(task.title || '');
      const rawListIds = Array.isArray(task.list_ids) && task.list_ids.length > 0
        ? task.list_ids
        : (Array.isArray(task.lists) && task.lists.length > 0
            ? task.lists.map((l) => l.id)
            : (task.list_id ? [task.list_id] : []));
      setDraftListIds(rawListIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0));
      setDraftAssigneeId(task.assigned_to_user_id ? Number(task.assigned_to_user_id) : null);
      setDraftDueDate(task.due_date || null);
      setDraftReminderTime(task.reminder_time || null);
      setDraftIsImportant(task.is_important ? 1 : 0);
      setDraftIsCompleted(task.is_completed ? 1 : 0);

      if (task.id > 0) {
        fetchSubtasks(task.id);
      } else {
        setSubtasks([]);
      }
    }
  }, [
    task?.id,
    task?.is_completed,
    task?.is_important,
    task?.due_date,
    task?.reminder_time,
    task?.assigned_to_user_id,
    task?.title,
    task?.notes,
    JSON.stringify(task?.list_ids || task?.lists || task?.list_id)
  ]);

  const fetchSubtasks = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      if (res.ok) {
        const data = await res.json();
        setSubtasks(data);
      }
    } catch (err) {
      console.error('Error fetching subtasks:', err);
    }
  };

  const handleSaveDraft = async () => {
    if (!titleValue.trim()) {
      onClose();
      return;
    }
    if (onCreateTask) {
      await onCreateTask({
        title: titleValue.trim(),
        notes: notes.trim() || null,
        is_important: draftIsImportant,
        is_completed: draftIsCompleted,
        due_date: draftDueDate,
        reminder_time: draftReminderTime,
        assigned_to_user_id: draftAssigneeId,
        list_ids: draftListIds,
        draft_subtasks: subtasks.map((s) => s.title),
      });
    }
    onClose();
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newStepTitle.trim() || !task) return;

    if (isDraft) {
      setSubtasks([
        ...subtasks,
        {
          id: Date.now(),
          title: newStepTitle.trim(),
          is_completed: 0,
        },
      ]);
      setNewStepTitle('');
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newStepTitle.trim() }),
      });
      if (res.ok) {
        const step = await res.json();
        setSubtasks([...subtasks, step]);
        setNewStepTitle('');
        onUpdateTask({ id: task.id, updated_at: Date.now() });
      }
    } catch (err) {
      console.error('Error adding subtask:', err);
    }
  };

  const handleToggleSubtask = async (subtask) => {
    const newStatus = subtask.is_completed ? 0 : 1;
    const nextSubtasks = subtasks.map((s) =>
      s.id === subtask.id ? { ...s, is_completed: newStatus } : s
    );
    setSubtasks(nextSubtasks);

    if (isDraft) return;

    try {
      const allCompleted =
        nextSubtasks.length > 0 &&
        nextSubtasks.every((s) => s.is_completed === 1);

      const res = await fetch(`/api/subtasks/${subtask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: newStatus }),
      });
      if (res.ok) {
        if (allCompleted && !task.is_completed) {
          setDraftIsCompleted(1);
          onUpdateTask({ id: task.id, is_completed: 1 });
        } else {
          onUpdateTask({ id: task.id, updated_at: Date.now() });
        }
      }
    } catch (err) {
      console.error('Error updating subtask:', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    setSubtasks(subtasks.filter((s) => s.id !== subtaskId));
    if (isDraft) return;

    try {
      await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
      onUpdateTask({ id: task.id, updated_at: Date.now() });
    } catch (err) {
      console.error('Error deleting subtask:', err);
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (!titleValue.trim()) {
      setTitleValue(task.title || 'Untitled Task');
      return;
    }
    if (!isDraft && titleValue.trim() !== task.title) {
      onUpdateTask({
        id: task.id,
        title: titleValue.trim(),
      });
    }
  };

  const handleNotesBlur = () => {
    if (!isDraft && notes !== task.notes) {
      onUpdateTask({
        id: task.id,
        notes: notes.trim() || null,
      });
    }
  };

  const handleToggleListMembership = (listId) => {
    const numId = Number(listId);
    let nextListIds;
    if (draftListIds.includes(numId)) {
      nextListIds = draftListIds.filter((id) => id !== numId);
    } else {
      nextListIds = [...draftListIds, numId];
    }
    setDraftListIds(nextListIds);

    if (!isDraft) {
      onUpdateTask({
        id: task.id,
        list_ids: nextListIds,
        list_id: nextListIds[0] || null,
      });
    }
  };

  const handleSelectAssignee = (userId) => {
    if (isDraft) {
      setDraftAssigneeId(userId);
    } else {
      onUpdateTask({
        id: task.id,
        assigned_to_user_id: userId,
      });
    }
    setShowAssigneePicker(false);
    setAssigneeSearch('');
  };

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      try {
        if (typeof dateInputRef.current.showPicker === 'function') {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch {
        dateInputRef.current.focus();
      }
    }
  };

  const handleOpenReminderPicker = () => {
    if (reminderInputRef.current) {
      try {
        if (typeof reminderInputRef.current.showPicker === 'function') {
          reminderInputRef.current.showPicker();
        } else {
          reminderInputRef.current.focus();
        }
      } catch {
        reminderInputRef.current.focus();
      }
    }
  };

  const handleToggleTaskCompletion = () => {
    if (isDraft) {
      setDraftIsCompleted((prev) => (prev ? 0 : 1));
      return;
    }

    const nextCompleted = isDone ? 0 : 1;
    setDraftIsCompleted(nextCompleted);

    if (nextCompleted === 1) {
      setSubtasks((prev) =>
        prev.map((s) => ({
          ...s,
          is_completed: 1,
        }))
      );
    }

    if (onUpdateTask && task?.id) {
      onUpdateTask({
        id: task.id,
        is_completed: nextCompleted,
      });
    }
  };

  if (!task) return null;

  const isDone = Boolean(draftIsCompleted);
  const effectiveAssigneeId = isDraft ? draftAssigneeId : task.assigned_to_user_id;
  const effectiveDueDate = isDraft ? draftDueDate : task.due_date;
  const effectiveReminderTime = isDraft ? draftReminderTime : task.reminder_time;
  const effectiveListIds = (draftListIds || []).map((id) => Number(id));
  const allKnownLists = [...(lists || []), ...(Array.isArray(task.lists) ? task.lists : [])].filter(
    (v, i, a) => a.findIndex((t) => Number(t.id) === Number(v.id)) === i
  );
  const effectiveLists = allKnownLists.filter((l) => effectiveListIds.includes(Number(l.id)));
  const completedStepsCount = subtasks.filter((s) => s.is_completed).length;

  return (
    <aside className="fixed inset-0 z-50 md:static md:w-[440px] lg:w-[480px] flex-shrink-0 md:z-auto bg-background md:border-l md:border-border flex flex-col h-full shadow-2xl md:shadow-none animate-in md:animate-none slide-in-from-right duration-200 select-none">
      {/* Top Header Bar */}
      <div className="border-b border-border/80 bg-card/70 backdrop-blur-md pt-safe">
        <div className="relative flex items-center justify-between px-4 h-14">
          <button
            type="button"
            onClick={() => {
              if (isDraft) handleSaveDraft();
              else onClose();
            }}
            className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center border border-border/40 transition-all active:scale-95 flex-shrink-0 cursor-pointer"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          </button>

          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {isDraft ? 'New Task' : 'Task Details'}
          </span>

          {isDraft ? (
            <Button
              type="button"
              size="sm"
              onClick={handleSaveDraft}
              disabled={!titleValue.trim()}
              className="h-8 px-4 rounded-xl font-bold text-xs"
            >
              Save
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete this task?')) {
                  onDeleteTask(task.id);
                }
              }}
              className="w-9 h-9 rounded-xl text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Delete task"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Detail Body Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 md:pb-6">
        {/* Task Title & Completion Card */}
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs min-h-[56px]">
          <button
            type="button"
            onClick={handleToggleTaskCompletion}
            className="w-9 h-9 flex items-center justify-center flex-shrink-0 focus:outline-none rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
            aria-label="Toggle completion"
          >
            {isDone ? (
              <div className="w-5.5 h-5.5 rounded-md bg-primary border border-primary text-primary-foreground flex items-center justify-center shadow-xs">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            ) : (
              <div className="w-5.5 h-5.5 rounded-md border-2 border-slate-400 dark:border-slate-500 hover:border-primary transition-colors flex items-center justify-center bg-background/60" />
            )}
          </button>

          <div className="flex-1 min-w-0 flex items-center">
            {isDraft || isEditingTitle ? (
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                placeholder="What needs to be done?"
                onBlur={handleTitleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                autoFocus={isDraft}
                className="w-full font-bold text-sm bg-background border-2 border-primary ring-2 ring-primary/20 rounded-xl px-2.5 py-1 text-foreground focus:outline-none transition-all shadow-xs"
              />
            ) : (
              <div
                onClick={() => setIsEditingTitle(true)}
                className={cn(
                  'w-full font-bold text-sm cursor-text leading-normal px-2.5 py-1 rounded-xl hover:bg-muted/50 border border-transparent transition-all truncate',
                  isDone && 'line-through text-muted-foreground'
                )}
              >
                {task.title || titleValue}
              </div>
            )}
          </div>
        </div>

        {/* Lists Membership Card (Many-to-Many) */}
        <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden transition-all">
          <div
            onClick={() => setShowListPicker(!showListPicker)}
            className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-muted/40 transition-colors min-h-[56px]"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
              <ListTodo className="w-4 h-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Lists
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {effectiveLists.length > 0 ? (
                  effectiveLists.map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: l.color_theme || '#0078d4' }}
                      />
                      <span>{l.title}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">
                    Default List (Click to change)
                  </span>
                )}
              </div>
            </div>
            <ChevronRight
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                showListPicker && 'rotate-90'
              )}
            />
          </div>

          {/* List Selector Dropdown */}
          {showListPicker && (
            <div className="p-3 border-t border-border/60 bg-muted/20 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter lists..."
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {lists
                  .filter((l) => !listSearch || l.title.toLowerCase().includes(listSearch.toLowerCase()))
                  .map((l) => {
                    const isSelected = effectiveListIds.includes(Number(l.id));
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => handleToggleListMembership(l.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer',
                          isSelected ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-muted text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: l.color_theme || '#0078d4' }}
                          />
                          <span>{l.title}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Assignee Card with Embedded Search */}
        <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden transition-all">
          <div
            onClick={() => setShowAssigneePicker(!showAssigneePicker)}
            className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-muted/40 transition-colors min-h-[56px]"
          >
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              {effectiveAssigneeId ? (
                <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                  <AvatarImage
                    src={
                      users.find((u) => u.id === effectiveAssigneeId)?.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(users.find((u) => u.id === effectiveAssigneeId)?.name || '')}`
                    }
                    alt="Assignee"
                  />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                    {users.find((u) => u.id === effectiveAssigneeId)?.name?.slice(0, 2).toUpperCase() || 'UN'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <div className="overflow-hidden">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Assigned to
                </div>
                <div className="text-xs font-semibold text-foreground truncate">
                  {users.find((u) => u.id === effectiveAssigneeId)?.name || 'Unassigned (Click to assign)'}
                </div>
              </div>
            </div>
            <ChevronRight
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                showAssigneePicker && 'rotate-90'
              )}
            />
          </div>

          {/* Assignee Picker Dropdown */}
          {showAssigneePicker && (
            <div className="p-3 border-t border-border/60 bg-muted/20 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectAssignee(null)}
                  className={cn(
                    'w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer',
                    !effectiveAssigneeId ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">🚫</span>
                  <span>Unassigned</span>
                </button>
                {users
                  .filter((u) => {
                    const q = (assigneeSearch || '').toLowerCase();
                    return !q || u?.name?.toLowerCase().includes(q) || u?.phone?.includes(q) || u?.email?.toLowerCase().includes(q);
                  })
                  .map((u) => {
                    const isSelected = effectiveAssigneeId === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectAssignee(u.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer',
                          isSelected ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarImage
                              src={
                                u.avatar ||
                                `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(u.name || '')}`
                              }
                              alt={u.name}
                            />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                              {u.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="overflow-hidden truncate">
                            <div className="truncate font-semibold text-xs">{u.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{u.phone || u.email}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-1" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Subtasks / Steps Checklist Card */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Steps Checklist ({completedStepsCount}/{subtasks.length})
            </span>
            {subtasks.length > 0 && (
              <Badge variant="counter" className="text-[10px] px-2 py-0.5 rounded-full font-bold">
                {Math.round((completedStepsCount / subtasks.length) * 100)}% Done
              </Badge>
            )}
          </div>

          <div className="space-y-1.5">
            {subtasks.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(step)}
                    className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    aria-label="Toggle step completion"
                  >
                    {step.is_completed ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <span
                    className={cn(
                      'text-xs font-semibold truncate',
                      step.is_completed && 'line-through text-muted-foreground font-normal'
                    )}
                  >
                    {step.title}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSubtask(step.id)}
                  className="w-7 h-7 text-muted-foreground hover:text-destructive rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Delete step"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
            <Plus className="w-4 h-4 text-primary flex-shrink-0 ml-1" />
            <Input
              type="text"
              placeholder="Add next step..."
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              className="h-9 text-xs border-dashed"
            />
          </form>
        </div>

        {/* Task Properties: Due Date & Reminder Time */}
        <div className="space-y-3">
          {/* Due Date Picker Card */}
          <div
            onClick={handleOpenDatePicker}
            className="relative flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:bg-muted/30 shadow-xs min-h-[60px] transition-all cursor-pointer group"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenDatePicker();
              }
            }}
          >
            <div className="flex items-center gap-3 overflow-hidden flex-1 pointer-events-none">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all">
                <Calendar className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Due Date
                </div>
                <div
                  className={cn(
                    'text-xs font-semibold truncate',
                    effectiveDueDate ? 'text-foreground font-bold' : 'text-muted-foreground'
                  )}
                >
                  {effectiveDueDate ? (() => {
                    try {
                      const parts = effectiveDueDate.split('-').map(Number);
                      if (parts.length === 3) {
                        const d = new Date(parts[0], parts[1] - 1, parts[2]);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const target = new Date(d);
                        target.setHours(0, 0, 0, 0);
                        const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
                        const formatted = d.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        });
                        if (diffDays === 0) return `Today (${formatted})`;
                        if (diffDays === 1) return `Tomorrow (${formatted})`;
                        if (diffDays === -1) return `Yesterday (${formatted})`;
                        return formatted;
                      }
                      return effectiveDueDate;
                    } catch {
                      return effectiveDueDate;
                    }
                  })() : 'No due date (Click to set)'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 z-10">
              {effectiveDueDate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDraft) setDraftDueDate(null);
                    else onUpdateTask({ id: task.id, due_date: null });
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  title="Clear Due Date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            <input
              ref={dateInputRef}
              type="date"
              value={effectiveDueDate || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                if (isDraft) setDraftDueDate(val);
                else onUpdateTask({ id: task.id, due_date: val });
              }}
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
              tabIndex={-1}
            />
          </div>

          {/* Reminder Datetime Picker Card */}
          <div
            onClick={handleOpenReminderPicker}
            className="relative flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:bg-muted/30 shadow-xs min-h-[60px] transition-all cursor-pointer group"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenReminderPicker();
              }
            }}
          >
            <div className="flex items-center gap-3 overflow-hidden flex-1 pointer-events-none">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all">
                <Clock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Reminder Time
                </div>
                <div
                  className={cn(
                    'text-xs font-semibold truncate',
                    effectiveReminderTime ? 'text-foreground font-bold' : 'text-muted-foreground'
                  )}
                >
                  {effectiveReminderTime ? (() => {
                    try {
                      const cleaned = effectiveReminderTime.replace(' ', 'T');
                      const d = new Date(cleaned);
                      if (isNaN(d.getTime())) return effectiveReminderTime;
                      const today = new Date();
                      const isToday = d.toDateString() === today.toDateString();
                      const timeStr = d.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });
                      const dateStr = d.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                      return isToday ? `Today at ${timeStr}` : `${dateStr} at ${timeStr}`;
                    } catch {
                      return effectiveReminderTime;
                    }
                  })() : 'No reminder set (Click to set)'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 z-10">
              {effectiveReminderTime && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDraft) setDraftReminderTime(null);
                    else onUpdateTask({ id: task.id, reminder_time: null });
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  title="Clear Reminder Time"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            <input
              ref={reminderInputRef}
              type="datetime-local"
              value={effectiveReminderTime ? effectiveReminderTime.replace(' ', 'T') : ''}
              onChange={(e) => {
                const val = e.target.value ? e.target.value.replace('T', ' ') : null;
                if (isDraft) setDraftReminderTime(val);
                else onUpdateTask({ id: task.id, reminder_time: val });
              }}
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
              tabIndex={-1}
            />
          </div>
        </div>

        {/* WhatsApp Quick Action Button */}
        {!isDraft && (
          <Button
            type="button"
            variant="whatsapp"
            className="w-full h-11 rounded-2xl font-bold text-xs gap-2 shadow-sm transition-transform active:scale-95"
            onClick={() =>
              onOpenWhatsAppModal({
                type: 'task',
                taskId: task.id,
              })
            }
          >
            <Send className="w-4 h-4" />
            <span>Send Task via WhatsApp</span>
          </Button>
        )}

        {/* Notes Card */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>Notes</span>
          </div>
          <Textarea
            placeholder="Add detailed notes, links, or context..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            className="min-h-[100px] text-xs leading-relaxed border-border/60 focus-visible:ring-primary/20 rounded-xl resize-none"
          />
        </div>
      </div>
    </aside>
  );
}
