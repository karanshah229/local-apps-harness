import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Plus,
  Share2,
  Trash2,
  UserCheck,
  CheckSquare,
  Star,
  Sparkles,
  FolderOpen
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function ListsSheet({
  isOpen,
  onClose,
  lists,
  activeListId,
  setActiveListId,
  activeView,
  setActiveView,
  onCreateList,
  onDeleteList,
  taskCounts
}) {
  const [newListTitle, setNewListTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    onCreateList(newListTitle.trim());
    setNewListTitle('');
    setIsCreating(false);
    onClose();
  };

  const themeColorClass = (color) => {
    switch (color) {
      case 'purple': return 'bg-[#742774]';
      case 'green': return 'bg-[#107c41]';
      case 'orange': return 'bg-[#d83b01]';
      case 'red': return 'bg-[#e81123]';
      case 'dark': return 'bg-[#2b2b2b]';
      default: return 'bg-[#0078d4]';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[88vh] rounded-t-3xl p-5 pt-3">
        <SheetHeader className="pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <FolderOpen className="w-5 h-5 text-primary" />
            <span>Task Lists & Categories</span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Switch between custom lists, assigned tasks, or create a new shared list.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4 max-h-[58vh] overflow-y-auto pr-1">
          {/* Quick System Categories */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              General Views
            </div>

            {/* Tasks */}
            <div
              onClick={() => {
                setActiveView('all-tasks');
                setActiveListId(null);
                onClose();
              }}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border min-h-[50px] touch-manipulation',
                activeView === 'all-tasks' && !activeListId
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                  : 'bg-card hover:bg-muted/60 border-border text-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Tasks</span>
              </div>
              {taskCounts['all-tasks'] > 0 && (
                <Badge variant="counter">{taskCounts['all-tasks']}</Badge>
              )}
            </div>

            {/* Important */}
            <div
              onClick={() => {
                setActiveView('important');
                setActiveListId(null);
                onClose();
              }}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border min-h-[50px] touch-manipulation',
                activeView === 'important' && !activeListId
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                  : 'bg-card hover:bg-muted/60 border-border text-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Star className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Important</span>
              </div>
              {taskCounts['important'] > 0 && (
                <Badge variant="counter">{taskCounts['important']}</Badge>
              )}
            </div>

            {/* Assigned to me */}
            <div
              onClick={() => {
                setActiveView('assigned-to-me');
                setActiveListId(null);
                onClose();
              }}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border min-h-[50px] touch-manipulation',
                activeView === 'assigned-to-me' && !activeListId
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                  : 'bg-card hover:bg-muted/60 border-border text-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Assigned to me</span>
              </div>
              {taskCounts['assigned-to-me'] > 0 && (
                <Badge variant="counter">{taskCounts['assigned-to-me']}</Badge>
              )}
            </div>
          </div>

          {/* Custom Lists Section */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                My Custom Lists ({lists.length})
              </span>
            </div>

            {lists.length === 0 ? (
              <div className="text-center py-6 px-4 bg-muted/30 rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                No custom lists yet. Tap "+ New List" below to create one!
              </div>
            ) : (
              lists.map((list) => {
                const isActive = activeListId === list.id;
                const isShared = list.members && list.members.length > 0;

                return (
                  <div
                    key={list.id}
                    onClick={() => {
                      setActiveListId(list.id);
                      setActiveView(null);
                      onClose();
                    }}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border min-h-[52px] touch-manipulation',
                      isActive
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                        : 'bg-card hover:bg-muted/60 border-border text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span
                        className={cn(
                          'w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm',
                          themeColorClass(list.color_theme)
                        )}
                      />
                      <span className="text-sm font-medium truncate">{list.title}</span>
                      {isShared && (
                        <span
                          className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 flex-shrink-0"
                          title={`Shared with ${list.members.length} members`}
                        >
                          <Share2 className="w-3 h-3" />
                          <span>{list.members.length}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
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
                          className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                          aria-label={`Delete list ${list.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Create List Action */}
        <div className="pt-3 border-t border-border mt-2">
          {isCreating ? (
            <form onSubmit={handleCreateSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="List name (e.g. Shopping, Projects)..."
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                autoFocus
                className="flex-1 h-12 text-sm"
              />
              <Button type="submit" size="lg" className="h-12 px-5">
                Create
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="h-12 px-3"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-12 border-dashed gap-2 font-semibold shadow-sm"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="w-5 h-5 text-primary" />
              <span>Create New Custom List</span>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
