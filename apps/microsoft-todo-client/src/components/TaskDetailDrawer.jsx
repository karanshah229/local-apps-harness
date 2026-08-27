import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  Calendar,
  Clock,
  User,
  Trash2,
  Send,
  Plus,
  Check,
  FileText,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

export default function TaskDetailDrawer({
  task,
  users,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onOpenWhatsAppModal
}) {
  const [subtasks, setSubtasks] = useState([]);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [notes, setNotes] = useState(task?.notes || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task?.title || '');

  useEffect(() => {
    if (task) {
      setNotes(task.notes || '');
      setTitleValue(task.title || '');
      fetchSubtasks(task.id);
    }
  }, [task]);

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

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newStepTitle.trim() || !task) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newStepTitle.trim() })
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
    try {
      const newStatus = subtask.is_completed ? 0 : 1;
      const res = await fetch(`/api/subtasks/${subtask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: newStatus })
      });
      if (res.ok) {
        setSubtasks(
          subtasks.map((s) =>
            s.id === subtask.id ? { ...s, is_completed: newStatus } : s
          )
        );
        onUpdateTask({ id: task.id, updated_at: Date.now() });
      }
    } catch (err) {
      console.error('Error updating subtask:', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
      setSubtasks(subtasks.filter((s) => s.id !== subtaskId));
      onUpdateTask({ id: task.id, updated_at: Date.now() });
    } catch (err) {
      console.error('Error deleting subtask:', err);
    }
  };

  const handleNotesBlur = () => {
    if (task && notes !== (task.notes || '')) {
      onUpdateTask({ id: task.id, notes });
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (task && titleValue.trim() && titleValue !== task.title) {
      onUpdateTask({ id: task.id, title: titleValue.trim() });
    }
  };

  if (!task) return null;

  const completedStepsCount = subtasks.filter((s) => s.is_completed).length;

  return (
    <aside className="fixed inset-0 z-50 md:static md:w-[380px] md:z-auto bg-background md:border-l md:border-border flex flex-col h-full shadow-2xl md:shadow-none animate-in md:animate-none slide-in-from-right duration-200">
      {/* Top Mobile App Bar / Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-card/80 backdrop-blur-md pt-safe">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-primary font-semibold text-sm py-2 px-2 -ml-2 rounded-lg hover:bg-muted active:scale-95 transition-all min-h-[44px] touch-manipulation"
          aria-label="Back to tasks"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="md:hidden">Back</span>
        </button>

        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Task Details
        </span>

        <button
          type="button"
          onClick={() => {
            if (window.confirm('Delete this task?')) {
              onDeleteTask(task.id);
            }
          }}
          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Delete task"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Main Detail Body Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 md:pb-6">
        {/* Task Title & Completion Card */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
          <button
            type="button"
            onClick={() =>
              onUpdateTask({ id: task.id, is_completed: task.is_completed ? 0 : 1 })
            }
            className="mt-0.5 min-h-[44px] min-w-[44px] -m-2 flex items-center justify-center touch-manipulation"
            aria-label="Toggle completion"
          >
            {task.is_completed ? (
              <CheckCircle2 className="w-6 h-6 text-primary fill-primary/20" />
            ) : (
              <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>

          <div className="flex-1">
            {isEditingTitle ? (
              <Input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                autoFocus
                className="font-bold text-base h-10 -ml-1"
              />
            ) : (
              <div
                onClick={() => setIsEditingTitle(true)}
                className={cn(
                  'font-bold text-base cursor-text py-0.5 leading-snug',
                  task.is_completed && 'line-through text-muted-foreground'
                )}
              >
                {task.title}
              </div>
            )}
          </div>
        </div>

        {/* Assignee Card - Just below Task Title */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-sm min-h-[56px]">
          {task.assigned_to_user_id ? (
            (() => {
              const assignedUser = users.find((u) => u.id === task.assigned_to_user_id);
              return (
                <img
                  src={
                    assignedUser?.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(assignedUser?.name || 'User')}`
                  }
                  alt={assignedUser?.name || 'Assignee'}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-border flex-shrink-0"
                />
              );
            })()
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
              <User className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Assignee
            </div>
            <select
              value={task.assigned_to_user_id || ''}
              onChange={(e) =>
                onUpdateTask({
                  id: task.id,
                  assigned_to_user_id: e.target.value ? parseInt(e.target.value) : null
                })
              }
              className="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none cursor-pointer truncate"
            >
              <option value="">Unassigned (Tap to assign contact...)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  👤 {u.name} ({u.phone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subtasks / Steps Checklist Card */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Steps Checklist ({completedStepsCount}/{subtasks.length})
            </span>
            {subtasks.length > 0 && (
              <Badge variant="counter">
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
                <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(step)}
                    className="min-h-[40px] min-w-[40px] -m-2 flex items-center justify-center touch-manipulation flex-shrink-0"
                  >
                    {step.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  <span
                    className={cn(
                      'text-sm truncate',
                      step.is_completed && 'line-through text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSubtask(step.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation"
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
              className="h-10 text-sm border-dashed"
            />
          </form>
        </div>

        {/* Task Properties & Pickers */}
        <div className="space-y-2">
          {/* Due Date Picker */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm min-h-[52px]">
            <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-1" />
            <div className="flex-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Due Date</div>
              <input
                type="date"
                value={task.due_date || ''}
                onChange={(e) =>
                  onUpdateTask({ id: task.id, due_date: e.target.value || null })
                }
                className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Reminder Datetime Picker */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm min-h-[52px]">
            <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-1" />
            <div className="flex-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Reminder Time</div>
              <input
                type="datetime-local"
                value={task.reminder_time ? task.reminder_time.replace(' ', 'T') : ''}
                onChange={(e) =>
                  onUpdateTask({
                    id: task.id,
                    reminder_time: e.target.value ? e.target.value.replace('T', ' ') : null
                  })
                }
                className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Reminder Direct Action */}
        <Button
          type="button"
          variant="whatsapp"
          size="lg"
          className="w-full h-12 text-sm font-bold gap-2 shadow-md"
          onClick={() =>
            onOpenWhatsAppModal({
              type: 'single',
              taskId: task.id,
              recipientUserId: task.assigned_to_user_id
            })
          }
        >
          <Send className="w-4 h-4" />
          <span>Send WhatsApp Reminder</span>
        </Button>

        {/* Notes Area */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" /> Notes
          </div>
          <Textarea
            placeholder="Add detailed notes for this task..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            className="min-h-[110px] text-sm leading-relaxed border-border/60"
          />
        </div>
      </div>
    </aside>
  );
}
