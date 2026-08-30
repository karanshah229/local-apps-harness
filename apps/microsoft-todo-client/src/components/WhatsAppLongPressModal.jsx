import React, { useState } from 'react';
import { X, Send, CheckCircle2, ListChecks, Filter } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon.jsx';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '../lib/utils';

export function WhatsAppLongPressModal({
  isOpen,
  onClose,
  list,
  pendingCount = 0,
  allCount = 0,
  filteredCount = 0,
  recipient = null,
  onExecuteShare,
}) {
  if (!isOpen || !list) return null;

  const [selectedScope, setSelectedScope] = useState('pending'); // 'pending' | 'all' | 'current_view'

  const scopes = [
    {
      id: 'pending',
      title: 'Pending Tasks Only',
      count: pendingCount,
      description: 'Send only active, incomplete tasks in this list',
      icon: CheckCircle2,
    },
    {
      id: 'all',
      title: 'All Tasks (Including Completed)',
      count: allCount,
      description: 'Send complete checklist of both pending and done items',
      icon: ListChecks,
    },
    {
      id: 'current_view',
      title: 'Current Filtered View',
      count: filteredCount,
      description: 'Send exactly what matches your active search and filters',
      icon: Filter,
    },
  ];

  const handleShare = () => {
    onExecuteShare(selectedScope);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card text-card-foreground rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-border/80 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center flex-shrink-0">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-foreground">Share via WhatsApp</h3>
              <p className="text-xs text-muted-foreground">{list.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Recipient info if determined */}
        {recipient && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60 mb-4">
            <Avatar className="w-8 h-8">
              <AvatarImage src={recipient.avatar} />
              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                {(recipient.name || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-foreground truncate">{recipient.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {recipient.phone || recipient.email}
              </div>
            </div>
          </div>
        )}

        {/* Scope Options */}
        <div className="space-y-2 mb-4">
          {scopes.map((s) => {
            const Icon = s.icon;
            const isSelected = selectedScope === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedScope(s.id)}
                className={cn(
                  'flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none',
                  isSelected
                    ? 'bg-[#25D366]/10 border-[#25D366] text-foreground'
                    : 'bg-card border-border/70 hover:border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      isSelected
                        ? 'bg-[#25D366] text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{s.title}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {s.description}
                    </div>
                  </div>
                </div>

                <span
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0',
                    isSelected
                      ? 'bg-[#25D366] text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {s.count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleShare}
          className="w-full h-11 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <WhatsAppIcon className="w-4 h-4" />
          <span>Open in WhatsApp</span>
        </button>
      </div>
    </div>
  );
}

export default WhatsAppLongPressModal;
