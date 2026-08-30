import React, { useState } from 'react';
import {
  CheckSquare,
  Star,
  UserCheck,
  Plus,
  Users,
  Share2,
  Trash2,
  ListTodo,
  PanelLeftOpen,
  PanelLeftClose,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Input } from './ui/input.jsx';
import { Badge } from './ui/badge.jsx';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.jsx';
import { getThemePrimary } from '@shared/todo';
import { cn } from '../lib/utils';

export default function Sidebar({
  activeView,
  setActiveView,
  lists = [],
  activeListId,
  setActiveListId,
  users = [],
  activeUser,
  onSelectUser,
  onCreateList,
  onDeleteList,
  taskCounts = {},
  isCollapsed = false,
  onToggleCollapse,
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

  const handleOpenAddList = () => {
    if (isCollapsed && onToggleCollapse) {
      onToggleCollapse();
    }
    setShowAddListInput(true);
  };

  const defaultViews = [
    {
      id: 'all-tasks',
      label: 'All tasks',
      icon: CheckSquare,
      iconColor: 'text-sky-500',
      activeBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold',
      count: taskCounts['all-tasks'] || 0,
    },
    {
      id: 'important',
      label: 'Important',
      icon: Star,
      iconColor: 'text-orange-500',
      activeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold',
      count: taskCounts['important'] || 0,
    },
    {
      id: 'assigned-to-me',
      label: 'Assigned to me',
      icon: UserCheck,
      iconColor: 'text-purple-500',
      activeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold',
      count: taskCounts['assigned-to-me'] || 0,
    },
  ];

  const getDotColor = (theme) => {
    return getThemePrimary(theme);
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-full bg-card/60 backdrop-blur-xl border-r border-border/80 transition-all duration-300 relative z-30 select-none shadow-xs',
        isCollapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* Header Profile / Switcher Bar */}
      <div className="p-4 border-b border-border/60 flex items-center justify-between gap-2 min-h-[64px]">
        {!isCollapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 p-1.5 -ml-1 rounded-2xl hover:bg-muted/70 transition-all text-left flex-1 min-w-0 group cursor-pointer"
              >
                <Avatar className="w-9 h-9 ring-2 ring-primary/20 flex-shrink-0 group-hover:ring-primary/40 transition-all">
                  <AvatarImage
                    src={
                      activeUser?.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(activeUser?.name || 'User')}`
                    }
                    alt={activeUser?.name || 'Profile'}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {activeUser?.name?.slice(0, 2).toUpperCase() || 'TO'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {activeUser?.name || 'Select User'}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {activeUser?.email || activeUser?.phone || 'Local Workspace'}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64 p-1.5 rounded-2xl shadow-xl border-border/80">
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5 font-bold uppercase tracking-wider">
                Switch Active User
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-60 overflow-y-auto space-y-1">
                {users.map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => onSelectUser(u)}
                    className={cn(
                      'flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors',
                      activeUser?.id === u.id
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage
                        src={
                          u.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(u.name || 'User')}`
                        }
                      />
                      <AvatarFallback className="text-[9px]">
                        {u.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 truncate">
                      <div className="truncate">{u.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{u.phone || u.email}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Collapse Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all cursor-pointer flex-shrink-0',
            isCollapsed && 'mx-auto'
          )}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Default Smart Views */}
        <div className="space-y-1">
          {defaultViews.map((v) => {
            const Icon = v.icon;
            const isActive = activeView === v.id && !activeListId;

            return (
              <div
                key={v.id}
                onClick={() => {
                  setActiveView(v.id);
                  setActiveListId(null);
                }}
                className={cn(
                  'group w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer',
                  isCollapsed && 'justify-center px-0 min-h-[44px]',
                  isActive
                    ? v.activeBg
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                role="button"
                tabIndex={0}
                title={isCollapsed ? v.label : undefined}
                aria-label={v.label}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveView(v.id);
                    setActiveListId(null);
                  }
                }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-inherit' : v.iconColor)} />
                  {!isCollapsed && <span className="truncate">{v.label}</span>}
                </div>
                {!isCollapsed && v.count > 0 && (
                  <Badge variant="counter" className="text-[10px] px-1.5 py-0.5 rounded-full">
                    {v.count}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom Lists Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 mb-2">
            {!isCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Lists ({lists.length})
              </span>
            )}
            <button
              type="button"
              onClick={handleOpenAddList}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
              title="Create new list"
              aria-label="Create new list"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {lists.map((list) => {
            const isActive = activeListId === list.id;
            const isShared = list.members && list.members.length > 0;
            const listColor = getDotColor(list.color_theme);

            return (
              <div
                key={list.id}
                onClick={() => {
                  setActiveListId(list.id);
                  setActiveView(null);
                }}
                className={cn(
                  'group w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer',
                  isCollapsed && 'justify-center px-0 min-h-[44px]',
                  isActive
                    ? 'bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/20'
                    : 'text-foreground hover:bg-muted/50'
                )}
                role="button"
                tabIndex={0}
                title={isCollapsed ? list.title : undefined}
                aria-label={list.title}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveListId(list.id);
                    setActiveView(null);
                  }
                }}
              >
                <div className={cn('flex items-center overflow-hidden', isCollapsed ? 'justify-center' : 'gap-2.5 flex-1 min-w-0')}>
                  {isCollapsed ? (
                    <ListTodo className="w-4 h-4 flex-shrink-0" style={{ color: listColor }} />
                  ) : (
                    <>
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-125 shadow-xs"
                        style={{ backgroundColor: listColor }}
                      />
                      <span className="truncate flex-1">{list.title}</span>
                      {isShared && (
                        <Share2 className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                      )}
                    </>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1.5">
                    {list.pending_task_count > 0 && (
                      <Badge variant="counter" className="text-[10px] px-1.5 py-0.5 rounded-full">
                        {list.pending_task_count}
                      </Badge>
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded-md transition-opacity cursor-pointer"
                        aria-label={`Delete list ${list.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Create Input Form */}
          {showAddListInput && !isCollapsed && (
            <form onSubmit={handleAddListSubmit} className="pt-2">
              <Input
                type="text"
                placeholder="List name..."
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                autoFocus
                onBlur={() => {
                  if (!newListTitle.trim()) setShowAddListInput(false);
                }}
                className="h-9 text-xs rounded-xl bg-background/80"
              />
            </form>
          )}
        </div>
      </div>

      {/* Sidebar Footer Link (Contacts / User Library) */}
      <div className="p-3 border-t border-border/60">
        <div
          onClick={() => {
            setActiveView('contacts');
            setActiveListId(null);
          }}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer',
            isCollapsed && 'justify-center px-0',
            activeView === 'contacts'
              ? 'bg-primary/10 text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
          role="button"
          tabIndex={0}
          title={isCollapsed ? 'Contacts & User Library' : undefined}
          aria-label="Contacts & User Library"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveView('contacts');
              setActiveListId(null);
            }
          }}
        >
          <Users className="w-4 h-4 flex-shrink-0 text-emerald-500" />
          {!isCollapsed && <span>Contacts & Library</span>}
        </div>
      </div>
    </aside>
  );
}
