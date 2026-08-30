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
import { Plus, Trash2, CheckSquare, Star, UserCheck, Search, X } from 'lucide-react-native';
import { useUiStore } from '../../src/store/useUiStore';
import {
  useListsQuery,
  useCreateListMutation,
  useDeleteListMutation,
  useTaskCountsQuery,
  useUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
} from '../../src/hooks/useTodoQueries';
import { THEME_PALETTES, ThemeColor, getThemePrimary } from '@shared/todo';
import { SingleListView } from '../../src/components/SingleListView';

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const cleanText = text.toLowerCase();
  const cleanQuery = query.toLowerCase().trim();
  if (cleanText.includes(cleanQuery)) return true;

  let queryIdx = 0;
  for (let i = 0; i < cleanText.length && queryIdx < cleanQuery.length; i++) {
    if (cleanText[i] === cleanQuery[queryIdx]) {
      queryIdx++;
    }
  }
  return queryIdx === cleanQuery.length;
}

interface ListsDirectoryViewProps {
  onSelectList: (id: number) => void;
}

function ListsDirectoryView({ onSelectList }: ListsDirectoryViewProps) {
  const router = useRouter();
  const [newListTitle, setNewListTitle] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isDarkMode = useUiStore((s) => s.isDarkMode);
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

  const handleCreateList = async () => {
    if (!newListTitle.trim()) return;
    try {
      const newList = await createListMutation.mutateAsync({
        title: newListTitle.trim(),
        color_theme: 'blue',
        created_by: 1,
      });
      setNewListTitle('');
      setShowAddList(false);
      if (newList?.id) {
        onSelectList(newList.id);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create list');
    }
  };

  const smartViews = useMemo(() => [
    { id: 'all-tasks', label: 'All tasks', icon: CheckSquare, color: '#0078d4', count: taskCounts['all-tasks'] || 0 },
    { id: 'important', label: 'Important', icon: Star, color: '#f97316', count: taskCounts['important'] || 0 },
    { id: 'assigned-to-me', label: 'Assigned to me', icon: UserCheck, color: '#a855f7', count: taskCounts['assigned-to-me'] || 0 },
  ], [taskCounts]);

  const filteredSmartViews = useMemo(() => {
    if (!searchQuery.trim()) return smartViews;
    return smartViews.filter((v) => fuzzyMatch(v.label, searchQuery));
  }, [smartViews, searchQuery]);

  const filteredCustomLists = useMemo(() => {
    if (!searchQuery.trim()) return lists;
    return lists.filter((l) => fuzzyMatch(l.title, searchQuery));
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
            onPress={() => setShowAddList(true)}
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

        {showAddList && (
          <View
            style={{
              padding: 16,
              borderRadius: 18,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderWidth: 2,
              borderColor: '#0078d4',
              marginBottom: 14,
            }}
          >
            <TextInput
              placeholder="Enter list name..."
              placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
              value={newListTitle}
              onChangeText={setNewListTitle}
              autoFocus
              onSubmitEditing={handleCreateList}
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#0f172a',
                paddingVertical: 8,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setShowAddList(false)}
                activeOpacity={0.7}
                style={{ paddingHorizontal: 14, paddingVertical: 10, minHeight: 40, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#a1a1aa' : '#64748b' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateList}
                activeOpacity={0.8}
                style={{ backgroundColor: '#0078d4', paddingHorizontal: 18, paddingVertical: 10, minHeight: 40, borderRadius: 12, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
                    {!list.is_default && (
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Delete List', `Delete list "${list.title}"?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteListMutation.mutate(list.id) },
                          ]);
                        }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={{ padding: 6 }}
                      >
                        <Trash2 size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                      </TouchableOpacity>
                    )}
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

  const { data: prefs } = useUserPreferencesQuery(1);
  const updatePrefs = useUpdateUserPreferencesMutation();

  React.useEffect(() => {
    if (!activeListId && prefs?.remember_last_view && (prefs?.last_view_id !== 'lists' || prefs?.last_view_type !== 'tab')) {
      updatePrefs.mutate({ last_view_type: 'tab', last_view_id: 'lists' });
    }
  }, [activeListId, prefs?.remember_last_view, prefs?.last_view_id, prefs?.last_view_type]);

  if (activeListId) {
    return <SingleListView listId={activeListId} onBack={() => setActiveListId(null)} />;
  }

  return <ListsDirectoryView onSelectList={(id) => setActiveListId(id)} />;
}
