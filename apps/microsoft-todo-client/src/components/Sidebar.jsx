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
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
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

  const themeColorValue = (c) => {
    switch (c) {
      case 'purple': return '#a855f7';
      case 'green': return '#22c55e';
      case 'orange': return '#f97316';
      case 'red': return '#ef4444';
      case 'dark': return '#71717a';
      default: return '#0078d4';
    }
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

            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {users.map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => onSelectUser(u)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-xl',
                      activeUser?.id === u.id && 'bg-primary/10 text-primary font-bold'
                    )}
                  >
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarImage
                        src={
                          u.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(u.name || 'User')}`
                        }
                        alt={u.name}
                      />
                      <AvatarFallback className="text-[10px]">
                        {u.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="truncate flex-1">
                      <div className="font-semibold text-xs truncate">{u.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{u.phone || u.email}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {isCollapsed && (
          <Avatar className="w-9 h-9 mx-auto ring-2 ring-primary/20">
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
        )}

        {/* Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer flex-shrink-0"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links Scroll Container */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Smart Views Group */}
        <div className="space-y-1">
          {defaultViews.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id && activeListId === null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setActiveListId(null);
                }}
                className={cn(
                  'group w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer',
                  isCollapsed && 'justify-center px-0 min-h-[44px]',
                  isActive
                    ? item.activeBg
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
              >
                <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
                  <Icon
                    className={cn(
                      'w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110',
                      isActive ? 'stroke-[2.5]' : item.iconColor
                    )}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && item.count > 0 && (
                  <Badge
                    variant={isActive ? 'default' : 'counter'}
                    className={cn('text-[11px] px-2 py-0.5 rounded-full font-bold', isActive ? 'bg-primary text-primary-foreground' : '')}
                  >
                    {item.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Lists Header & Items */}
        <div className="space-y-1">
          <div className={cn('flex items-center justify-between px-2 pb-1.5', isCollapsed && 'justify-center')}>
            {!isCollapsed && (
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                My Lists
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
                    <ListTodo
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: themeColorValue(list.color_theme) }}
                    />
                  ) : (
                    <>
                      <span
                        className={cn(
                          'w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-125',
                          themeColorDot(list.color_theme)
                        )}
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
                      <Badge
                        variant="counter"
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                      >
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded-md transition-opacity"
                        title="Delete list"
                        aria-label="Delete list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Inline Add List Form */}
          {showAddListInput && !isCollapsed && (
            <form onSubmit={handleAddListSubmit} className="pt-2 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center gap-1.5 bg-background border border-primary/40 rounded-2xl p-1 shadow-xs">
                <Input
                  type="text"
                  placeholder="New list name..."
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 px-2"
                  autoFocus
                  onBlur={() => {
                    if (!newListTitle.trim()) setShowAddListInput(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowAddListInput(false);
                      setNewListTitle('');
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!newListTitle.trim()}
                  className="h-7 px-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl disabled:opacity-40 transition-opacity flex-shrink-0"
                >
                  Add
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
