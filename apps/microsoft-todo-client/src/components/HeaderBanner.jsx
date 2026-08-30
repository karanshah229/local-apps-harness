import React, { useState } from 'react';
import {
  CheckSquare,
  Share2,
  Palette,
  Settings,
  MoreVertical,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon.jsx';
import { Badge } from './ui/badge.jsx';
import { THEME_COLORS, PRESET_CUSTOM_COLORS, getThemePrimary } from '@shared/todo';
import { cn } from '../lib/utils';

export function HeaderBanner({
  headerTitle = 'Tasks',
  formattedDate = '',
  pendingCount = 0,
  completedCount = 0,
  activeList = null,
  isMultiSelectMode = false,
  onToggleMultiSelect,
  onOpenShareModal,
  onWhatsAppList,
  onLongPressWhatsApp,
  onUpdateListTheme,
  onDeleteList,
  onOpenSettings,
  isDarkMode = false,
}) {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [customHexInput, setCustomHexInput] = useState('');
  const [activeThemeTab, setActiveThemeTab] = useState('palette'); // 'palette' | 'custom'

  const getThemeGradient = () => {
    if (activeList) {
      if (activeList.color_theme?.startsWith('#')) {
        return '';
      }
      return `theme-gradient-${activeList.color_theme || 'blue'}`;
    }
    if (headerTitle === 'Important') return 'theme-gradient-orange';
    if (headerTitle === 'Assigned to me') return 'theme-gradient-purple';
    return 'theme-gradient-blue';
  };

  const customBgStyle = activeList?.color_theme?.startsWith('#')
    ? { backgroundColor: activeList.color_theme }
    : {};

  const handleApplyCustomHex = (e) => {
    e.preventDefault();
    if (/^#[0-9A-Fa-f]{6}$/.test(customHexInput.trim())) {
      onUpdateListTheme?.(activeList.id, customHexInput.trim());
      setShowThemePicker(false);
      setCustomHexInput('');
    }
  };

  return (
    <div className="flex-shrink-0 p-3 sm:p-4 pb-0 z-10 select-none">
      <div
        style={customBgStyle}
        className={cn(
          'relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white shadow-lg transition-all duration-300',
          getThemeGradient()
        )}
      >
        {/* Subtle Ambient Light Decoration */}
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="space-y-1 overflow-hidden flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
              <span>{formattedDate}</span>
              {activeList?.members?.length > 0 && (
                <Badge variant="glass" className="text-[10px] px-2 py-0.5 rounded-full">
                  Shared with {activeList.members.length}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate drop-shadow-xs">
              {headerTitle}
            </h1>
            <div className="text-xs font-medium text-white/85">
              {pendingCount} pending • {completedCount} completed
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Multi-Select Trigger */}
            <button
              type="button"
              onClick={onToggleMultiSelect}
              className={cn(
                'h-9 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md border border-white/20 active:scale-95 shadow-xs',
                isMultiSelectMode
                  ? 'bg-white text-slate-900 font-extrabold shadow-md'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              )}
              title="Select multiple tasks"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{isMultiSelectMode ? 'Cancel' : 'Select'}</span>
            </button>

            {activeList && (
              <>
                {/* Share List Modal Button */}
                <button
                  type="button"
                  onClick={() => onOpenShareModal?.(activeList)}
                  className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Share list with contacts"
                  aria-label="Share list"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {/* WhatsApp List Trigger */}
                <button
                  type="button"
                  onClick={onWhatsAppList}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onLongPressWhatsApp?.();
                  }}
                  className="w-9 h-9 rounded-xl bg-[#25D366]/90 hover:bg-[#25D366] text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Send list via WhatsApp (Right click for options)"
                  aria-label="Send WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </button>

                {/* Theme Palette Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowThemePicker(!showThemePicker)}
                    className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                    title="Change List Theme"
                    aria-label="Change Theme"
                  >
                    <Palette className="w-4 h-4" />
                  </button>

                  {showThemePicker && (
                    <div className="absolute right-0 top-12 bg-card text-card-foreground p-3 rounded-2xl shadow-2xl border border-border/80 z-40 w-64 animate-in fade-in-50 zoom-in-95">
                      <div className="flex rounded-xl bg-muted/60 p-1 mb-3">
                        <button
                          type="button"
                          onClick={() => setActiveThemeTab('palette')}
                          className={cn(
                            'flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                            activeThemeTab === 'palette'
                              ? 'bg-card text-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          Palettes
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveThemeTab('custom')}
                          className={cn(
                            'flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                            activeThemeTab === 'custom'
                              ? 'bg-card text-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          Custom HEX
                        </button>
                      </div>

                      {activeThemeTab === 'palette' ? (
                        <div className="grid grid-cols-5 gap-2">
                          {THEME_COLORS.map((c) => {
                            const primaryColor = getThemePrimary(c, isDarkMode);
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  onUpdateListTheme?.(activeList.id, c);
                                  setShowThemePicker(false);
                                }}
                                style={{ backgroundColor: primaryColor }}
                                className={cn(
                                  'w-8 h-8 rounded-full shadow-xs transition-transform active:scale-90 cursor-pointer',
                                  activeList.color_theme === c && 'ring-2 ring-offset-2 ring-primary'
                                )}
                                aria-label={`Theme ${c}`}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-5 gap-2">
                            {PRESET_CUSTOM_COLORS.map((hex) => (
                              <button
                                key={hex}
                                type="button"
                                onClick={() => {
                                  onUpdateListTheme?.(activeList.id, hex);
                                  setShowThemePicker(false);
                                }}
                                style={{ backgroundColor: hex }}
                                className={cn(
                                  'w-8 h-8 rounded-full shadow-xs transition-transform active:scale-90 cursor-pointer',
                                  activeList.color_theme === hex && 'ring-2 ring-offset-2 ring-primary'
                                )}
                                aria-label={`Preset color ${hex}`}
                              />
                            ))}
                          </div>
                          <form onSubmit={handleApplyCustomHex} className="flex gap-1.5 pt-2 border-t border-border/70">
                            <input
                              type="text"
                              placeholder="#3b82f6"
                              value={customHexInput}
                              onChange={(e) => setCustomHexInput(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              type="submit"
                              disabled={!/^#[0-9A-Fa-f]{6}$/.test(customHexInput.trim())}
                              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40 cursor-pointer"
                            >
                              Set
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Settings Action */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Settings"
              aria-label="Open Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeaderBanner;
