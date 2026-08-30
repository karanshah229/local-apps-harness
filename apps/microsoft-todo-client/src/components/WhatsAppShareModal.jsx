import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Send,
  Copy,
  Check,
  ExternalLink,
  Phone,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

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
    const u = users.find((x) => x.id === parseInt(userId));
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

  if (!config) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-3xl p-5 pt-3">
        <SheetHeader className="pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold text-[#128C7E] dark:text-[#25D366]">
            <Send className="w-5 h-5 text-[#25D366]" />
            <span>
              {config.type === 'single' && 'WhatsApp Task Reminder'}
              {config.type === 'batch' && 'WhatsApp Batch Digest'}
              {config.type === 'list' && 'Share Whole List via WhatsApp'}
            </span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Format task details into a clean WhatsApp template and send directly to any contact.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Recipient Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Select Contact from User Library
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserSelect(e.target.value)}
              className="w-full h-12 px-3 rounded-xl bg-background border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#25D366] shadow-sm"
            >
              <option value="">Choose contact from library...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  👤 {u.name} ({u.phone})
                </option>
              ))}
            </select>

            <div className="relative">
              <Phone className="w-4 h-4 text-[#25D366] absolute left-3 top-4" />
              <Input
                type="tel"
                placeholder="Or custom WhatsApp phone (with country code)"
                value={recipientPhone}
                onChange={(e) => handleCustomPhoneChange(e.target.value)}
                className="pl-9 h-12"
              />
            </div>
          </div>

          {/* Formatted Message Bubble Preview */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Formatted Message Preview
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 px-2 py-1 rounded min-h-[36px] touch-manipulation"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#e5ddd5] dark:bg-[#111b21] border border-[#d1c7bd] dark:border-zinc-800 font-mono text-xs text-[#111b21] dark:text-zinc-100 whitespace-pre-wrap shadow-inner leading-relaxed select-text min-h-[120px] max-h-[220px] overflow-y-auto">
              {loading ? (
                <span className="text-muted-foreground italic">Generating formatted message...</span>
              ) : (
                message || 'No task content to format.'
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border mt-2 space-y-2">
          <Button
            type="button"
            variant="whatsapp"
            size="lg"
            className="w-full h-12 text-base font-bold gap-2 shadow-md"
            onClick={handleOpenWhatsApp}
            disabled={!waLink || loading}
          >
            <ExternalLink className="w-5 h-5" />
            <span>Open in WhatsApp</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full h-11 font-semibold"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
