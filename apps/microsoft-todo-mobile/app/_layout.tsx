import { useEffect, useRef, useState } from 'react';
import { View, useColorScheme, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import {
  queryClient,
  useMobileSocketSync,
  useBatchImportUsersMutation,
  useUserPreferencesQuery,
} from '../src/hooks/useTodoQueries';
import { useUiStore } from '../src/store/useUiStore';
import { autoSyncDeviceContacts } from '../src/services/nativeContacts';
import '../global.css';

// Keep the splash screen visible while loading initial route
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  useMobileSocketSync();
  const router = useRouter();

  const { isDarkMode, themeMode, setIsDarkMode } = useUiStore();
  const batchImportMutation = useBatchImportUsersMutation();
  const systemColorScheme = useColorScheme();

  const [isReady, setIsReady] = useState(false);
  const { data: preferences, isSuccess: isPrefsLoaded, isError: isPrefsError } = useUserPreferencesQuery(1);
  const hasRestoredView = useRef(false);

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
    // Auto sync contacts on first open of the day in background
    autoSyncDeviceContacts(async (contacts) => {
      try {
        await batchImportMutation.mutateAsync(contacts);
      } catch (err) {
        console.warn('Auto contact sync failed:', err);
      }
    });
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
    } else if (isPrefsError) {
      hasRestoredView.current = true;
      setIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isPrefsLoaded, isPrefsError, preferences, router]);

  // Safety fallback: ensure screen is unveiled within 1s even if preferences network query hangs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasRestoredView.current) {
        hasRestoredView.current = true;
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 1000);
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
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
