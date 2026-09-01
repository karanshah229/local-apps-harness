import { Platform } from 'react-native';

/** Shared mobile type scale and typography aligned with the web design system. */
export const fontFamily = Platform.select({
  ios: 'Open Sans',
  android: 'Open Sans',
  web: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  default: 'Open Sans, sans-serif'
});

export const fontSizes = {
  caption: 12,
  small: 14,
  medium: 15,
  body: 16,
  heading: 18,
  title: 20,
  display: 24
} as const;

export const lineHeights = {
  caption: 16,
  small: 20,
  medium: 22,
  body: 24,
  heading: 26,
  title: 28,
  display: 32
} as const;
