import React, { useState } from 'react';
import { X, Share2, UserPlus, UserCheck, Trash2 } from 'lucide-react';

export default function ShareListModal({ isOpen, onClose, list, users, onShareList, onRemoveShare }) {
  const [selectedUserId, setSelectedUserId] = useState('');

  if (!isOpen || !list) return null;

  const members = list.members || [];
  const memberIds = members.map(m => m.id);
  const availableUsers = users.filter(u => u.id !== list.created_by && !memberIds.includes(u.id));

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    onShareList(list.id, parseInt(selectedUserId));
    setSelectedUserId('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
            <Share2 size={20} color="var(--primary-blue)" />
            <span>Share List: "{list.title}"</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Shared members will automatically receive live updates whenever anyone edits tasks in this list.
          </p>

          {/* Share with library contact */}
          <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border-color)', fontSize: 13 }}
            >
              <option value="">Select contact from library...</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  👤 {u.name} ({u.email})
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary" disabled={!selectedUserId}>
              Add Member
            </button>
          </form>

          {/* Current Members List */}
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>List Members ({members.length})</div>
          {members.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '12px 0' }}>
              This list is not shared with anyone yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#faf9f8', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} alt={m.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.phone}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveShare(list.id, m.id)}
                    style={{ background: 'none', border: 'none', color: '#a80000', cursor: 'pointer' }}
                    title="Remove access"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
