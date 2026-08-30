import { ThemeColor } from './types.js';

export const THEME_COLORS: string[] = [
  'blue',
  'indigo',
  'purple',
  'pink',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'dark',
];

export interface ThemePaletteDefinition {
  name: string;
  primary: string;
  darkPrimary: string;
  gradientStart: string;
  gradientEnd: string;
  darkGradientStart: string;
  darkGradientEnd: string;
  nativeGradient: [string, string];
  darkNativeGradient: [string, string];
}

export const THEME_PALETTES: Record<string, ThemePaletteDefinition> = {
  blue: {
    name: 'Blue',
    primary: '#0078d4',
    darkPrimary: '#38bdf8',
    gradientStart: '#0078d4',
    gradientEnd: '#005a9e',
    darkGradientStart: '#38bdf8',
    darkGradientEnd: '#0284c7',
    nativeGradient: ['#0078d4', '#005a9e'],
    darkNativeGradient: ['#38bdf8', '#0284c7'],
  },
  indigo: {
    name: 'Indigo',
    primary: '#4f46e5',
    darkPrimary: '#818cf8',
    gradientStart: '#4f46e5',
    gradientEnd: '#3730a3',
    darkGradientStart: '#818cf8',
    darkGradientEnd: '#4f46e5',
    nativeGradient: ['#4f46e5', '#3730a3'],
    darkNativeGradient: ['#818cf8', '#4f46e5'],
  },
  purple: {
    name: 'Purple',
    primary: '#7c3aed',
    darkPrimary: '#a78bfa',
    gradientStart: '#7c3aed',
    gradientEnd: '#5b21b6',
    darkGradientStart: '#a78bfa',
    darkGradientEnd: '#7c3aed',
    nativeGradient: ['#7c3aed', '#5b21b6'],
    darkNativeGradient: ['#a78bfa', '#7c3aed'],
  },
  pink: {
    name: 'Pink',
    primary: '#db2777',
    darkPrimary: '#f472b6',
    gradientStart: '#db2777',
    gradientEnd: '#9d174d',
    darkGradientStart: '#f472b6',
    darkGradientEnd: '#db2777',
    nativeGradient: ['#db2777', '#9d174d'],
    darkNativeGradient: ['#f472b6', '#db2777'],
  },
  red: {
    name: 'Red',
    primary: '#e11d48',
    darkPrimary: '#fb7185',
    gradientStart: '#e11d48',
    gradientEnd: '#9f1239',
    darkGradientStart: '#fb7185',
    darkGradientEnd: '#e11d48',
    nativeGradient: ['#e11d48', '#9f1239'],
    darkNativeGradient: ['#fb7185', '#e11d48'],
  },
  orange: {
    name: 'Orange',
    primary: '#ea580c',
    darkPrimary: '#fb923c',
    gradientStart: '#ea580c',
    gradientEnd: '#9a3412',
    darkGradientStart: '#fb923c',
    darkGradientEnd: '#ea580c',
    nativeGradient: ['#ea580c', '#9a3412'],
    darkNativeGradient: ['#fb923c', '#ea580c'],
  },
  amber: {
    name: 'Amber',
    primary: '#d97706',
    darkPrimary: '#fbbf24',
    gradientStart: '#d97706',
    gradientEnd: '#92400e',
    darkGradientStart: '#fbbf24',
    darkGradientEnd: '#d97706',
    nativeGradient: ['#d97706', '#92400e'],
    darkNativeGradient: ['#fbbf24', '#d97706'],
  },
  green: {
    name: 'Green',
    primary: '#059669',
    darkPrimary: '#34d399',
    gradientStart: '#059669',
    gradientEnd: '#065f46',
    darkGradientStart: '#34d399',
    darkGradientEnd: '#059669',
    nativeGradient: ['#059669', '#065f46'],
    darkNativeGradient: ['#34d399', '#059669'],
  },
  teal: {
    name: 'Teal',
    primary: '#0d9488',
    darkPrimary: '#2dd4bf',
    gradientStart: '#0d9488',
    gradientEnd: '#115e59',
    darkGradientStart: '#2dd4bf',
    darkGradientEnd: '#0d9488',
    nativeGradient: ['#0d9488', '#115e59'],
    darkNativeGradient: ['#2dd4bf', '#0d9488'],
  },
  dark: {
    name: 'Dark',
    primary: '#334155',
    darkPrimary: '#94a3b8',
    gradientStart: '#334155',
    gradientEnd: '#1e293b',
    darkGradientStart: '#94a3b8',
    darkGradientEnd: '#475569',
    nativeGradient: ['#334155', '#1e293b'],
    darkNativeGradient: ['#94a3b8', '#475569'],
  },
};

export const PRESET_CUSTOM_COLORS: string[] = [
  '#0284c7', // Sky Blue
  '#6366f1', // Indigo Violet
  '#8b5cf6', // Electric Purple
  '#ec4899', // Hot Pink
  '#f43f5e', // Rose Coral
  '#f97316', // Bright Orange
  '#eab308', // Sun Yellow
  '#10b981', // Emerald Mint
  '#06b6d4', // Aqua Cyan
  '#64748b', // Slate Gray
];

export function getThemePrimary(theme?: string, isDark: boolean = false): string {
  if (!theme) return isDark ? '#38bdf8' : '#0078d4';
  if (theme.startsWith('#')) return theme;
  const pal = THEME_PALETTES[theme.toLowerCase()];
  if (pal) return isDark ? pal.darkPrimary : pal.primary;
  return isDark ? '#38bdf8' : '#0078d4';
}

export function getThemeGradient(theme?: string, isDark: boolean = false): [string, string] {
  if (!theme) return isDark ? ['#38bdf8', '#0284c7'] : ['#0078d4', '#005a9e'];
  if (theme.startsWith('#')) {
    return [theme, theme];
  }
  const pal = THEME_PALETTES[theme.toLowerCase()];
  if (pal) return isDark ? pal.darkNativeGradient : pal.nativeGradient;
  return isDark ? ['#38bdf8', '#0284c7'] : ['#0078d4', '#005a9e'];
}

export const SMART_VIEWS = [
  { id: 'all-tasks', label: 'Tasks', icon: 'check-square', color: 'blue' },
  { id: 'important', label: 'Important', icon: 'star', color: 'orange' },
  { id: 'assigned-to-me', label: 'Assigned to me', icon: 'user', color: 'purple' }
] as const;

export const QUERY_KEYS = {
  tasks: ['tasks'] as const,
  lists: ['lists'] as const,
  users: ['users'] as const,
  subtasks: (taskId: number) => ['subtasks', taskId] as const,
  whatsappLogs: ['whatsappLogs'] as const,
} as const;
