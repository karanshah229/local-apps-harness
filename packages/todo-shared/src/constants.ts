export const SYSTEM_VIEW_THEMES = ['blue', 'orange', 'purple'] as const;

export const CUSTOM_LIST_THEMES: string[] = [
  'green',    // 1: Emerald Green
  'pink',     // 2: Rose Pink
  'amber',    // 3: Golden Amber
  'indigo',   // 4: Deep Indigo
  'cyan',     // 5: Aqua Cyan
  'red',      // 6: Crimson Red
  'lime',     // 7: Vivid Lime
  'fuchsia',  // 8: Deep Fuchsia
  'teal',     // 9: Ocean Teal
  'dark',     // 10: Slate Charcoal
];

export const THEME_COLORS: string[] = CUSTOM_LIST_THEMES;

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
  cyan: {
    name: 'Cyan',
    primary: '#0891b2',
    darkPrimary: '#22d3ee',
    gradientStart: '#0891b2',
    gradientEnd: '#164e63',
    darkGradientStart: '#22d3ee',
    darkGradientEnd: '#0891b2',
    nativeGradient: ['#0891b2', '#164e63'],
    darkNativeGradient: ['#22d3ee', '#0891b2'],
  },
  lime: {
    name: 'Lime',
    primary: '#65a30d',
    darkPrimary: '#a3e635',
    gradientStart: '#65a30d',
    gradientEnd: '#365314',
    darkGradientStart: '#a3e635',
    darkGradientEnd: '#65a30d',
    nativeGradient: ['#65a30d', '#365314'],
    darkNativeGradient: ['#a3e635', '#65a30d'],
  },
  fuchsia: {
    name: 'Fuchsia',
    primary: '#c026d3',
    darkPrimary: '#e879f9',
    gradientStart: '#c026d3',
    gradientEnd: '#701a75',
    darkGradientStart: '#e879f9',
    darkGradientEnd: '#c026d3',
    nativeGradient: ['#c026d3', '#701a75'],
    darkNativeGradient: ['#e879f9', '#c026d3'],
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
  '#0d9488', // Teal
  '#10b981', // Emerald Mint
  '#ec4899', // Hot Pink
  '#4f46e5', // Deep Indigo
  '#e11d48', // Crimson Red
  '#d97706', // Amber Gold
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
