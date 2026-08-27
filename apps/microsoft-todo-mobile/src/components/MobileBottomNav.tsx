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
import { User, List } from '@saileshbhai/todo-shared';
import { lightColors, darkColors } from '../theme/colors';

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
            <CheckSquare
              size={20}
              color={isAllTasksActive ? '#0078d4' : colors.textMuted}
            />
            {Boolean(taskCounts['all-tasks'] && taskCounts['all-tasks'] > 0) && (
              <View style={styles.badge}>
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
              fill={isImportantActive ? '#742774' : 'transparent'}
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

        {/* Tab 4: Lists Bottom Sheet Trigger */}
        <TouchableOpacity
          onPress={onOpenListsSheet}
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <ListTodo
              size={20}
              color={isCustomListActive ? '#0078d4' : colors.textMuted}
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
              { color: isCustomListActive ? '#0078d4' : colors.textMuted },
              isCustomListActive && styles.navLabelActive
            ]}
          >
            Lists
          </Text>
        </TouchableOpacity>

        {/* Tab 5: Contacts & User Profile */}
        <TouchableOpacity
          onPress={onOpenUserLibrary}
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            {activeUser ? (
              <Image
                source={{
                  uri:
                    activeUser.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(activeUser.name)}`
                }}
                style={styles.userAvatar}
              />
            ) : (
              <Users size={20} color={colors.textMuted} />
            )}
          </View>
          <Text
            style={[styles.navLabel, { color: colors.textMuted }]}
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
    fontSize: 9,
    fontWeight: '900'
  },
  navLabel: {
    fontSize: 10,
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
