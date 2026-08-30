import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon.jsx';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar.jsx';
import { useUiStore } from '../store/useUiStore.js';
import {
  useSubtasksQuery,
  useAddSubtaskMutation,
  useUpdateSubtaskMutation,
  useDeleteSubtaskMutation,
} from '../hooks/useTodoQueries.js';
import {
  useThrottledTaskAutosave,
  getTaskAutosaveLabel,
} from '../hooks/useThrottledTaskAutosave.js';
import {
  formatSingleTaskMessage,
  generateWhatsAppWebLink,
  fuzzyMatch,
  getQuickDueDatePresets,
} from '@shared/todo';
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
  const isPortrait = useUiStore((s) => s.isPortrait);

  const [titleValue, setTitleValue] = useState(task?.title || '');
  const [notesValue, setNotesValue] = useState(task?.notes || '');
  const [newStepTitle, setNewStepTitle] = useState('');

  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showListPicker, setShowListPicker] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [customDueDate, setCustomDueDate] = useState(task?.due_date || '');

  // Subtasks query & mutations
  const { data: subtasks = [] } = useSubtasksQuery(task?.id);
  const addSubtaskMutation = useAddSubtaskMutation();
  const updateSubtaskMutation = useUpdateSubtaskMutation();
  const deleteSubtaskMutation = useDeleteSubtaskMutation();

  // Throttled Autosave Hook
  const {
    status: saveStatus,
    isSlowSaving,
    feedbackType,
    showFeedback,
    queueSave,
    flush,
  } = useThrottledTaskAutosave({
    taskId: task?.id || null,
    enabled: !isDraft,
    save: onUpdateTask,
  });

  // Sync state on task change
  useEffect(() => {
    if (task) {
      setTitleValue(task.title || '');
      setNotesValue(task.notes || '');
      setCustomDueDate(task.due_date || '');
    }
  }, [task?.id]);

  // Handle Title Changes
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitleValue(val);
    if (!isDraft) {
      queueSave({ title: val });
    }
  };

  // Handle Notes Changes
  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotesValue(val);
    if (!isDraft) {
      queueSave({ notes: val });
    }
  };

  // Multi-list IDs
  const currentListIds = useMemo(() => {
    if (!task) return [];
    if (Array.isArray(task.list_ids) && task.list_ids.length > 0) {
      return task.list_ids;
    }
    if (Array.isArray(task.lists) && task.lists.length > 0) {
      return task.lists.map((l) => l.id);
    }
    return task.list_id ? [task.list_id] : [];
  }, [task]);

  const handleToggleList = (listId) => {
    if (!task) return;
    const exists = currentListIds.includes(listId);
    let nextListIds = exists
      ? currentListIds.filter((id) => id !== listId)
      : [...currentListIds, listId];

    if (!isDraft) {
      onUpdateTask({ id: task.id, list_ids: nextListIds });
    }
  };

  const handleSelectAssignee = (userId) => {
    if (!task) return;
    if (!isDraft) {
      onUpdateTask({ id: task.id, assigned_to_user_id: userId });
    }
    setShowAssigneePicker(false);
  };

  const handleSelectDueDate = (dateStr) => {
    if (!task) return;
    if (!isDraft) {
      onUpdateTask({ id: task.id, due_date: dateStr });
    }
    setShowDueDatePicker(false);
  };

  // Add Step
  const handleAddStep = (e) => {
    e.preventDefault();
    if (!newStepTitle.trim() || !task) return;

    if (!isDraft) {
      addSubtaskMutation.mutate({ taskId: task.id, title: newStepTitle.trim() });
    }
    setNewStepTitle('');
  };

  const handleToggleStep = (step) => {
    if (!task) return;
    updateSubtaskMutation.mutate({
      id: step.id,
      taskId: task.id,
      is_completed: step.is_completed ? 0 : 1,
    });
  };

  const handleDeleteStep = (stepId) => {
    if (!task) return;
    deleteSubtaskMutation.mutate({ id: stepId, taskId: task.id });
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    if (!task) return;
    const message = formatSingleTaskMessage(task);
    const phone = task.assignee_phone || '';
    const waLink = generateWhatsAppWebLink(phone, message);
    window.open(waLink, '_blank');
  };

  const presets = getQuickDueDatePresets();

  const assignedUser = useMemo(() => {
    if (!task?.assigned_to_user_id) return null;
    return users.find((u) => u.id === task.assigned_to_user_id) || null;
  }, [users, task?.assigned_to_user_id]);

  const filteredUsers = useMemo(() => {
    if (!assigneeSearch.trim()) return users;
    return users.filter(
      (u) =>
        fuzzyMatch(u.name || '', assigneeSearch) ||
        fuzzyMatch(u.phone || '', assigneeSearch)
    );
  }, [users, assigneeSearch]);

  const filteredLists = useMemo(() => {
    if (!listSearch.trim()) return lists;
    return lists.filter((l) => fuzzyMatch(l.title || '', listSearch));
  }, [lists, listSearch]);

  return (
    <div
      className={cn(
        'z-40 flex flex-col bg-card text-card-foreground shadow-2xl border-l border-border/80 transition-all duration-300 select-none',
        isPortrait
          ? 'fixed inset-0 w-full h-full'
          : 'relative w-96 lg:w-[420px] h-full flex-shrink-0'
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/70 min-h-[64px]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={async () => {
              await flush();
              onClose();
            }}
            className="w-9 h-9 rounded-xl hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Autosave Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-[11px] font-bold text-muted-foreground">
            {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            {saveStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
            <span>{getTaskAutosaveLabel(saveStatus)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-9 h-9 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] flex items-center justify-center transition-all cursor-pointer"
            title="Share task via WhatsApp"
          >
            <WhatsAppIcon className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this task?')) {
                onDeleteTask(task.id);
                onClose();
              }
            }}
            className="w-9 h-9 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title Input */}
        <div className="p-3 rounded-2xl bg-muted/30 border border-border/70 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <input
            type="text"
            placeholder="Task Title..."
            value={titleValue}
            onChange={handleTitleChange}
            className="w-full bg-transparent text-base font-extrabold text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Steps / Subtasks Section */}
        <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Steps ({subtasks.filter((s) => s.is_completed).length}/{subtasks.length})
          </div>

          <div className="space-y-1.5">
            {subtasks.map((step) => (
              <div
                key={step.id}
                className="group flex items-center justify-between p-2 rounded-xl bg-card border border-border/60 hover:border-border transition-all"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStep(step)}
                    className="w-5 h-5 flex items-center justify-center text-primary cursor-pointer"
                  >
                    {step.is_completed ? (
                      <div className="w-4 h-4 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-md border-2 border-muted-foreground/60 group-hover:border-primary transition-colors" />
                    )}
                  </button>
                  <span
                    className={cn(
                      'text-xs font-semibold truncate',
                      step.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'
                    )}
                  >
                    {step.title}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteStep(step.id)}
                  className="w-6 h-6 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddStep} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              placeholder="Add next step..."
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!newStepTitle.trim()}
              className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Due Date & Reminder Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDueDatePicker(!showDueDatePicker)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/70 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-sky-500" />
              <div>
                <div className="text-xs font-bold text-foreground">Due Date</div>
                <div className="text-xs text-muted-foreground">
                  {task?.due_date || 'No due date set'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {showDueDatePicker && (
            <div className="mt-2 p-3 rounded-2xl bg-card border border-border shadow-xl space-y-2 animate-in fade-in-50">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectDueDate(presets.today)}
                  className="p-2 rounded-xl bg-muted text-xs font-bold text-foreground hover:bg-muted/80 text-left"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDueDate(presets.tomorrow)}
                  className="p-2 rounded-xl bg-muted text-xs font-bold text-foreground hover:bg-muted/80 text-left"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDueDate(presets.nextMonday)}
                  className="p-2 rounded-xl bg-muted text-xs font-bold text-foreground hover:bg-muted/80 text-left"
                >
                  Next Week
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDueDate(null)}
                  className="p-2 rounded-xl bg-red-500/10 text-xs font-bold text-red-500 hover:bg-red-500/20 text-left"
                >
                  Clear Date
                </button>
              </div>
              <div className="flex gap-1.5 pt-2 border-t border-border">
                <input
                  type="date"
                  value={customDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs border border-border"
                />
                <button
                  type="button"
                  onClick={() => handleSelectDueDate(customDueDate)}
                  disabled={!customDueDate}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40"
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Assignee Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAssigneePicker(!showAssigneePicker)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/70 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <UserIcon className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-xs font-bold text-foreground">Assigned To</div>
                <div className="text-xs text-muted-foreground">
                  {assignedUser?.name || 'Unassigned'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {showAssigneePicker && (
            <div className="mt-2 p-3 rounded-2xl bg-card border border-border shadow-xl space-y-2 animate-in fade-in-50">
              <input
                type="text"
                placeholder="Search users..."
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-muted text-xs border border-border focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSelectAssignee(null)}
                className="w-full p-2 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 text-left"
              >
                Remove Assignee
              </button>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectAssignee(u.id)}
                    className="w-full flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted text-left text-xs font-bold"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback className="text-[9px]">
                        {(u.name || 'U').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{u.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Multi-List Assignment Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowListPicker(!showListPicker)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/70 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ListTodo className="w-5 h-5 text-emerald-500" />
              <div>
                <div className="text-xs font-bold text-foreground">Belongs to Lists</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap mt-0.5">
                  {currentListIds.length === 0 ? (
                    'None'
                  ) : (
                    currentListIds.map((lid) => {
                      const l = lists.find((item) => item.id === lid);
                      return l ? (
                        <span
                          key={l.id}
                          className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold text-[10px]"
                        >
                          {l.title}
                        </span>
                      ) : null;
                    })
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {showListPicker && (
            <div className="mt-2 p-3 rounded-2xl bg-card border border-border shadow-xl space-y-2 animate-in fade-in-50">
              <input
                type="text"
                placeholder="Search lists..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-muted text-xs border border-border focus:outline-none"
              />
              <div className="max-h-36 overflow-y-auto space-y-1">
                {filteredLists.map((l) => {
                  const isSelected = currentListIds.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleToggleList(l.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer',
                        isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: l.color_theme?.startsWith('#') ? l.color_theme : '#0078d4' }}
                        />
                        <span>{l.title}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notes Textarea */}
        <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span>Notes</span>
          </div>
          <textarea
            rows={5}
            placeholder="Add detailed notes or context..."
            value={notesValue}
            onChange={handleNotesChange}
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
