import React, { useState, useEffect } from 'react';
import {
  X,
  Sun,
  Calendar,
  Clock,
  User,
  Trash2,
  Send,
  Plus,
  Check,
  Star,
  FileText
} from 'lucide-react';

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

  useEffect(() => {
    if (task) {
      setNotes(task.notes || '');
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
        setSubtasks(subtasks.map(s => s.id === subtask.id ? { ...s, is_completed: newStatus } : s));
        onUpdateTask({ id: task.id, updated_at: Date.now() });
      }
    } catch (err) {
      console.error('Error updating subtask:', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
      setSubtasks(subtasks.filter(s => s.id !== subtaskId));
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

  if (!task) return null;

  const assignee = users.find(u => u.id === task.assigned_to_user_id);

  return (
    <aside className="detail-drawer">
      {/* Header */}
      <div className="drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className={`task-checkbox-custom ${task.is_completed ? 'checked' : ''}`}
            onClick={() => onUpdateTask({ id: task.id, is_completed: task.is_completed ? 0 : 1 })}
          >
            {task.is_completed && <Check size={14} />}
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, textDecoration: task.is_completed ? 'line-through' : 'none' }}>
            {task.title}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="drawer-body">
        {/* Steps / Subtasks Section */}
        <div className="drawer-card">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
            Steps ({subtasks.filter(s => s.is_completed).length}/{subtasks.length})
          </div>

          {subtasks.map(step => (
            <div key={step.id} className="subtask-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  className={`task-checkbox-custom ${step.is_completed ? 'checked' : ''}`}
                  style={{ width: 16, height: 16 }}
                  onClick={() => handleToggleSubtask(step)}
                >
                  {step.is_completed && <Check size={10} />}
                </div>
                <span style={{ textDecoration: step.is_completed ? 'line-through' : 'none', color: step.is_completed ? 'var(--text-secondary)' : 'var(--text-main)' }}>
                  {step.title}
                </span>
              </div>
              <Trash2 size={13} color="#a19f9d" onClick={() => handleDeleteSubtask(step.id)} style={{ cursor: 'pointer' }} />
            </div>
          ))}

          <form onSubmit={handleAddSubtask} className="subtask-input">
            <Plus size={16} color="var(--primary-blue)" />
            <input
              type="text"
              placeholder="Add next step..."
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
            />
          </form>
        </div>

        {/* Add to My Day */}
        <div
          className="drawer-field"
          onClick={() => onUpdateTask({ id: task.id, is_my_day: task.is_my_day ? 0 : 1 })}
        >
          <Sun size={18} color={task.is_my_day ? '#2564cf' : '#605e5c'} />
          <span style={{ color: task.is_my_day ? 'var(--primary-blue)' : 'var(--text-main)', fontWeight: task.is_my_day ? 600 : 400 }}>
            {task.is_my_day ? 'Added to My Day' : 'Add to My Day'}
          </span>
        </div>

        {/* Due Date Picker */}
        <div className="drawer-field">
          <Calendar size={18} color="var(--text-secondary)" />
          <input
            type="date"
            value={task.due_date || ''}
            onChange={(e) => onUpdateTask({ id: task.id, due_date: e.target.value || null })}
          />
        </div>

        {/* Reminder Time Picker */}
        <div className="drawer-field">
          <Clock size={18} color="var(--text-secondary)" />
          <input
            type="datetime-local"
            value={task.reminder_time ? task.reminder_time.replace(' ', 'T') : ''}
            onChange={(e) => onUpdateTask({ id: task.id, reminder_time: e.target.value ? e.target.value.replace('T', ' ') : null })}
          />
        </div>

        {/* Assignee Picker from User Library */}
        <div className="drawer-field">
          <User size={18} color="var(--text-secondary)" />
          <select
            value={task.assigned_to_user_id || ''}
            onChange={(e) => onUpdateTask({ id: task.id, assigned_to_user_id: e.target.value ? parseInt(e.target.value) : null })}
          >
            <option value="">Assign to someone...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                👤 {u.name} ({u.phone})
              </option>
            ))}
          </select>
        </div>

        {/* WhatsApp Reminder Action Button */}
        <button
          className="btn-whatsapp"
          style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
          onClick={() => onOpenWhatsAppModal({ type: 'single', taskId: task.id, recipientUserId: task.assigned_to_user_id })}
        >
          <Send size={16} /> Send WhatsApp Reminder
        </button>

        {/* Notes */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Notes
          </div>
          <textarea
            className="drawer-notes"
            placeholder="Add note details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="drawer-footer">
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Created task</span>
        <button
          onClick={() => onDeleteTask(task.id)}
          style={{ background: 'none', border: 'none', color: '#a80000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>
    </aside>
  );
}
