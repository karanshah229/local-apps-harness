import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckSquare, Star, UserCheck, ListTodo, Settings, Layers } from 'lucide-react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useUiStore } from '../store/useUiStore';
import {
  useTaskCountsQuery,
  useListsQuery,
  useCustomViewsQuery,
  usePinnedViewsQuery,
} from '../hooks/useTodoQueries';
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

interface DynamicTabItem {
  key: string;
  type: 'tab' | 'custom_view' | 'list';
  targetScreen: string;
  customViewId?: number;
  listId?: number;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; fill?: string; strokeWidth?: number }>;
  badgeCount: number;
  activeColor: string;
  badgeColor: string;
}

function renderTabIcon(tab: DynamicTabItem, isFocused: boolean, color: string, inactiveColor: string) {
  if (tab.key === 'tasks_main') {
    if (isFocused) {
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Rect x="2.5" y="2.5" width="19" height="19" rx="4.5" fill={color} />
          <Path
            d="M7.5 12.5L10.5 15.5L16.5 8.5"
            stroke="#ffffff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    return <CheckSquare size={20} color={inactiveColor} strokeWidth={2} />;
  }

  if (tab.key === 'pinned_important' || tab.targetScreen === 'important') {
    return <Star size={20} color={color} fill={isFocused ? color : 'none'} strokeWidth={2} />;
  }

  if (tab.key === 'pinned_assigned' || tab.targetScreen === 'assigned') {
    return <UserCheck size={20} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
  }

  if (tab.key === 'tab_lists_and_views' || tab.type === 'list') {
    return <ListTodo size={20} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
  }

  if (tab.type === 'custom_view') {
    return <Layers size={20} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
  }

  if (tab.key === 'tab_settings') {
    return <Settings size={20} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
  }

  const Icon = tab.icon;
  return <Icon size={20} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
}

export function AppBottomBar(props: AppBottomBarProps) {
  const { isDarkMode, activeListId, setActiveListId, activeCustomViewId, setActiveCustomViewId } = useUiStore();
  const { data: taskCounts = {} } = useTaskCountsQuery();
  const { data: lists = [] } = useListsQuery();
  const { data: customViews = [] } = useCustomViewsQuery();
  const { data: pinnedViews = ['important', 'assigned-to-me'] } = usePinnedViewsQuery();
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

  // Determine current active screen name
  let currentScreenName = props.state
    ? props.state.routes[props.state.index]?.name
    : props.activeTab || 'lists';

  if (currentScreenName === 'list/[id]' || currentScreenName?.startsWith('list/')) {
    currentScreenName = 'lists';
  }

  // Construct dynamic tab items
  const dynamicTabs = React.useMemo(() => {
    const tabs: DynamicTabItem[] = [];

    // 1. Permanent Main Tasks View (cannot be unpinned)
    tabs.push({
      key: 'tasks_main',
      type: 'tab',
      targetScreen: 'index',
      label: 'Tasks',
      icon: CheckSquare,
      badgeCount: taskCounts['all-tasks'] || 0,
      activeColor: '#0078d4',
      badgeColor: '#f59e0b', // Yellow badge background matching filters
    });

    // 2. Pinned Views in exact order of pinning
    pinnedViews.forEach((viewKey) => {
      if (viewKey === 'important') {
        tabs.push({
          key: 'pinned_important',
          type: 'tab',
          targetScreen: 'important',
          label: 'Important',
          icon: Star,
          badgeCount: taskCounts['important'] || 0,
          activeColor: getThemePrimary('orange', isDarkMode),
          badgeColor: getThemePrimary('orange', isDarkMode),
        });
      } else if (viewKey === 'assigned-to-me' || viewKey === 'assigned') {
        tabs.push({
          key: 'pinned_assigned',
          type: 'tab',
          targetScreen: 'assigned',
          label: 'Assigned to me',
          icon: UserCheck,
          badgeCount: taskCounts['assigned-to-me'] || 0,
          activeColor: getThemePrimary('purple', isDarkMode),
          badgeColor: getThemePrimary('purple', isDarkMode),
        });
      } else if (viewKey.startsWith('custom_view:')) {
        const id = Number(viewKey.split(':')[1]);
        const cv = customViews.find((v) => v.id === id);
        if (cv) {
          const themeHex = getThemePrimary(cv.color_theme, isDarkMode);
          tabs.push({
            key: `pinned_custom_${cv.id}`,
            type: 'custom_view',
            targetScreen: 'lists',
            customViewId: cv.id,
            label: cv.title,
            icon: Layers,
            badgeCount: cv.matched_count || 0,
            activeColor: themeHex,
            badgeColor: themeHex,
          });
        }
      } else if (viewKey.startsWith('list:')) {
        const id = Number(viewKey.split(':')[1]);
        const l = lists.find((item) => item.id === id);
        if (l) {
          const themeHex = getThemePrimary(l.color_theme, isDarkMode);
          tabs.push({
            key: `pinned_list_${l.id}`,
            type: 'list',
            targetScreen: 'lists',
            listId: l.id,
            label: l.title,
            icon: ListTodo,
            badgeCount: taskCounts[`list_${l.id}`] || 0,
            activeColor: themeHex,
            badgeColor: themeHex,
          });
        }
      }
    });

    // 3. Permanent Lists & Views CTA
    tabs.push({
      key: 'tab_lists_and_views',
      type: 'tab',
      targetScreen: 'lists',
      label: 'Lists & Views',
      icon: ListTodo,
      badgeCount: 0,
      activeColor: listThemeColor || '#0078d4',
      badgeColor: '#0078d4',
    });

    // 4. Permanent Settings Tab
    tabs.push({
      key: 'tab_settings',
      type: 'tab',
      targetScreen: 'settings',
      label: 'Settings',
      icon: Settings,
      badgeCount: 0,
      activeColor: isDarkMode ? '#ffffff' : '#0f172a',
      badgeColor: '#71717a',
    });

    return tabs;
  }, [taskCounts, pinnedViews, customViews, lists, isDarkMode, listThemeColor]);

  const handleTabPress = (tab: DynamicTabItem) => {
    if (tab.type === 'custom_view' && tab.customViewId) {
      setActiveListId(null);
      setActiveCustomViewId(tab.customViewId);
      localTodoDb.updateUserPreferences({
        last_view_type: 'custom_view',
        last_view_id: String(tab.customViewId),
      });

      if (props.navigation && props.state) {
        props.navigation.navigate('lists');
      } else {
        router.replace('/(tabs)/lists' as any);
      }
      return;
    }

    if (tab.type === 'list' && tab.listId) {
      setActiveCustomViewId(null);
      setActiveListId(tab.listId);
      localTodoDb.updateUserPreferences({
        last_view_type: 'list',
        last_view_id: String(tab.listId),
      });

      if (props.navigation && props.state) {
        props.navigation.navigate('lists');
      } else {
        router.replace('/(tabs)/lists' as any);
      }
      return;
    }

    // Standard tab
    if (tab.targetScreen === 'lists') {
      setActiveListId(null);
      setActiveCustomViewId(null);
    } else {
      setActiveListId(null);
      setActiveCustomViewId(null);
    }

    const viewId = tab.targetScreen === 'index'
      ? 'all-tasks'
      : (tab.targetScreen === 'assigned' ? 'assigned-to-me' : tab.targetScreen);

    localTodoDb.updateUserPreferences({
      last_view_type: 'tab',
      last_view_id: viewId,
    });

    if (props.navigation && props.state) {
      const isFocused = currentScreenName === tab.targetScreen && !activeCustomViewId && !activeListId;
      const event = props.navigation.emit({
        type: 'tabPress',
        target: tab.targetScreen,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        props.navigation.navigate(tab.targetScreen);
      }
    } else {
      const targetRoute = tab.targetScreen === 'index' ? '/(tabs)' : `/(tabs)/${tab.targetScreen}`;
      router.replace(targetRoute as any);
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
      {dynamicTabs.map((tab) => {
        let isFocused = false;

        if (tab.type === 'custom_view') {
          isFocused = currentScreenName === 'lists' && activeCustomViewId === tab.customViewId;
        } else if (tab.type === 'list') {
          isFocused = currentScreenName === 'lists' && activeListId === tab.listId;
        } else if (tab.targetScreen === 'lists') {
          isFocused = currentScreenName === 'lists' && !activeCustomViewId && (!activeListId || !pinnedViews.includes(`list:${activeListId}`));
        } else {
          isFocused = currentScreenName === tab.targetScreen && !activeCustomViewId && !activeListId;
        }

        const inactiveColor = isDarkMode ? '#a1a1aa' : '#64748b';
        const color = isFocused ? tab.activeColor : inactiveColor;

        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 2,
            }}
          >
            <View style={{ position: 'relative', width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              {renderTabIcon(tab, isFocused, color, inactiveColor)}
              {tab.badgeCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -10,
                    backgroundColor: tab.badgeColor,
                    borderRadius: 9,
                    paddingHorizontal: 4,
                    minWidth: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: isDarkMode ? '#18181b' : '#ffffff',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '800' }}>
                    {tab.badgeCount}
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
              numberOfLines={1}
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

