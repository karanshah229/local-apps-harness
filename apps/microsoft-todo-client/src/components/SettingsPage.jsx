import React from 'react';
import {
  ArrowLeft,
  Moon,
  Sun,
  Palette,
  CheckCircle2,
  Info,
  Laptop
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function SettingsPage({
  onBack,
  isDarkMode,
  themeMode,
  onSetThemeMode
}) {
  const THEME_OPTIONS = [
    {
      id: 'light',
      title: 'Light Theme',
      description: 'Crisp daytime interface with bright neutral surfaces.',
      icon: Sun,
      iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
    },
    {
      id: 'dark',
      title: 'Dark Theme',
      description: 'High contrast dark background tailored for eye comfort.',
      icon: Moon,
      iconClass: 'bg-slate-900 text-sky-400 dark:bg-sky-950/50 dark:text-sky-400'
    },
    {
      id: 'system',
      title: 'System Default',
      description: 'Automatically synchronizes with your device theme.',
      icon: Laptop,
      iconClass: 'bg-muted text-foreground'
    }
  ];

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 bg-card border-b border-border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center border border-border/40 transition-all active:scale-95 flex-shrink-0"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Customize appearance and app preferences
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-4xl w-full mx-auto pb-24 md:pb-8">
        {/* Appearance & Theme Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            <Palette className="w-4 h-4 text-primary" />
            Appearance & Theme
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {THEME_OPTIONS.map((opt) => {
              const IconComp = opt.icon;
              const isSelected = themeMode === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSetThemeMode(opt.id)}
                  className={cn(
                    'flex flex-col items-start p-5 rounded-3xl border-2 transition-all text-left shadow-sm group relative',
                    isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'border-border bg-card hover:bg-muted/40 hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm',
                        opt.iconClass
                      )}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    {isSelected && (
                      <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-base text-foreground">{opt.title}</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* About Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            <Info className="w-4 h-4 text-slate-500" />
            About
          </div>

          <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-3 text-xs text-muted-foreground divide-y divide-border/50">
            <div className="flex justify-between items-center py-1">
              <span className="font-semibold text-foreground text-sm">Product</span>
              <span className="font-bold text-foreground text-sm">Kamdhenu ToDo</span>
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="font-medium text-foreground">Version</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="font-medium text-foreground">Platform Capabilities</span>
              <span>Cloud Sync, WhatsApp Reminders, Subtasks, Multi-select</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
