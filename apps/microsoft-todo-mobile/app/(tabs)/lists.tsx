import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Trash2, CheckSquare, Star, UserCheck, Search, X, Check } from 'lucide-react-native';
import { useUiStore } from '../../src/store/useUiStore';
import {
  useListsQuery,
  useCreateListMutation,
  useDeleteListMutation,
  useTaskCountsQuery,
} from '../../src/hooks/useTodoQueries';
import { localTodoDb } from '../../src/db/sqlite';
import { THEME_PALETTES, ThemeColor, CUSTOM_LIST_THEMES, getThemePrimary, fuzzyMatch, getSearchMatchScore } from '@shared/todo';
import { SingleListView } from '../../src/components/SingleListView';

interface ListsDirectoryViewProps {
  onSelectList: (id: number) => void;
}

function ListsDirectoryView({ onSelectList }: ListsDirectoryViewProps) {
  const router = useRouter();
  const [newListTitle, setNewListTitle] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [newListTheme, setNewListTheme] = useState<string>(CUSTOM_LIST_THEMES[0] || 'teal');
  const [searchQuery, setSearchQuery] = useState('');

  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const showConfirmDialog = useUiStore((s) => s.showConfirmDialog);
  const showAlertDialog = useUiStore((s) => s.showAlertDialog);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const listsQuery = useListsQuery(1);
  const taskCountsQuery = useTaskCountsQuery(1);
  const lists = listsQuery.data || [];
  const taskCounts = taskCountsQuery.data || {};

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        listsQuery.refetch(),
        taskCountsQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [listsQuery, taskCountsQuery]);

  const createListMutation = useCreateListMutation();
  const deleteListMutation = useDeleteListMutation();

  const handleStartNewList = useCallback(() => {
    const chosen = CUSTOM_LIST_THEMES[lists.length % CUSTOM_LIST_THEMES.length] || 'teal';
    setNewListTheme(chosen);
    setShowAddList(true);
  }, [lists.length]);

  const handleCreateList = async () => {
    if (!newListTitle.trim()) return;
    try {
      const newList = await createListMutation.mutateAsync({
        title: newListTitle.trim(),
        color_theme: newListTheme,
        created_by: 1,
      });
      setNewListTitle('');
      setShowAddList(false);
      if (newList?.id) {
        onSelectList(newList.id);
      }
    } catch (err: any) {
      showAlertDialog('Error', err.message || 'Failed to create list');
    }
  };

  const smartViews = useMemo(() => [
    { id: 'all-tasks', label: 'All tasks', icon: CheckSquare, color: '#0078d4', count: taskCounts['all-tasks'] || 0 },
    { id: 'important', label: 'Important', icon: Star, color: '#f97316', count: taskCounts['important'] || 0 },
    { id: 'assigned-to-me', label: 'Assigned to me', icon: UserCheck, color: '#a855f7', count: taskCounts['assigned-to-me'] || 0 },
  ], [taskCounts]);

  const filteredSmartViews = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return smartViews;
    return smartViews
      .filter((v) => fuzzyMatch(v.label, q))
      .sort((a, b) => {
        const scoreA = getSearchMatchScore(a.label, q);
        const scoreB = getSearchMatchScore(b.label, q);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [smartViews, searchQuery]);

  const filteredCustomLists = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return lists;
    return lists
      .filter((l) => fuzzyMatch(l.title, q))
      .sort((a, b) => {
        const scoreA = getSearchMatchScore(a.title, q);
        const scoreB = getSearchMatchScore(b.title, q);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [lists, searchQuery]);

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#09090b' : '#f8fafc', paddingTop: topInset }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
          Lists
        </Text>
        <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
          Organize your tasks across custom categories
        </Text>

        {/* Search Box - 52px Touch Target */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 52,
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            paddingHorizontal: 14,
            marginTop: 12,
          }}
        >
          <Search size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search lists..."
            placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              height: '100%',
              fontSize: 15,
              fontWeight: '600',
              color: isDarkMode ? '#ffffff' : '#0f172a',
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ padding: 4 }}
            >
              <X size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0078d4"
            colors={['#0078d4']}
            progressBackgroundColor={isDarkMode ? '#18181b' : '#ffffff'}
          />
        }
      >
        {/* Smart Categories */}
        {filteredSmartViews.length > 0 && (
          <>
            <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
              Smart Views
            </Text>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {filteredSmartViews.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (item.id === 'important') {
                        router.push('/(tabs)/important');
                      } else if (item.id === 'assigned-to-me') {
                        router.push('/(tabs)/assigned');
                      } else {
                        router.push('/(tabs)');
                      }
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      minHeight: 56,
                      borderRadius: 18,
                      backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: `${item.color}15`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={20} color={item.color} />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        {item.label}
                      </Text>
                    </View>

                    {item.count > 0 && (
                      <View
                        style={{
                          paddingHorizontal: 9,
                          paddingVertical: 4,
                          borderRadius: 10,
                          backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                          {item.count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Custom Lists Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            My Lists ({filteredCustomLists.length})
          </Text>
          <TouchableOpacity
            onPress={handleStartNewList}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(0, 120, 212, 0.1)',
              paddingHorizontal: 12,
              paddingVertical: 8,
              minHeight: 38,
              borderRadius: 12,
            }}
          >
            <Plus size={16} color="#0078d4" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0078d4' }}>New List</Text>
          </TouchableOpacity>
        </View>

        {showAddList && (() => {
          const activeNewThemePrimary = getThemePrimary(newListTheme, isDarkMode);
          return (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                minHeight: 56,
                borderRadius: 18,
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                borderWidth: 1.5,
                borderColor: activeNewThemePrimary,
                marginBottom: 10,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: activeNewThemePrimary,
                  marginLeft: 2,
                }}
              />
              <TextInput
                placeholder="List name..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                value={newListTitle}
                onChangeText={setNewListTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateList}
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: '600',
                  color: isDarkMode ? '#ffffff' : '#0f172a',
                  paddingVertical: 10,
                }}
              />
              {/* Cancel (Cross) Button */}
              <TouchableOpacity
                onPress={() => {
                  setShowAddList(false);
                  setNewListTitle('');
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>

              {/* Submit (Check) Button */}
              <TouchableOpacity
                onPress={handleCreateList}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: activeNewThemePrimary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={18} color="#ffffff" strokeWidth={2.8} />
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Custom Lists List */}
        <View style={{ gap: 8 }}>
          {filteredCustomLists.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: isDarkMode ? '#71717a' : '#94a3b8' }}>
                No lists found
              </Text>
            </View>
          ) : (
            filteredCustomLists.map((list) => {
              const themeHex = getThemePrimary(list.color_theme, isDarkMode);

              return (
                <TouchableOpacity
                  key={list.id}
                  onPress={() => {
                    onSelectList(list.id);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    minHeight: 56,
                    borderRadius: 18,
                    backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: themeHex }} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a', flex: 1 }} numberOfLines={1}>
                      {list.title}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {(list.pending_task_count ?? 0) > 0 && (
                      <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                          {list.pending_task_count}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        showConfirmDialog({
                          title: 'Delete List',
                          message: `Are you sure you want to delete "${list.title}"?`,
                          type: 'danger',
                          confirmLabel: 'Delete List',
                          onConfirm: () => deleteListMutation.mutate(list.id),
                        });
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={{ padding: 6 }}
                    >
                      <Trash2 size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default function ListsScreen() {
  const activeListId = useUiStore((s) => s.activeListId);
  const setActiveListId = useUiStore((s) => s.setActiveListId);

  const handleSelectList = (id: number) => {
    setActiveListId(id);
    localTodoDb.updateUserPreferences({
      last_view_type: 'list',
      last_view_id: String(id),
    });
  };

  if (activeListId) {
    return <SingleListView listId={activeListId} onBack={() => setActiveListId(null)} />;
  }

  return <ListsDirectoryView onSelectList={handleSelectList} />;
}
