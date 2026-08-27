import { ThemeColor } from './types';

export const THEME_COLORS: ThemeColor[] = ['blue', 'purple', 'green', 'orange', 'red', 'dark'];

export const THEME_PALETTES: Record<ThemeColor, {
  name: string;
  primary: string;
  gradientStart: string;
  gradientEnd: string;
  nativeGradient: [string, string];
}> = {
  blue: {
    name: 'Blue',
    primary: '#0078d4',
    gradientStart: '#0078d4',
    gradientEnd: '#005a9e',
    nativeGradient: ['#0078d4', '#005a9e'],
  },
  purple: {
    name: 'Purple',
    primary: '#742774',
    gradientStart: '#742774',
    gradientEnd: '#5c1b5c',
    nativeGradient: ['#742774', '#5c1b5c'],
  },
  green: {
    name: 'Green',
    primary: '#107c41',
    gradientStart: '#107c41',
    gradientEnd: '#0b5a2f',
    nativeGradient: ['#107c41', '#0b5a2f'],
  },
  orange: {
    name: 'Orange',
    primary: '#d83b01',
    gradientStart: '#d83b01',
    gradientEnd: '#a82e00',
    nativeGradient: ['#d83b01', '#a82e00'],
  },
  red: {
    name: 'Red',
    primary: '#e81123',
    gradientStart: '#e81123',
    gradientEnd: '#a80000',
    nativeGradient: ['#e81123', '#a80000'],
  },
  dark: {
    name: 'Dark',
    primary: '#2b2b2b',
    gradientStart: '#2b2b2b',
    gradientEnd: '#1a1a1a',
    nativeGradient: ['#2b2b2b', '#1a1a1a'],
  }
};

export const SMART_VIEWS = [
  { id: 'all-tasks', label: 'Tasks', icon: 'check-square', color: 'blue' },
  { id: 'important', label: 'Important', icon: 'star', color: 'purple' },
  { id: 'assigned-to-me', label: 'Assigned to me', icon: 'user', color: 'orange' }
] as const;
