import { useEffect, useRef, useState } from 'react';
import { View, useColorScheme } from 'react-native';
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
  const { data: preferences, isSuccess: isPrefsLoaded } = useUserPreferencesQuery(1);
  const hasRestoredView = useRef(false);

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDarkMode(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode, setIsDarkMode]);

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
    if (hasRestoredView.current || !isPrefsLoaded) return;
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
  }, [isPrefsLoaded, preferences, router]);

  const bgColor = isDarkMode ? '#09090b' : '#f8fafc';

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: bgColor }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: {
            backgroundColor: bgColor,
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: bgColor },
          }}
        />
        <Stack.Screen
          name="contacts/index"
          options={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: bgColor },
          }}
        />
        <Stack.Screen
          name="task/[id]"
          options={{
            presentation: 'card',
            animation: 'none',
            headerShown: false,
            contentStyle: { backgroundColor: bgColor },
          }}
        />
      </Stack>
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
