import React, { useState } from 'react';
import {
  Sun,
  Star,
  Calendar,
  UserCheck,
  CheckSquare,
  List as ListIcon,
  Plus,
  Users,
  Share2,
  Trash2
} from 'lucide-react';

export default function Sidebar({
  activeView,
  setActiveView,
  lists,
  activeListId,
  setActiveListId,
  users,
  activeUser,
  setActiveUser,
  onOpenUserLibrary,
  onOpenShareModal,
  onCreateList,
  onDeleteList,
  taskCounts
}) {
  const [newListTitle, setNewListTitle] = useState('');
  const [showAddListInput, setShowAddListInput] = useState(false);

  const handleAddListSubmit = (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    onCreateList(newListTitle.trim());
    setNewListTitle('');
    setShowAddListInput(false);
  };

  const defaultViews = [
    { id: 'my-day', label: 'My Day', icon: Sun, color: '#2564cf', count: taskCounts['my-day'] || 0 },
    { id: 'important', label: 'Important', icon: Star, color: '#2564cf', count: taskCounts['important'] || 0 },
    { id: 'planned', label: 'Planned', icon: Calendar, color: '#2564cf', count: taskCounts['planned'] || 0 },
    { id: 'assigned-to-me', label: 'Assigned to me', icon: UserCheck, color: '#2564cf', count: taskCounts['assigned-to-me'] || 0 },
    { id: 'all-tasks', label: 'Tasks', icon: CheckSquare, color: '#2564cf', count: taskCounts['all-tasks'] || 0 },
  ];

  return (
    <aside className="sidebar">
      {/* App Branding */}
      <div style={{ padding: '16px 16px 8px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ background: '#2564cf', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 16 }}>K</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)', letterSpacing: '-0.2px' }}>Kamdhenu To Do</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Task Sync & WhatsApp Reminders</div>
        </div>
      </div>

      {/* Active User Switching Banner for Live Testing */}
      <div className="sidebar-header" style={{ paddingTop: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Active Account</div>
          <select
            value={activeUser?.id || ''}
            onChange={(e) => {
              const u = users.find(x => x.id === parseInt(e.target.value));
              if (u) setActiveUser(u);
            }}
            style={{
              width: '100%',
              padding: '6px 8px',
              marginTop: '4px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation List */}
      <div className="sidebar-nav">
        {defaultViews.map(view => {
          const Icon = view.icon;
          const isActive = activeView === view.id && !activeListId;
          return (
            <div
              key={view.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveView(view.id);
                setActiveListId(null);
              }}
            >
              <div className="nav-item-left">
                <Icon size={18} color={view.color} />
                <span>{view.label}</span>
              </div>
              {view.count > 0 && <span className="nav-item-count">{view.count}</span>}
            </div>
          );
        })}

        <div className="nav-section-title">My Custom Lists</div>

        {lists.map(list => {
          const isActive = activeListId === list.id;
          const isShared = list.members && list.members.length > 0;

          return (
            <div
              key={list.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveListId(list.id);
                setActiveView(null);
              }}
            >
              <div className="nav-item-left">
                <span className={`theme-badge ${list.color_theme || 'blue'}`}></span>
                <span>{list.title}</span>
                {isShared && (
                  <Share2 size={13} color="var(--primary-blue)" title={`Shared with ${list.members.length} member(s)`} />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {list.pending_task_count > 0 && (
                  <span className="nav-item-count">{list.pending_task_count}</span>
                )}
                {!list.is_default && (
                  <Trash2
                    size={14}
                    color="#a19f9d"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete list "${list.title}"?`)) {
                        onDeleteList(list.id);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {showAddListInput ? (
          <form onSubmit={handleAddListSubmit} style={{ padding: '8px 0' }}>
            <input
              type="text"
              placeholder="List name..."
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid var(--primary-blue)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </form>
        ) : null}
      </div>

      {/* Footer Controls */}
      <div className="sidebar-footer">
        <button
          className="btn-sidebar-add"
          onClick={() => setShowAddListInput(true)}
        >
          <Plus size={16} /> New List
        </button>
        <button
          className="btn-sidebar-contacts"
          onClick={onOpenUserLibrary}
          title="Manage persistent user library & contacts"
        >
          <Users size={16} color="var(--primary-blue)" /> Contacts
        </button>
      </div>
    </aside>
  );
}
