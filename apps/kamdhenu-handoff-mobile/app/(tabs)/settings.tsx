import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  useColorScheme,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Sun,
  Moon,
  Smartphone,
  Users,
  ChevronRight,
  BookmarkCheck,
} from 'lucide-react-native';
import { useUiStore } from '../../src/store/useUiStore';
import Constants from 'expo-constants';
import {
  useUsersQuery,
  useUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
} from '../../src/hooks/useTodoQueries';

export default function SettingsScreen() {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
  const appName = Constants.expoConfig?.name ?? 'Kamdhenu Handoff';
  const { themeMode, setThemeMode, isDarkMode, setIsDarkMode } = useUiStore();
  const systemColorScheme = useColorScheme();
  const { data: users = [] } = useUsersQuery();
  const { data: prefs } = useUserPreferencesQuery(1);
  const updatePrefs = useUpdateUserPreferencesMutation();


  const THEME_OPTIONS = [
    { id: 'light' as const, label: 'Light', icon: Sun },
    { id: 'dark' as const, label: 'Dark', icon: Moon },
    { id: 'system' as const, label: 'System', icon: Smartphone },
  ];

  const handleThemeChange = (mode: 'system' | 'light' | 'dark') => {
    setThemeMode(mode);
    if (mode === 'system') {
      setIsDarkMode(systemColorScheme === 'dark');
    } else {
      setIsDarkMode(mode === 'dark');
    }
  };

  const handleToggleRememberLastView = (enabled: boolean) => {
    updatePrefs.mutate({ remember_last_view: enabled ? 1 : 0 });
  };

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#09090b' : '#f8fafc', paddingTop: topInset }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
          Settings
        </Text>
        <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
          Appearance and application preferences
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
          Appearance
        </Text>

        <View
          style={{
            padding: 16,
            borderRadius: 20,
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            borderWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                Theme Mode
              </Text>
              <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                {themeMode === 'system'
                  ? `System default (${systemColorScheme === 'dark' ? 'Dark' : 'Light'})`
                  : themeMode === 'dark'
                  ? 'Dark theme'
                  : 'Light theme'}
              </Text>
            </View>
          </View>

          {/* 3-Button Segmented Toggle */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: isDarkMode ? '#27272a' : '#4b5563',
              borderRadius: 12,
              padding: 4,
              marginTop: 14,
            }}
          >
            {THEME_OPTIONS.map((opt) => {
              const isSelected = themeMode === opt.id;
              const Icon = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => handleThemeChange(opt.id)}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 9,
                    backgroundColor: isSelected
                      ? (isDarkMode ? '#3f3f46' : '#1f2937')
                      : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isSelected ? 0.2 : 0,
                    shadowRadius: 2,
                    elevation: isSelected ? 2 : 0,
                  }}
                >
                  <Icon
                    size={15}
                    color={
                      isSelected
                        ? '#ffffff'
                        : (isDarkMode ? '#a1a1aa' : '#d1d5db')
                    }
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? '700' : '600',
                      color: isSelected
                        ? '#ffffff'
                        : (isDarkMode ? '#a1a1aa' : '#d1d5db'),
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Contacts Trigger Card */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
          Contacts
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/contacts')}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderRadius: 20,
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            borderWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,120,212,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#0078d4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                Contacts
              </Text>
              <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }} numberOfLines={1}>
                {users.length} contacts
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0078d4' }}>
                {users.length}
              </Text>
            </View>
            <ChevronRight size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} />
          </View>
        </TouchableOpacity>

        {/* Startup Preference Section */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
          Preferences
        </Text>

        <View
          style={{
            padding: 16,
            borderRadius: 20,
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            borderWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,120,212,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <BookmarkCheck size={18} color="#0078d4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  Remember Last View
                </Text>
                <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                  Open the last active list or tab when starting the app
                </Text>
              </View>
            </View>

            <Switch
              value={Boolean(prefs?.remember_last_view)}
              onValueChange={handleToggleRememberLastView}
              trackColor={{ false: isDarkMode ? '#3f3f46' : '#cbd5e1', true: '#0078d4' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* About Section */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
          About
        </Text>
        <View
          style={{
            padding: 16,
            borderRadius: 20,
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            borderWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: isDarkMode ? '#a1a1aa' : '#64748b' }}>Application</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>{appName}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: isDarkMode ? '#a1a1aa' : '#64748b' }}>Version</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>{appVersion}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
