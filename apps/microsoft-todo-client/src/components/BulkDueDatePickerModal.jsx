import React, { useState } from 'react';
import { Calendar, X, Sun, Sunrise, CalendarDays, Ban } from 'lucide-react';
import { getQuickDueDatePresets } from '@shared/todo';
import { cn } from '../lib/utils';

export function BulkDueDatePickerModal({
  isOpen,
  selectedCount = 0,
  onClose,
  onSelectDueDate,
}) {
  if (!isOpen) return null;

  const [customDate, setCustomDate] = useState('');
  const presets = getQuickDueDatePresets();

  const handleCustomApply = (e) => {
    e.preventDefault();
    if (/^\d{4}-\d{2}-\d{2}$/.test(customDate.trim())) {
      onSelectDueDate(customDate.trim());
      setCustomDate('');
      onClose();
    }
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
          <div>
            <h3 className="text-lg font-extrabold text-foreground">Assign Due Date</h3>
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

        {/* Presets */}
        <div className="space-y-2 mb-4">
          <button
            type="button"
            onClick={() => {
              onSelectDueDate(presets.today);
              onClose();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/60 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-sky-500" />
              <span className="text-sm font-bold text-foreground">Today</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">{presets.todayFormatted}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectDueDate(presets.tomorrow);
              onClose();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/60 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Sunrise className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-bold text-foreground">Tomorrow</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">{presets.tomorrowFormatted}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectDueDate(presets.nextMonday);
              onClose();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/60 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-bold text-foreground">Next Week</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">{presets.nextMondayFormatted}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectDueDate(null);
              onClose();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Ban className="w-5 h-5 text-red-500" />
              <span className="text-sm font-bold text-red-600 dark:text-red-400">No Due Date (Clear)</span>
            </div>
          </button>
        </div>

        {/* Custom Date Input */}
        <form onSubmit={handleCustomApply} className="pt-3 border-t border-border/70 space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Or Custom Date
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={!customDate}
              className={cn(
                'px-4 py-2.5 rounded-xl font-bold text-sm transition-all',
                customDate
                  ? 'bg-primary text-primary-foreground hover:opacity-90 cursor-pointer shadow-sm'
                  : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
              )}
            >
              Set
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BulkDueDatePickerModal;
