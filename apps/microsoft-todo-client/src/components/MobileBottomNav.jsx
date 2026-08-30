import React from 'react';
import { CheckSquare, Star, UserCheck, ListTodo, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

export function MobileBottomNav({
  activeView,
  setActiveView,
  activeListId,
  setActiveListId,
  taskCounts = {},
  onOpenListsSheet,
}) {
  const isListsActive = Boolean(activeListId) || activeView === 'lists';
  const isTasksActive = !activeListId && activeView === 'all-tasks';
  const isImportantActive = !activeListId && activeView === 'important';
  const isAssignedActive = !activeListId && activeView === 'assigned-to-me';
  const isSettingsActive = !activeListId && activeView === 'settings';

  const allPendingCount = taskCounts['all-tasks'] || 0;
  const importantPendingCount = taskCounts['important'] || 0;
  const assignedPendingCount = taskCounts['assigned-to-me'] || 0;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#18181b] border-t border-[#27272a] px-2 py-2 flex items-center justify-around select-none shadow-2xl safe-area-bottom">
      {/* 1. Tasks Tab */}
      <button
        type="button"
        onClick={() => {
          setActiveListId(null);
          setActiveView('all-tasks');
        }}
        className={cn(
          'flex flex-col items-center gap-1 py-1 px-2 rounded-2xl transition-all cursor-pointer relative flex-1',
          isTasksActive ? 'text-[#38bdf8] font-extrabold' : 'text-[#a1a1aa] hover:text-white'
        )}
      >
        <div className="relative">
          <CheckSquare className="w-5 h-5" />
          {allPendingCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-4 px-1 rounded-full bg-[#0078d4] text-[9px] font-black text-white flex items-center justify-center shadow-xs">
              {allPendingCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Tasks</span>
      </button>

      {/* 2. Important Tab */}
      <button
        type="button"
        onClick={() => {
          setActiveListId(null);
          setActiveView('important');
        }}
        className={cn(
          'flex flex-col items-center gap-1 py-1 px-2 rounded-2xl transition-all cursor-pointer relative flex-1',
          isImportantActive ? 'text-[#f59e0b] font-extrabold' : 'text-[#a1a1aa] hover:text-white'
        )}
      >
        <div className="relative">
          <Star className={cn('w-5 h-5', isImportantActive && 'fill-[#f59e0b]')} />
          {importantPendingCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-4 px-1 rounded-full bg-[#f59e0b] text-[9px] font-black text-white flex items-center justify-center shadow-xs">
              {importantPendingCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Important</span>
      </button>

      {/* 3. Assigned to me Tab */}
      <button
        type="button"
        onClick={() => {
          setActiveListId(null);
          setActiveView('assigned-to-me');
        }}
        className={cn(
          'flex flex-col items-center gap-1 py-1 px-2 rounded-2xl transition-all cursor-pointer relative flex-1',
          isAssignedActive ? 'text-[#0284c7] font-extrabold' : 'text-[#a1a1aa] hover:text-white'
        )}
      >
        <div className="relative">
          <UserCheck className="w-5 h-5" />
          {assignedPendingCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-4 px-1 rounded-full bg-[#0284c7] text-[9px] font-black text-white flex items-center justify-center shadow-xs">
              {assignedPendingCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Assigned to me</span>
      </button>

      {/* 4. Lists Tab */}
      <button
        type="button"
        onClick={onOpenListsSheet}
        className={cn(
          'flex flex-col items-center gap-1 py-1 px-2 rounded-2xl transition-all cursor-pointer relative flex-1',
          isListsActive ? 'text-[#38bdf8] font-extrabold' : 'text-[#a1a1aa] hover:text-white'
        )}
      >
        <div className="relative">
          <ListTodo className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">Lists</span>
      </button>

      {/* 5. Settings Tab */}
      <button
        type="button"
        onClick={() => {
          setActiveListId(null);
          setActiveView('settings');
        }}
        className={cn(
          'flex flex-col items-center gap-1 py-1 px-2 rounded-2xl transition-all cursor-pointer relative flex-1',
          isSettingsActive ? 'text-[#38bdf8] font-extrabold' : 'text-[#a1a1aa] hover:text-white'
        )}
      >
        <div className="relative">
          <Settings className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">Settings</span>
      </button>
    </nav>
  );
}

export default MobileBottomNav;
