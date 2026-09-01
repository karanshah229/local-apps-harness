import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckSquare,
  Star,
  User as UserIcon,
  ListTodo,
  Users
} from 'lucide-react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { User, List } from '@shared/todo';
import { lightColors, darkColors } from '../theme/colors';
import { fontSizes } from '../theme/typography';

interface MobileBottomNavProps {
  activeView: string | null;
  setActiveView: (view: string | null) => void;
  activeListId: number | null;
  setActiveListId: (id: number | null) => void;
  taskCounts: Record<string, number>;
  onOpenListsSheet: () => void;
  onOpenUserLibrary: () => void;
  activeUser: User | null;
  lists: List[];
  isDarkMode: boolean;
}

export default function MobileBottomNav({
  activeView,
  setActiveView,
  activeListId,
  setActiveListId,
  taskCounts,
  onOpenListsSheet,
  onOpenUserLibrary,
  activeUser,
  lists,
  isDarkMode
}: MobileBottomNavProps) {
  const colors = isDarkMode ? darkColors : lightColors;
  const insets = useSafeAreaInsets();

  const isAllTasksActive = activeView === 'all-tasks' && !activeListId;
  const isImportantActive = activeView === 'important' && !activeListId;
  const isAssignedActive = activeView === 'assigned-to-me' && !activeListId;
  const isCustomListActive = Boolean(activeListId);
  const isContactsActive = activeView === 'contacts' && !activeListId;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 10)
        }
      ]}
    >
      <View style={styles.navRow}>
        {/* Tab 1: Tasks */}
        <TouchableOpacity
          onPress={() => {
            setActiveListId(null);
            setActiveView('all-tasks');
          }}
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            {isAllTasksActive ? (
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Rect x="2.5" y="2.5" width="19" height="19" rx="4.5" fill="#0078d4" />
                <Path
                  d="M7.5 12.5L10.5 15.5L16.5 8.5"
                  stroke="#ffffff"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : (
              <CheckSquare
                size={20}
                color={colors.textMuted}
              />
            )}
            {Boolean(taskCounts['all-tasks'] && taskCounts['all-tasks'] > 0) && (
              <View style={[styles.badge, { backgroundColor: '#f59e0b' }]}>
                <Text style={styles.badgeText}>{taskCounts['all-tasks']}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.navLabel,
              { color: isAllTasksActive ? '#0078d4' : colors.textMuted },
              isAllTasksActive && styles.navLabelActive
            ]}
          >
            Tasks
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Important */}
        <TouchableOpacity
          onPress={() => {
            setActiveListId(null);
            setActiveView('important');
          }}
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Star
              size={20}
              color={isImportantActive ? '#742774' : colors.textMuted}
              fill={isImportantActive ? '#742774' : 'none'}
            />
            {Boolean(taskCounts['important'] && taskCounts['important'] > 0) && (
              <View style={[styles.badge, { backgroundColor: '#742774' }]}>
                <Text style={styles.badgeText}>{taskCounts['important']}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.navLabel,
              { color: isImportantActive ? '#742774' : colors.textMuted },
              isImportantActive && styles.navLabelActive
            ]}
          >
            Important
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Assigned */}
        <TouchableOpacity
          onPress={() => {
            setActiveListId(null);
            setActiveView('assigned-to-me');
          }}
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <UserIcon
              size={20}
              color={isAssignedActive ? '#d83b01' : colors.textMuted}
              strokeWidth={isAssignedActive ? 2.5 : 2}
            />
            {Boolean(taskCounts['assigned-to-me'] && taskCounts['assigned-to-me'] > 0) && (
              <View style={[styles.badge, { backgroundColor: '#d83b01' }]}>
                <Text style={styles.badgeText}>
                  {taskCounts['assigned-to-me']}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.navLabel,
              { color: isAssignedActive ? '#d83b01' : colors.textMuted },
              isAssignedActive && styles.navLabelActive
            ]}
          >
            Assigned
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Lists Page Trigger */}
        <TouchableOpacity
          onPress={() => {
            setActiveListId(null);
            setActiveView('lists');
          }}
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <ListTodo
              size={20}
              color={(activeView === 'lists' || isCustomListActive) ? '#0078d4' : colors.textMuted}
              strokeWidth={(activeView === 'lists' || isCustomListActive) ? 2.5 : 2}
            />
            {Boolean(lists.length > 0) && (
              <View style={[styles.badge, { backgroundColor: '#64748b' }]}>
                <Text style={styles.badgeText}>{lists.length}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.navLabel,
              { color: (activeView === 'lists' || isCustomListActive) ? '#0078d4' : colors.textMuted },
              (activeView === 'lists' || isCustomListActive) && styles.navLabelActive
            ]}
          >
            Lists
          </Text>
        </TouchableOpacity>

        {/* Tab 5: Contacts Page */}
        <TouchableOpacity
          onPress={() => {
            setActiveListId(null);
            setActiveView('contacts');
          }}
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Users
              size={20}
              color={isContactsActive ? '#10b981' : colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              { color: isContactsActive ? '#10b981' : colors.textMuted },
              isContactsActive && styles.navLabelActive
            ]}
            numberOfLines={1}
          >
            Contacts
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 12
  },
  navRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#0078d4',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  badgeText: {
    color: '#ffffff',
    fontSize: fontSizes.caption,
    fontWeight: '900'
  },
  navLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    marginTop: 2
  },
  navLabelActive: {
    fontWeight: '800'
  },
  userAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#0078d4'
  }
});
