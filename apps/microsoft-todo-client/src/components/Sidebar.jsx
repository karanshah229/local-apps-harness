import React, { useState } from 'react';
import {
  Sun,
  Star,
  Calendar,
  UserCheck,
  CheckSquare,
  Plus,
  Users,
  Share2,
  Trash2,
  ListTodo
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

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
    {
      id: 'all-tasks',
      label: 'Tasks',
      icon: CheckSquare,
      color: 'text-blue-600 dark:text-blue-400',
      count: taskCounts['all-tasks'] || 0
    },
    {
      id: 'important',
      label: 'Important',
      icon: Star,
      color: 'text-purple-600 dark:text-purple-400',
      count: taskCounts['important'] || 0
    },
    {
      id: 'assigned-to-me',
      label: 'Assigned to me',
      icon: UserCheck,
      color: 'text-orange-500',
      count: taskCounts['assigned-to-me'] || 0
    }
  ];

  const themeColorDot = (c) => {
    switch (c) {
      case 'purple': return 'bg-[#742774]';
      case 'green': return 'bg-[#107c41]';
      case 'orange': return 'bg-[#d83b01]';
      case 'red': return 'bg-[#e81123]';
      case 'dark': return 'bg-[#2b2b2b]';
      default: return 'bg-[#0078d4]';
    }
  };

  return (
    <aside className="hidden md:flex w-72 bg-muted/30 border-r border-border flex-col h-full flex-shrink-0 select-none">
      {/* Branding */}
      <div className="p-4 border-b border-border/60 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-sm">
          K
        </div>
        <div>
          <div className="font-bold text-sm text-foreground tracking-tight">Kamdhenu To Do</div>
          <div className="text-[11px] text-muted-foreground">Task Sync & WhatsApp Reminders</div>
        </div>
      </div>

      {/* Active Account Switcher */}
      <div className="p-3 border-b border-border/60">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          Active Account
        </div>
        <select
          value={activeUser?.id || ''}
          onChange={(e) => {
            const u = users.find((x) => x.id === parseInt(e.target.value));
            if (u) setActiveUser(u);
          }}
          className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.phone})
            </option>
          ))}
        </select>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {defaultViews.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.id && !activeListId;

          return (
            <button
              key={view.id}
              type="button"
              onClick={() => {
                setActiveView(view.id);
                setActiveListId(null);
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                isActive
                  ? 'bg-primary/10 text-primary font-bold shadow-sm'
                  : 'text-foreground hover:bg-muted/60'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('w-4 h-4', view.color)} />
                <span>{view.label}</span>
              </div>
              {view.count > 0 && <Badge variant="counter">{view.count}</Badge>}
            </button>
          );
        })}

        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">
          My Custom Lists
        </div>

        {lists.map((list) => {
          const isActive = activeListId === list.id;
          const isShared = list.members && list.members.length > 0;

          return (
            <div
              key={list.id}
              onClick={() => {
                setActiveListId(list.id);
                setActiveView(null);
              }}
              className={cn(
                'group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-primary/10 text-primary font-bold shadow-sm'
                  : 'text-foreground hover:bg-muted/60'
              )}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', themeColorDot(list.color_theme))} />
                <span className="truncate">{list.title}</span>
                {isShared && (
                  <Share2 className="w-3 h-3 text-primary flex-shrink-0" title={`Shared with ${list.members.length} member(s)`} />
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {list.pending_task_count > 0 && (
                  <Badge variant="counter">{list.pending_task_count}</Badge>
                )}
                {!list.is_default && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete list "${list.title}"?`)) {
                        onDeleteList(list.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded transition-opacity"
                    aria-label="Delete list"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {showAddListInput ? (
          <form onSubmit={handleAddListSubmit} className="pt-2">
            <Input
              type="text"
              placeholder="List name..."
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              autoFocus
              className="h-9 text-xs"
            />
          </form>
        ) : null}
      </div>

      {/* Footer controls */}
      <div className="p-3 border-t border-border flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 h-9 border-dashed gap-1 text-xs font-semibold"
          onClick={() => setShowAddListInput(true)}
        >
          <Plus className="w-3.5 h-3.5" /> New List
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 px-3 text-xs font-semibold gap-1.5"
          onClick={onOpenUserLibrary}
        >
          <Users className="w-3.5 h-3.5 text-primary" /> Contacts
        </Button>
      </div>
    </aside>
  );
}
