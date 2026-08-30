import React from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export function FilterModal({
  isOpen,
  onClose,
  filterStatus,
  setFilterStatus,
  filterImportance,
  setFilterImportance,
  filterDue,
  setFilterDue,
  filterAssigneeId,
  setFilterAssigneeId,
  filterListId,
  setFilterListId,
  users = [],
  lists = [],
  isSmartView = false,
  onResetFilters,
}) {
  if (!isOpen) return null;

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
          <div>
            <h3 className="text-lg font-extrabold text-foreground">Filter Tasks</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Narrow down tasks in current view</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto flex-1 py-1 pr-1">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'completed', label: 'Completed' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFilterStatus(s.id)}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer',
                    filterStatus === s.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/40 border-border hover:bg-muted text-foreground'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Importance Filter */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Importance
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'important', label: 'Starred' },
                { id: 'normal', label: 'Normal' },
              ].map((imp) => (
                <button
                  key={imp.id}
                  type="button"
                  onClick={() => setFilterImportance(imp.id)}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer',
                    filterImportance === imp.id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-muted/40 border-border hover:bg-muted text-foreground'
                  )}
                >
                  {imp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date Filter */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Due Date
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'tomorrow', label: 'Tomorrow' },
                { id: 'overdue', label: 'Overdue' },
                { id: 'has_due', label: 'Has Date' },
                { id: 'no_due', label: 'No Date' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setFilterDue(d.id)}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer',
                    filterDue === d.id
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-muted/40 border-border hover:bg-muted text-foreground'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Filter (If in smart view) */}
          {isSmartView && lists.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                List
              </label>
              <select
                value={filterListId}
                onChange={(e) => setFilterListId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">All Lists</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Assignee Filter */}
          {users.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Assignee
              </label>
              <select
                value={filterAssigneeId}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'all') setFilterAssigneeId('all');
                  else if (v === 'unassigned') setFilterAssigneeId('unassigned');
                  else setFilterAssigneeId(Number(v));
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned Only</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Done Action */}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-95 active:scale-[0.99] transition-all shadow-md cursor-pointer flex items-center justify-center"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}

export default FilterModal;
