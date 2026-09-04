import { useEffect, useRef, useState } from 'react';
import { View, useColorScheme, Platform, AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useBatchImportUsersMutation,
  useUserPreferencesQuery,
} from '../src/hooks/useTodoQueries';
import { getDatabase } from '../src/db/sqlite';
import { useUiStore } from '../src/store/useUiStore';
import { autoSyncDeviceContacts } from '../src/services/nativeContacts';
import { ThemedConfirmModal } from '../src/components/ThemedConfirmModal';
import { initializeObservability } from '../src/services/sentry';
import { logClientEvent, logError } from '../src/services/clientLogger';
import '../global.css';

initializeObservability();

// Keep the splash screen visible while loading initial route
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const router = useRouter();

  const { isDarkMode, themeMode, setIsDarkMode } = useUiStore();
  const batchImportMutation = useBatchImportUsersMutation();
  const systemColorScheme = useColorScheme();

  const [isReady, setIsReady] = useState(false);
  const { data: preferences, isSuccess: isPrefsLoaded } = useUserPreferencesQuery(1);
  const hasRestoredView = useRef(false);

  // Initialize SQLite database synchronously on startup
  useEffect(() => {
    try {
      getDatabase();
      logClientEvent({ event: 'sqlite_initialized', outcome: 'success' });
    } catch (e) {
      logError({ event: 'sqlite_initialize_failed', outcome: 'failure' }, e);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      logClientEvent({ event: `app_state_${state}`, outcome: 'success', level: 'debug' });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDarkMode(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode, setIsDarkMode]);

  const outerBgColor = isDarkMode ? '#000000' : '#ffffff';
  const appBgColor = isDarkMode ? '#09090b' : '#f8fafc';

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = outerBgColor;
    }
  }, [outerBgColor]);

  useEffect(() => {
    // Every time the app opens, start a delayed background task (2s) to check and import contact updates
    const syncTimer = setTimeout(() => {
      autoSyncDeviceContacts(async (contacts) => {
        try {
          await batchImportMutation.mutateAsync(contacts);
        } catch (err) {
          logError({ event: 'contact_auto_sync_failed', outcome: 'failure' }, err);
        }
      });
    }, 2000);

    return () => clearTimeout(syncTimer);
  }, []);

  // Directly navigate to last saved view before revealing the app
  useEffect(() => {
    if (hasRestoredView.current) return;

    if (isPrefsLoaded) {
      hasRestoredView.current = true;

      if (preferences?.sort_preferences) {
        try {
          const parsed = typeof preferences.sort_preferences === 'string'
            ? JSON.parse(preferences.sort_preferences || '{}')
            : preferences.sort_preferences;
          useUiStore.getState().setAllSortPreferences(parsed || {});
        } catch (_e) {
          // ignore parse error
        }
      }

      if (preferences?.has_chosen_whatsapp_format !== undefined) {
        useUiStore.getState().setHasChosenWhatsAppFormat(Boolean(preferences.has_chosen_whatsapp_format));
      }
      if (preferences?.default_whatsapp_style) {
        useUiStore.getState().setDefaultWhatsAppStyle(preferences.default_whatsapp_style as any);
      }
      if (preferences?.default_whatsapp_include_notes !== undefined) {
        useUiStore.getState().setDefaultWhatsAppIncludeNotes(preferences.default_whatsapp_include_notes !== 0 && preferences.default_whatsapp_include_notes !== false);
      }
      if (preferences?.default_whatsapp_include_assignee !== undefined) {
        useUiStore.getState().setDefaultWhatsAppIncludeAssignee(preferences.default_whatsapp_include_assignee !== 0 && preferences.default_whatsapp_include_assignee !== false);
      }
      if (preferences?.default_whatsapp_include_important !== undefined) {
        useUiStore.getState().setDefaultWhatsAppIncludeImportant(preferences.default_whatsapp_include_important !== 0 && preferences.default_whatsapp_include_important !== false);
      }
      if (preferences?.default_whatsapp_include_steps !== undefined) {
        useUiStore.getState().setDefaultWhatsAppIncludeSteps(preferences.default_whatsapp_include_steps !== 0 && preferences.default_whatsapp_include_steps !== false);
      }
      if (preferences?.default_whatsapp_include_due_date !== undefined) {
        useUiStore.getState().setDefaultWhatsAppIncludeDueDate(preferences.default_whatsapp_include_due_date !== 0 && preferences.default_whatsapp_include_due_date !== false);
      }
      if (preferences?.default_whatsapp_include_list_name !== undefined) {
        useUiStore.getState().setDefaultWhatsAppIncludeListName(preferences.default_whatsapp_include_list_name !== 0 && preferences.default_whatsapp_include_list_name !== false);
      }

      if (preferences?.remember_last_view) {
        const type = preferences.last_view_type;
        const id = preferences.last_view_id;

        if (type === 'list' && id) {
          useUiStore.getState().setActiveListId(Number(id));
          router.replace('/(tabs)/lists');
        } else if (type === 'tab') {
          if (id === 'important') {
            router.replace('/(tabs)/important');
          } else if (id === 'assigned-to-me') {
            router.replace('/(tabs)/assigned');
          } else if (id === 'lists') {
            router.replace('/(tabs)/lists');
          } else if (id === 'settings') {
            router.replace('/(tabs)/settings');
          } else if (id === 'all-tasks') {
            router.replace('/(tabs)');
          }
        }
      }

      // Unveil the app cleanly directly on the target screen
      setIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isPrefsLoaded, preferences, router]);

  // Safety fallback: ensure screen is unveiled within 800ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasRestoredView.current) {
        hasRestoredView.current = true;
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: outerBgColor,
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: Platform.OS === 'web' ? 480 : undefined,
            backgroundColor: appBgColor,
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: outerBgColor,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: Platform.OS === 'web' ? 480 : undefined,
          backgroundColor: appBgColor,
          overflow: 'hidden',
          ...(Platform.OS === 'web'
            ? {
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                boxShadow: isDarkMode
                  ? '0px 4px 24px rgba(0, 0, 0, 0.45)'
                  : '0px 4px 24px rgba(0, 0, 0, 0.08)',
              }
            : {}),
        }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: {
              backgroundColor: appBgColor,
            },
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              animation: 'none',
              contentStyle: { backgroundColor: appBgColor },
            }}
          />
          <Stack.Screen
            name="contacts/index"
            options={{
              headerShown: false,
              animation: 'none',
              contentStyle: { backgroundColor: appBgColor },
            }}
          />
          <Stack.Screen
            name="task/[id]"
            options={{
              presentation: 'card',
              animation: 'none',
              headerShown: false,
              contentStyle: { backgroundColor: appBgColor },
            }}
          />
        </Stack>
        <ThemedConfirmModal />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutNav />
    </SafeAreaProvider>
  );
}
