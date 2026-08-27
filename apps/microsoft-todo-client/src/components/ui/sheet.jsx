import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sheet({ open, onOpenChange, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open && onOpenChange) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange && onOpenChange(false)}
      />
      {children}
    </div>
  );
}

export function SheetContent({ side = 'bottom', className, children, onClose }) {
  return (
    <div
      className={cn(
        'relative z-50 w-full bg-card border-t border-border shadow-2xl p-5 sm:p-6 transition-all duration-300 animate-in slide-in-from-bottom pb-safe',
        side === 'bottom' && 'rounded-t-3xl max-h-[88vh] overflow-y-auto sm:rounded-2xl sm:max-w-lg sm:border sm:mx-auto sm:bottom-auto',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Mobile handle indicator */}
      {side === 'bottom' && (
        <div className="mx-auto -mt-2 mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30 sm:hidden" />
      )}
      {children}
    </div>
  );
}

export function SheetHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />;
}

export function SheetFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-3 border-t mt-3', className)}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-bold text-foreground tracking-tight', className)} {...props} />;
}

export function SheetDescription({ className, ...props }) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />;
}
