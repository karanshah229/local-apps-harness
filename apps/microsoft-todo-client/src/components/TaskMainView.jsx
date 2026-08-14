import React, { useState } from 'react';
import {
  Plus,
  Star,
  Check,
  Calendar,
  Share2,
  Send,
  User,
  MoreHorizontal,
  Palette,
  CheckSquare,
  Square
} from 'lucide-react';

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
  onUpdateListTheme
}) {
  const [taskInput, setTaskInput] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const themeColors = ['blue', 'purple', 'green', 'orange', 'red', 'dark'];

  const getHeaderTitle = () => {
    if (activeList) return activeList.title;
    switch (activeView) {
      case 'my-day': return 'My Day';
      case 'important': return 'Important';
      case 'planned': return 'Planned';
      case 'assigned-to-me': return 'Assigned to me';
      default: return 'Tasks';
    }
  };

  const getThemeClass = () => {
    if (activeList) return `theme-${activeList.color_theme || 'blue'}`;
    if (activeView === 'my-day') return 'theme-blue';
    if (activeView === 'important') return 'theme-purple';
    if (activeView === 'planned') return 'theme-green';
    if (activeView === 'assigned-to-me') return 'theme-orange';
    return 'theme-blue';
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    onCreateTask({
      title: taskInput.trim(),
      is_my_day: activeView === 'my-day' ? 1 : 0,
      is_important: activeView === 'important' ? 1 : 0,
      list_id: activeList ? activeList.id : null
    });
    setTaskInput('');
  };

  const toggleSelectTaskForBatch = (taskId, e) => {
    e.stopPropagation();
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <main className="main-view">
      {/* Header Banner */}
      <div className={`list-banner ${getThemeClass()}`}>
        <div className="list-title-row">
          <div className="list-title-left">
            <h1>{getHeaderTitle()}</h1>
            {activeList && activeList.members && activeList.members.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '-4px' }} title={`Shared with ${activeList.members.length} members`}>
                {activeList.members.map(m => (
                  <img
                    key={m.id}
                    src={m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                    alt={m.name}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid white', marginLeft: -6 }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="banner-actions">
            {/* Multi select mode button */}
            <button
              className="btn-banner-action"
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedTaskIds([]);
              }}
            >
              {isMultiSelectMode ? <CheckSquare size={16} /> : <Square size={16} />}
              {isMultiSelectMode ? 'Cancel Selection' : 'Select Tasks'}
            </button>

            {/* Share List via WhatsApp */}
            {activeList && (
              <>
                <button
                  className="btn-banner-action"
                  onClick={() => onOpenShareModal(activeList)}
                >
                  <Share2 size={16} /> Share List
                </button>

                <button
                  className="btn-banner-action btn-whatsapp-banner"
                  onClick={() => onOpenWhatsAppModal({ type: 'list', listId: activeList.id })}
                >
                  <Send size={16} /> WhatsApp Full List
                </button>
              </>
            )}

            {/* Theme Picker for Custom List */}
            {activeList && (
              <div style={{ position: 'relative' }}>
                <button
                  className="btn-banner-action"
                  onClick={() => setShowThemePicker(!showThemePicker)}
                >
                  <Palette size={16} />
                </button>

                {showThemePicker && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '36px',
                      background: 'white',
                      padding: '8px',
                      borderRadius: '6px',
                      boxShadow: 'var(--shadow-lg)',
                      display: 'flex',
                      gap: '6px',
                      zIndex: 20
                    }}
                  >
                    {themeColors.map(c => (
                      <span
                        key={c}
                        className={`theme-badge ${c}`}
                        style={{ width: 20, height: 20, cursor: 'pointer', border: activeList.color_theme === c ? '2px solid black' : 'none' }}
                        onClick={() => {
                          onUpdateListTheme(activeList.id, c);
                          setShowThemePicker(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="list-date">{formattedToday}</div>
      </div>

      {/* Task Creation Box */}
      <div className="task-add-container">
        <form className="task-add-box" onSubmit={handleAddTask}>
          <Plus size={20} color="var(--primary-blue)" />
          <input
            type="text"
            placeholder={`Add a task to "${getHeaderTitle()}"...`}
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
          />
        </form>
      </div>

      {/* Task List */}
      <div className="task-list-scroll">
        {/* Batch Action Bar if items selected */}
        {isMultiSelectMode && selectedTaskIds.length > 0 && (
          <div className="batch-bar">
            <span>{selectedTaskIds.length} Task(s) Selected</span>
            <button
              className="btn-whatsapp"
              onClick={() => onOpenWhatsAppModal({ type: 'batch', taskIds: selectedTaskIds })}
            >
              <Send size={15} /> Send WhatsApp Digest ({selectedTaskIds.length})
            </button>
          </div>
        )}

        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <CheckSquare size={48} strokeWidth={1} style={{ marginBottom: 12 }} />
            <h3>No tasks here yet</h3>
            <p style={{ fontSize: 13, marginTop: 4 }}>Add a task above to get started!</p>
          </div>
        ) : (
          tasks.map(task => {
            const isSelected = selectedTaskId === task.id;
            const isCheckedForBatch = selectedTaskIds.includes(task.id);

            return (
              <div
                key={task.id}
                className={`task-row ${task.is_completed ? 'completed' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectTask(task)}
              >
                <div className="task-left">
                  {isMultiSelectMode ? (
                    <input
                      type="checkbox"
                      checked={isCheckedForBatch}
                      onChange={(e) => toggleSelectTaskForBatch(task.id, e)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  ) : (
                    <div
                      className={`task-checkbox-custom ${task.is_completed ? 'checked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTaskComplete(task);
                      }}
                    >
                      {task.is_completed && <Check size={14} />}
                    </div>
                  )}

                  <div className="task-content">
                    <span className="task-title">{task.title}</span>
                    <div className="task-meta">
                      {task.due_date && (
                        <span className="meta-item">
                          <Calendar size={12} /> {task.due_date}
                        </span>
                      )}
                      {task.subtask_count > 0 && (
                        <span className="meta-item">
                          {task.subtask_completed_count} of {task.subtask_count} steps
                        </span>
                      )}
                      {task.assignee_name && (
                        <div className="assignee-chip" title={`Assigned to ${task.assignee_name}`}>
                          <img
                            src={task.assignee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignee_name}`}
                            alt={task.assignee_name}
                          />
                          <span>{task.assignee_name.split(' ')[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="task-right">
                  <button
                    className={`star-btn ${task.is_important ? 'starred' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTaskImportant(task);
                    }}
                    title={task.is_important ? 'Unmark important' : 'Mark important'}
                  >
                    <Star size={18} fill={task.is_important ? '#ffb900' : 'none'} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
