import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import {
  ArrowLeft,
  Moon,
  Sun,
  Palette,
  CheckCircle2,
  Info,
  Smartphone,
  BookmarkCheck,
  Share2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import appConfig from '../../app.json';
import { useUserPreferencesQuery, useUpdateUserPreferencesMutation } from '../hooks/useTodoQueries';
import { lightColors, darkColors } from '../theme/colors';
import { fontSizes } from '../theme/typography';
import { shareDiagnosticReport } from '../services/clientLogger';

interface SettingsPageProps {
  onBack: () => void;
  isDarkMode: boolean;
  themeMode: 'light' | 'dark' | 'system';
  onSetThemeMode: (mode: 'light' | 'dark' | 'system') => void;
}

export default function SettingsPage({
  onBack,
  isDarkMode,
  themeMode,
  onSetThemeMode
}: SettingsPageProps) {
  const insets = useSafeAreaInsets();
  const colors = isDarkMode ? darkColors : lightColors;

  const THEME_OPTIONS: Array<{
    id: 'light' | 'dark' | 'system';
    title: string;
    description: string;
    icon: any;
    iconBg: string;
    iconColor: string;
  }> = [
    {
      id: 'light',
      title: 'Light',
      description: 'Crisp & bright',
      icon: Sun,
      iconBg: isDarkMode ? '#332912' : '#fef3c7',
      iconColor: '#d97706'
    },
    {
      id: 'dark',
      title: 'Dark',
      description: 'Easy on eyes',
      icon: Moon,
      iconBg: isDarkMode ? '#1e293b' : '#e0f2fe',
      iconColor: '#0284c7'
    },
    {
      id: 'system',
      title: 'System',
      description: 'Follows OS',
      icon: Smartphone,
      iconBg: isDarkMode ? '#27272a' : '#f1f5f9',
      iconColor: isDarkMode ? '#a1a1aa' : '#64748b'
    }
  ];

  const { data: prefs } = useUserPreferencesQuery(1);
  const updatePrefs = useUpdateUserPreferencesMutation();

  const handleToggleRememberLastView = (enabled: boolean) => {
    updatePrefs.mutate({ remember_last_view: enabled ? 1 : 0 });
  };

  const handleShareDiagnostics = async () => {
    try {
      await shareDiagnosticReport();
    } catch {
      // The native share sheet can be dismissed or unavailable; no product state changes.
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 14) + 6 }
      ]}
    >
      {/* Header Banner */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: colors.border }]}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Preferences & Appearance
          </Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance & Theme Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={16} color="#0078d4" />
            <Text style={styles.sectionTitle}>APPEARANCE & THEME</Text>
          </View>

          {/* 3-Button Theme Layout */}
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((opt) => {
              const IconComp = opt.icon;
              const isSelected = themeMode === opt.id;

              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => onSetThemeMode(opt.id)}
                  style={[
                    styles.themeTile,
                    {
                      backgroundColor: isSelected
                        ? isDarkMode
                          ? 'rgba(0, 120, 212, 0.18)'
                          : 'rgba(0, 120, 212, 0.08)'
                        : isDarkMode
                        ? '#18181b'
                        : '#ffffff',
                      borderColor: isSelected ? '#0078d4' : colors.border
                    },
                    isSelected && styles.themeTileActive
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.themeTileIcon, { backgroundColor: opt.iconBg }]}>
                    <IconComp size={20} color={opt.iconColor} />
                  </View>

                  <Text
                    style={[
                      styles.themeTileTitle,
                      { color: isSelected ? '#0078d4' : colors.text }
                    ]}
                  >
                    {opt.title}
                  </Text>

                  <Text
                    style={[
                      styles.themeTileSubtitle,
                      { color: colors.textMuted }
                    ]}
                  >
                    {opt.description}
                  </Text>

                  {isSelected ? (
                    <View style={styles.activePill}>
                      <CheckCircle2 size={12} color="#0078d4" />
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  ) : (
                    <View style={styles.inactivePlaceholder} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Startup Preference Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BookmarkCheck size={16} color="#0078d4" />
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Remember Last View
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  Open the last active list or tab when starting the app
                </Text>
              </View>
              <Switch
                value={Boolean(prefs?.remember_last_view)}
                onValueChange={handleToggleRememberLastView}
                trackColor={{ false: isDarkMode ? '#3f3f46' : '#cbd5e1', true: '#0078d4' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Support Diagnostics Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Share2 size={16} color="#0078d4" />
            <Text style={styles.sectionTitle}>SUPPORT</Text>
          </View>
          <TouchableOpacity
            onPress={handleShareDiagnostics}
            style={[styles.card, styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Share diagnostic report</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Share recent app logs to help investigate an issue</Text>
            </View>
            <Share2 size={20} color="#0078d4" />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={16} color="#64748b" />
            <Text style={styles.sectionTitle}>ABOUT</Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Application</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{appConfig.expo?.name ?? Constants.expoConfig?.name ?? 'Kamdhenu Handoff'}</Text>
            </View>
            <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Version</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{appConfig.expo?.version ?? Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0'}</Text>
            </View>
            <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Platform</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>React Native (Expo)</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  headerTextWrap: {
    flex: 1
  },
  headerTitle: {
    fontSize: fontSizes.title,
    fontWeight: '800'
  },
  headerSubtitle: {
    fontSize: fontSizes.caption,
    marginTop: 1
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    gap: 20
  },
  section: {
    gap: 10
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4
  },
  sectionTitle: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8
  },
  settingIconWrap: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  settingTitle: {
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  settingSubtitle: {
    fontSize: fontSizes.caption,
    marginTop: 2
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2
  },
  themeTile: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'flex-start'
  },
  themeTileActive: {
    borderWidth: 2,
    borderColor: '#0078d4'
  },
  themeTileIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  themeTileTitle: {
    fontSize: fontSizes.body,
    fontWeight: '800',
    marginBottom: 2
  },
  themeTileSubtitle: {
    fontSize: fontSizes.caption,
    fontWeight: '500',
    marginBottom: 6
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  activePillText: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: '#0078d4'
  },
  inactivePlaceholder: {
    height: 18,
    marginTop: 4
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'transparent'
  },
  infoLabel: {
    fontSize: fontSizes.small,
    fontWeight: '600'
  },
  infoValue: {
    fontSize: fontSizes.small,
    fontWeight: '700',
    maxWidth: 200
  }
});
