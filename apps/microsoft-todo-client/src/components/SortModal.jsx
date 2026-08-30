import React from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  ArrowDownAZ,
  Check,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { DEFAULT_SORT_CONFIG } from '@shared/todo';
import { cn } from '../lib/utils';

export function SortModal({
  isOpen,
  onClose,
  currentSort = DEFAULT_SORT_CONFIG,
  onSelectSort,
  themePrimary = '#0078d4',
  viewTitle = '',
  isDarkMode = false,
}) {
  if (!isOpen) return null;

  const isSmart = currentSort.field === 'smart';
  const isDueDate = currentSort.field === 'due_date';
  const isCreatedAt = currentSort.field === 'created_at';
  const isTitle = currentSort.field === 'title';

  const handleSelectField = (field) => {
    if (field === 'smart') {
      onSelectSort({ field: 'smart', direction: 'asc' });
      onClose();
      return;
    }

    if (currentSort.field === field) {
      const nextDir = currentSort.direction === 'asc' ? 'desc' : 'asc';
      onSelectSort({ field, direction: nextDir });
    } else {
      const defaultDir = field === 'created_at' ? 'desc' : 'asc';
      onSelectSort({ field, direction: defaultDir });
    }
  };

  const handleToggleDirection = (field, e) => {
    e.stopPropagation();
    const nextDir = currentSort.direction === 'asc' ? 'desc' : 'asc';
    onSelectSort({ field, direction: nextDir });
  };

  const options = [
    {
      id: 'smart',
      title: 'Smart Sort',
      description: 'Overdue → Due in 3 days → Important → Backlog',
      icon: Sparkles,
      isActive: isSmart,
      hasDirection: false,
      ascLabel: '',
      descLabel: '',
    },
    {
      id: 'due_date',
      title: 'Due Date',
      description: isDueDate
        ? currentSort.direction === 'asc'
          ? 'Earliest deadline first'
          : 'Latest deadline first'
        : 'Sort by target completion date',
      icon: Calendar,
      isActive: isDueDate,
      hasDirection: true,
      ascLabel: 'Earliest first',
      descLabel: 'Latest first',
    },
    {
      id: 'created_at',
      title: 'Creation Date',
      description: isCreatedAt
        ? currentSort.direction === 'desc'
          ? 'Newest added first'
          : 'Oldest added first'
        : 'Sort by date task was created',
      icon: Clock,
      isActive: isCreatedAt,
      hasDirection: true,
      ascLabel: 'Oldest first',
      descLabel: 'Newest first',
    },
    {
      id: 'title',
      title: 'Alphabetical',
      description: isTitle
        ? currentSort.direction === 'asc'
          ? 'Alphabetical (A to Z)'
          : 'Reverse alphabetical (Z to A)'
        : 'Sort alphabetically by task title',
      icon: ArrowDownAZ,
      isActive: isTitle,
      hasDirection: true,
      ascLabel: 'A → Z',
      descLabel: 'Z → A',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card text-card-foreground rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-border/80 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle for mobile */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-foreground">Sort Tasks</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {viewTitle ? `Organize tasks in ${viewTitle}` : 'Choose how tasks are organized'}
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

        {/* Options List */}
        <div className="space-y-2.5 overflow-y-auto flex-1 py-1">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <div
                key={opt.id}
                onClick={() => handleSelectField(opt.id)}
                className={cn(
                  'flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none',
                  opt.isActive
                    ? 'bg-primary/10 border-primary shadow-xs'
                    : 'bg-card border-border/70 hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                      opt.isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-bold truncate', opt.isActive ? 'text-primary' : 'text-foreground')}>
                      {opt.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {opt.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {opt.isActive && opt.hasDirection && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleDirection(opt.id, e)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs"
                    >
                      {currentSort.direction === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span>{currentSort.direction === 'asc' ? opt.ascLabel : opt.descLabel}</span>
                    </button>
                  )}

                  {opt.isActive && !opt.hasDirection && (
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Done Action */}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-95 active:scale-[0.99] transition-all shadow-md cursor-pointer flex items-center justify-center"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default SortModal;
