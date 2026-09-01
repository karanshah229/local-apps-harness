import { THEME_PALETTES, ThemeColor, getThemeGradient, getThemePrimary } from '@shared/todo';

export const lightColors = {
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#0078d4',
  primaryForeground: '#ffffff',
  destructive: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  whatsapp: '#25D366',
  inputBg: '#f1f5f9',
};

export const darkColors = {
  background: '#09090b',
  card: '#18181b',
  border: '#27272a',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  primary: '#0078d4',
  primaryForeground: '#ffffff',
  destructive: '#f87171',
  success: '#34d399',
  warning: '#fbbf24',
  whatsapp: '#25D366',
  inputBg: '#27272a',
};

export function getThemeGradientColors(theme: string = 'blue', isDarkMode: boolean = false): [string, string] {
  return getThemeGradient(theme, isDarkMode);
}
