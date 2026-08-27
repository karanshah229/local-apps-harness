import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckSquare,
  Square,
  Share2,
  Send,
  Palette,
  Sun,
  Moon
} from 'lucide-react-native';
import { List, THEME_COLORS, ThemeColor } from '@saileshbhai/todo-shared';
import { getThemeGradientColors } from '../theme/colors';

interface HeaderBannerProps {
  activeView: string | null;
  activeList?: List | null;
  isMultiSelectMode: boolean;
  onToggleMultiSelect: () => void;
  onOpenShareModal: (list: List) => void;
  onOpenWhatsAppModal: (config: any) => void;
  onUpdateListTheme: (listId: number, color: ThemeColor) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function HeaderBanner({
  activeView,
  activeList,
  isMultiSelectMode,
  onToggleMultiSelect,
  onOpenShareModal,
  onOpenWhatsAppModal,
  onUpdateListTheme,
  isDarkMode,
  onToggleDarkMode
}: HeaderBannerProps) {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const insets = useSafeAreaInsets();

  const getHeaderTitle = () => {
    if (activeList) return activeList.title;
    switch (activeView) {
      case 'important':
        return 'Important';
      case 'assigned-to-me':
        return 'Assigned to me';
      case 'all-tasks':
      default:
        return 'Tasks';
    }
  };

  const getThemeKey = (): string => {
    if (activeList) return activeList.color_theme || 'blue';
    if (activeView === 'important') return 'purple';
    if (activeView === 'assigned-to-me') return 'orange';
    return 'blue';
  };

  const gradientColors = getThemeGradientColors(getThemeKey());

  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <LinearGradient
      colors={gradientColors}
      style={[
        styles.bannerContainer,
        { paddingTop: Math.max(insets.top, 14) + 6 }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {getHeaderTitle()}
            </Text>
            {activeList && activeList.members && activeList.members.length > 0 && (
              <View style={styles.memberAvatarStack}>
                {activeList.members.slice(0, 3).map((m, idx) => (
                  <Image
                    key={m.id || idx}
                    source={{
                      uri:
                        m.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(m.name)}`
                    }}
                    style={[styles.memberAvatar, { marginLeft: idx > 0 ? -10 : 0 }]}
                  />
                ))}
              </View>
            )}
          </View>
          <Text style={styles.dateText}>{formattedToday}</Text>
        </View>

        <View style={styles.actionRow}>
          {/* Multi-Select Toggle */}
          <TouchableOpacity
            onPress={onToggleMultiSelect}
            style={[
              styles.iconButton,
              isMultiSelectMode && styles.iconButtonActive
            ]}
            activeOpacity={0.7}
          >
            {isMultiSelectMode ? (
              <CheckSquare size={18} color="#005a9e" />
            ) : (
              <Square size={18} color="#ffffff" />
            )}
          </TouchableOpacity>

          {/* Custom List Actions */}
          {activeList && (
            <>
              <TouchableOpacity
                onPress={() => onOpenShareModal(activeList)}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <Share2 size={18} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  onOpenWhatsAppModal({ type: 'list', listId: activeList.id })
                }
                style={[styles.iconButton, styles.whatsappButton]}
                activeOpacity={0.7}
              >
                <Send size={18} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowThemePicker(true)}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <Palette size={18} color="#ffffff" />
              </TouchableOpacity>
            </>
          )}

          {/* Dark / Light Toggle */}
          <TouchableOpacity
            onPress={onToggleDarkMode}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            {isDarkMode ? (
              <Sun size={18} color="#fde047" />
            ) : (
              <Moon size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Theme Picker Modal */}
      <Modal
        visible={showThemePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowThemePicker(false)}
        >
          <View style={[styles.themePickerCard, isDarkMode && styles.themePickerCardDark]}>
            <Text style={[styles.themePickerTitle, isDarkMode && styles.textLight]}>
              Select List Theme
            </Text>
            <View style={styles.themeColorsGrid}>
              {THEME_COLORS.map((c) => {
                const paletteColors = getThemeGradientColors(c);
                const isSelected = activeList?.color_theme === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      if (activeList) onUpdateListTheme(activeList.id, c);
                      setShowThemePicker(false);
                    }}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: paletteColors[0] },
                      isSelected && styles.colorCircleSelected
                    ]}
                    activeOpacity={0.8}
                  />
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  leftColumn: {
    flex: 1
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  titleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5
  },
  memberAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#cbd5e1'
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginTop: 2
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButtonActive: {
    backgroundColor: '#ffffff'
  },
  whatsappButton: {
    backgroundColor: 'rgba(37, 211, 102, 0.85)'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  themePickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8
  },
  themePickerCardDark: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1
  },
  themePickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center'
  },
  textLight: {
    color: '#f4f4f5'
  },
  themeColorsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4
  }
});
