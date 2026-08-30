import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the backend server API URL dynamically.
 * When running in Expo Go on a physical device, this extracts the computer's LAN IP from Metro's hostUri.
 */
export function getBackendApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Web in browser
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    if (window.location.port === '5005' || window.location.pathname.startsWith('/todo')) {
      return '';
    }
    const host = window.location.hostname || '127.0.0.1';
    return `http://${host}:5005`;
  }

  // Check Expo Constants for host machine IP
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:5005`;
    }
  }

  // Simulator / Emulator Fallbacks
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5005';
  }

  return 'http://127.0.0.1:5005';
}
