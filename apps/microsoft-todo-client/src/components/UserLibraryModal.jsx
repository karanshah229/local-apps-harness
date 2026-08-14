import React, { useState } from 'react';
import { X, UserPlus, Phone, Mail, User, Edit3, Trash2, Check } from 'lucide-react';

export default function UserLibraryModal({ isOpen, onClose, users, onAddUser, onUpdateUser, onDeleteUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (u) => {
    setEditingUserId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPhone('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Name, Email, and Phone number are required.');
      return;
    }

    if (editingUserId) {
      const success = await onUpdateUser({ id: editingUserId, name: name.trim(), email: email.trim(), phone: phone.trim() });
      if (success) {
        handleCancelEdit();
      } else {
        setError('Failed to update contact.');
      }
    } else {
      const success = await onAddUser({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      if (success) {
        setName('');
        setEmail('');
        setPhone('');
      } else {
        setError('Failed to add user or email already exists.');
      }
    }
  };

  const handleDelete = (u) => {
    if (confirm(`Are you sure you want to delete contact "${u.name}" from your library?`)) {
      onDeleteUser(u.id);
      if (editingUserId === u.id) {
        handleCancelEdit();
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
            <UserPlus size={20} color="var(--primary-blue)" />
            <span>Kamdhenu Contact & User Library</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Saved contacts can be edited, assigned to tasks, shared across custom lists, or deleted from your library at any time.
          </p>

          {error && (
            <div style={{ background: '#fde8e8', color: '#a80000', padding: '8px 12px', borderRadius: 4, fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Form for Add or Edit */}
          <form onSubmit={handleSubmit} style={{ background: '#faf9f8', padding: 12, borderRadius: 6, border: '1px solid var(--border-color)', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{editingUserId ? `Edit Contact: "${name}"` : 'Add New Contact'}</span>
              {editingUserId && (
                <button type="button" onClick={handleCancelEdit} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontSize: 12, cursor: 'pointer' }}>
                  Cancel Edit
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                <User size={16} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Full Name (e.g. Rahul Sharma)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                <Mail size={16} color="var(--text-secondary)" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                <Phone size={16} color="var(--whatsapp-color)" />
                <input
                  type="text"
                  placeholder="WhatsApp Phone with country code (e.g. +919876543210)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  {editingUserId ? 'Save Contact Changes' : 'Save Contact to Library'}
                </button>
              </div>
            </div>
          </form>

          {/* Directory List */}
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Saved Contacts ({users.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
            {users.map(u => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '8px 12px',
                  background: editingUserId === u.id ? '#e8f0fe' : 'white',
                  borderRadius: 4,
                  border: editingUserId === u.id ? '1px solid var(--primary-blue)' : '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{u.email} • {u.phone}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleStartEdit(u)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer' }}
                    title="Edit Contact"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    style={{ background: 'none', border: 'none', color: '#a80000', cursor: 'pointer' }}
                    title="Delete Contact"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
