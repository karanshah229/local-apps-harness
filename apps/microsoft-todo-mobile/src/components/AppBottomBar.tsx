import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckSquare, Star, UserCheck, ListTodo, Settings } from 'lucide-react-native';
import { useUiStore } from '../store/useUiStore';
import { useTaskCountsQuery, useListsQuery } from '../hooks/useTodoQueries';
import { localTodoDb } from '../db/sqlite';
import { getThemePrimary } from '@shared/todo';

export interface AppBottomBarProps {
  // Provided when used as custom tabBar in Tabs
  state?: any;
  descriptors?: any;
  navigation?: any;
  // Provided when used as standalone component (e.g. in list/[id].tsx)
  activeTab?: 'index' | 'important' | 'assigned' | 'lists' | 'settings';
}

interface TabConfig {
  key: string;
  name: 'index' | 'important' | 'assigned' | 'lists' | 'settings';
  label: string;
  routePath: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  badgeKey?: 'all-tasks' | 'important' | 'assigned-to-me';
  badgeColor?: string;
}

const TABS: TabConfig[] = [
  {
    key: 'tasks',
    name: 'index',
    label: 'Tasks',
    routePath: '/(tabs)',
    icon: CheckSquare,
    badgeKey: 'all-tasks',
    badgeColor: '#0078d4',
  },
  {
    key: 'important',
    name: 'important',
    label: 'Important',
    routePath: '/(tabs)/important',
    icon: Star,
    badgeKey: 'important',
    badgeColor: '#f59e0b',
  },
  {
    key: 'assigned',
    name: 'assigned',
    label: 'Assigned to me',
    routePath: '/(tabs)/assigned',
    icon: UserCheck,
    badgeKey: 'assigned-to-me',
    badgeColor: '#0284c7',
  },
  {
    key: 'lists',
    name: 'lists',
    label: 'Lists',
    routePath: '/(tabs)/lists',
    icon: ListTodo,
  },
  {
    key: 'settings',
    name: 'settings',
    label: 'Settings',
    routePath: '/(tabs)/settings',
    icon: Settings,
  },
];

export function AppBottomBar(props: AppBottomBarProps) {
  const { isDarkMode, activeListId, setActiveListId } = useUiStore();
  const { data: taskCounts = {} } = useTaskCountsQuery();
  const { data: lists = [] } = useListsQuery();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const activeList = React.useMemo(() => {
    if (!activeListId) return null;
    return lists.find((l) => l.id === activeListId) || null;
  }, [lists, activeListId]);

  const listThemeColor = React.useMemo(() => {
    if (!activeList) return null;
    return getThemePrimary(activeList.color_theme, isDarkMode);
  }, [activeList, isDarkMode]);

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 20);

  // Determine current active tab name
  let currentTabName = props.state
    ? props.state.routes[props.state.index]?.name
    : props.activeTab || 'lists';

  if (currentTabName === 'list/[id]' || currentTabName?.startsWith('list/')) {
    currentTabName = 'lists';
  }

  const handleTabPress = (tab: TabConfig) => {
    if (tab.name === 'lists') {
      if (activeListId) {
        setActiveListId(null);
      }
    }

    const viewId = tab.name === 'index' ? 'all-tasks' : (tab.name === 'assigned' ? 'assigned-to-me' : tab.name);
    localTodoDb.updateUserPreferences({
      last_view_type: 'tab',
      last_view_id: viewId,
    });

    if (props.navigation && props.state) {
      const isFocused = currentTabName === tab.name;
      const event = props.navigation.emit({
        type: 'tabPress',
        target: tab.name,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        props.navigation.navigate(tab.name);
      }
    } else {
      router.replace(tab.routePath as any);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 52 + bottomInset,
        paddingBottom: bottomInset,
        paddingTop: 8,
        backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#27272a' : '#e2e8f0',
      }}
    >
      {TABS.map((tab) => {
        const isFocused = currentTabName === tab.name;
        const Icon = tab.icon;
        const badgeCount = tab.badgeKey ? taskCounts[tab.badgeKey] || 0 : 0;
        
        let activeColor = getThemePrimary('blue', isDarkMode);
        if (tab.name === 'important') {
          activeColor = getThemePrimary('orange', isDarkMode);
        } else if (tab.name === 'assigned') {
          activeColor = getThemePrimary('purple', isDarkMode);
        } else if (tab.name === 'lists' && listThemeColor) {
          activeColor = listThemeColor;
        }

        let tabBadgeColor = isDarkMode ? '#38bdf8' : '#0078d4';
        if (tab.name === 'important') {
          tabBadgeColor = getThemePrimary('orange', isDarkMode);
        } else if (tab.name === 'assigned') {
          tabBadgeColor = getThemePrimary('purple', isDarkMode);
        }

        const inactiveColor = isDarkMode ? '#a1a1aa' : '#64748b';
        const color = isFocused ? activeColor : inactiveColor;

        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ position: 'relative', width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={color} />
              {badgeCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -10,
                    backgroundColor: tabBadgeColor,
                    borderRadius: 8,
                    paddingHorizontal: 4,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '800' }}>
                    {badgeCount}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={{
                fontSize: 10,
                fontWeight: isFocused ? '800' : '700',
                color: color,
                marginTop: 3,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default AppBottomBar;
