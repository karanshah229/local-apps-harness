import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the backend server API URL dynamically.
 * When running in Expo Go on a physical device, this extracts the computer's LAN IP from Metro's hostUri.
 */
export function getBackendApiUrl(): string {
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
