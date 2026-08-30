import React from 'react';
import { Star, ListPlus, Users, CheckSquare, UserCheck } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

export default function MobileBottomNav({
  activeView,
  setActiveView,
  activeListId,
  setActiveListId,
  taskCounts,
  onOpenListsSheet,
  onOpenUserLibrary,
  activeUser,
  lists
}) {
  const isTasksActive = activeView === 'all-tasks' && !activeListId;
  const isImportantActive = activeView === 'important' && !activeListId;
  const isAssignedActive = activeView === 'assigned-to-me' && !activeListId;
  const isCustomListActive = !!activeListId;

  const totalCustomListTasks = lists.reduce((acc, l) => acc + (l.pending_task_count || 0), 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-lg md:hidden pb-safe">
      <div className="flex items-center justify-around h-16 px-1">
        {/* 1. Tasks */}
        <button
          type="button"
          onClick={() => {
            setActiveView('all-tasks');
            setActiveListId(null);
          }}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full min-w-[60px] py-1 px-1 transition-all rounded-lg active:scale-95 touch-manipulation',
            isTasksActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Tasks"
        >
          <div className="relative">
            <CheckSquare className={cn('w-5 h-5 transition-transform', isTasksActive && 'scale-110')} />
            {taskCounts['all-tasks'] > 0 && (
              <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {taskCounts['all-tasks']}
              </span>
            )}
          </div>
          <span className="text-xs mt-1 tracking-tight">Tasks</span>
        </button>

        {/* 2. Important */}
        <button
          type="button"
          onClick={() => {
            setActiveView('important');
            setActiveListId(null);
          }}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full min-w-[60px] py-1 px-1 transition-all rounded-lg active:scale-95 touch-manipulation',
            isImportantActive ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Important"
        >
          <div className="relative">
            <Star className={cn('w-5 h-5 transition-transform', isImportantActive && 'scale-110')} />
            {taskCounts['important'] > 0 && (
              <span className="absolute -top-1 -right-2 bg-purple-600 text-white text-xs font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {taskCounts['important']}
              </span>
            )}
          </div>
          <span className="text-xs mt-1 tracking-tight">Important</span>
        </button>

        {/* 3. Assigned to me */}
        <button
          type="button"
          onClick={() => {
            setActiveView('assigned-to-me');
            setActiveListId(null);
          }}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full min-w-[60px] py-1 px-1 transition-all rounded-lg active:scale-95 touch-manipulation',
            isAssignedActive ? 'text-orange-500 font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Assigned to me"
        >
          <div className="relative">
            <UserCheck className={cn('w-5 h-5 transition-transform', isAssignedActive && 'scale-110')} />
            {taskCounts['assigned-to-me'] > 0 && (
              <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {taskCounts['assigned-to-me']}
              </span>
            )}
          </div>
          <span className="text-xs mt-1 tracking-tight">Assigned</span>
        </button>

        {/* 4. Lists Sheet Trigger */}
        <button
          type="button"
          onClick={onOpenListsSheet}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full min-w-[60px] py-1 px-1 transition-all rounded-lg active:scale-95 touch-manipulation',
            isCustomListActive || isTasksActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Lists"
        >
          <div className="relative">
            <ListPlus className={cn('w-5 h-5 transition-transform', (isCustomListActive || isTasksActive) && 'scale-110')} />
            {totalCustomListTasks > 0 && (
              <span className="absolute -top-1 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {totalCustomListTasks}
              </span>
            )}
          </div>
          <span className="text-xs mt-1 tracking-tight">Lists</span>
        </button>

        {/* 5. Contacts / Account Trigger */}
        <button
          type="button"
          onClick={onOpenUserLibrary}
          className="flex flex-col items-center justify-center flex-1 h-full min-w-[60px] py-1 px-1 text-muted-foreground hover:text-foreground transition-all rounded-lg active:scale-95 touch-manipulation"
          aria-label="Contacts & Account"
        >
          <div className="relative">
            {activeUser ? (
              <img
                src={activeUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeUser.name}`}
                alt={activeUser.name}
                className="w-5 h-5 rounded-full ring-1 ring-border object-cover"
              />
            ) : (
              <Users className="w-5 h-5" />
            )}
          </div>
          <span className="text-xs mt-1 tracking-tight truncate max-w-[58px]">
            {activeUser ? activeUser.name.split(' ')[0] : 'Contacts'}
          </span>
        </button>
      </div>
    </nav>
  );
}
