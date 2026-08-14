import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, ExternalLink, Phone } from 'lucide-react';

export default function WhatsAppShareModal({ isOpen, onClose, config, users }) {
  const [waLink, setWaLink] = useState('');
  const [message, setMessage] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && config) {
      if (config.recipientUserId) {
        setSelectedUserId(config.recipientUserId);
      }
      fetchWhatsAppPayload(config.recipientUserId, '');
    }
  }, [isOpen, config]);

  const fetchWhatsAppPayload = async (userId, customPhone) => {
    if (!config) return;
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: config.type,
          taskId: config.taskId,
          taskIds: config.taskIds,
          listId: config.listId,
          recipientUserId: userId || null,
          customPhone: customPhone || ''
        })
      });

      if (res.ok) {
        const data = await res.json();
        setWaLink(data.waLink);
        setMessage(data.message);
        setRecipientPhone(data.recipientPhone || '');
        setRecipientName(data.recipientName || 'Recipient');
      }
    } catch (err) {
      console.error('Error fetching WhatsApp payload:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    const u = users.find(x => x.id === parseInt(userId));
    fetchWhatsAppPayload(userId, u ? u.phone : '');
  };

  const handleCustomPhoneChange = (phone) => {
    setRecipientPhone(phone);
    fetchWhatsAppPayload(selectedUserId, phone);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (waLink) {
      window.open(waLink, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen || !config) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, color: 'var(--whatsapp-dark)' }}>
            <Send size={20} color="var(--whatsapp-color)" />
            <span>
              {config.type === 'single' && 'Send Single Task WhatsApp Reminder'}
              {config.type === 'batch' && 'Send Batch Tasks WhatsApp Digest'}
              {config.type === 'list' && 'Share Whole List via WhatsApp'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Recipient Selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Select Contact from User Library
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserSelect(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border-color)', fontSize: 13, marginBottom: 8 }}
            >
              <option value="">Choose contact...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  👤 {u.name} ({u.phone})
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={16} color="var(--whatsapp-color)" />
              <input
                type="text"
                placeholder="Or enter custom WhatsApp phone number (with country code)"
                value={recipientPhone}
                onChange={(e) => handleCustomPhoneChange(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border-color)', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Formatted Message Preview */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Message Preview</span>
            <button
              onClick={handleCopyMessage}
              style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {copied ? <Check size={14} color="#107c41" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
          </div>

          <div className="whatsapp-preview-box">
            {loading ? 'Generating formatted message...' : message}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-whatsapp" onClick={handleOpenWhatsApp} disabled={!waLink}>
            <ExternalLink size={16} /> Open in WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
