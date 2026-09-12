import Constants from 'expo-constants';
import appConfig from '../../app.json';

export const IS_QA_BUILD = process.env.EXPO_PUBLIC_QA_MODE === '1';

const baseVersion =
  appConfig.expo?.version ??
  Constants.expoConfig?.version ??
  Constants.nativeAppVersion ??
  'unknown';

export const BUILD_IDENTITY = Object.freeze({
  appId: IS_QA_BUILD ? 'kamdhenu-handoff-qa' : 'kamdhenu-handoff',
  appName: IS_QA_BUILD ? 'Kamdhenu Handoff QA' : 'Kamdhenu Handoff',
  environment: IS_QA_BUILD ? 'qa' : __DEV__ ? 'development' : 'production',
  release: IS_QA_BUILD ? `${baseVersion}-qa` : baseVersion,
  sentryDist: IS_QA_BUILD
    ? `${String(appConfig.expo?.android?.versionCode ?? '')}-qa`
    : String(appConfig.expo?.android?.versionCode ?? ''),
});

export function assertQaBuild() {
  if (!IS_QA_BUILD) throw new Error('QA diagnostics are unavailable in this build.');
}
