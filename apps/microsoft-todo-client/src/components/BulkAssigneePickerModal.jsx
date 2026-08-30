import React, { useState, useMemo } from 'react';
import { X, Search, UserX, UserCheck } from 'lucide-react';
import { fuzzyMatch } from '@shared/todo';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '../lib/utils';

export function BulkAssigneePickerModal({
  isOpen,
  selectedCount = 0,
  users = [],
  onClose,
  onSelectAssignee,
}) {
  if (!isOpen) return null;

  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    return users.filter(
      (u) =>
        fuzzyMatch(u.name || '', search) ||
        fuzzyMatch(u.phone || '', search) ||
        fuzzyMatch(u.email || '', search)
    );
  }, [users, search]);

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
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-extrabold text-foreground">Assign Assignee</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              For {selectedCount} selected {selectedCount === 1 ? 'task' : 'tasks'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Unassigned Action */}
        <button
          type="button"
          onClick={() => {
            onSelectAssignee(null);
            onClose();
          }}
          className="flex items-center gap-3 p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-left transition-all mb-2 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-red-600 dark:text-red-400">
              Unassigned (Remove Assignee)
            </div>
            <div className="text-xs text-red-500/80">Clear assignee on selected tasks</div>
          </div>
        </button>

        {/* User List */}
        <div className="space-y-1.5 overflow-y-auto flex-1 max-h-[300px] py-1">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching contacts found
            </div>
          ) : (
            filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelectAssignee(u.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted/60 border border-transparent hover:border-border/60 transition-all text-left cursor-pointer"
              >
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage
                    src={
                      u.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(u.name || 'User')}`
                    }
                  />
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {(u.name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {u.phone || u.email || 'No contact info'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BulkAssigneePickerModal;
