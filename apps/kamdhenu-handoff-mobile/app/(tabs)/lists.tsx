import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  Trash2,
  CheckSquare,
  Star,
  UserCheck,
  Search,
  X,
  Check,
  Info,
  Layers,
  ListTodo,
  MoreVertical,
  Pencil,
  Palette,
  Pin,
  PinOff,
  Users,
  Phone,
} from 'lucide-react-native';
import { WhatsAppIcon } from '../../src/components/WhatsAppIcon';
import { useUiStore } from '../../src/store/useUiStore';
import {
  useListsQuery,
  useCreateListMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useTaskCountsQuery,
  useCustomViewsQuery,
  useCreateCustomViewMutation,
  useUpdateCustomViewMutation,
  useDeleteCustomViewMutation,
  usePinnedViewsQuery,
  useTogglePinViewMutation,
  useUsersQuery,
  useAddUserMutation,
  useUpdateUserMutation,
} from '../../src/hooks/useTodoQueries';
import { localTodoDb } from '../../src/db/sqlite';
import {
  THEME_PALETTES,
  ThemeColor,
  CUSTOM_LIST_THEMES,
  getThemePrimary,
  fuzzyMatch,
  getSearchMatchScore,
  CustomView,
  List,
  User,
  WhatsAppMessageStyle,
} from '@shared/todo';
import { SingleListView } from '../../src/components/SingleListView';
import { TasksView } from '../../src/components/TasksView';
import { ListOrViewDropdownModal } from '../../src/components/ListOrViewDropdownModal';
import { ContactPickerModal } from '../../src/components/ContactPickerModal';
import { WhatsAppFormatBottomSheet, WhatsAppFormatOptions } from '../../src/components/WhatsAppFormatBottomSheet';

interface ListsDirectoryViewProps {
  onSelectList: (id: number) => void;
  onSelectCustomView: (id: number) => void;
}

type DropdownTarget =
  | { type: 'view'; data: CustomView }
  | { type: 'list'; data: List };

type RenameTarget = {
  type: 'view' | 'list';
  id: number;
  title: string;
  color_theme: string;
};

type ThemeTarget = {
  type: 'view' | 'list';
  id: number;
  title: string;
  currentTheme: string;
};

function ListsDirectoryView({ onSelectList, onSelectCustomView }: ListsDirectoryViewProps) {
  const router = useRouter();

  // New List State
  const [newListTitle, setNewListTitle] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [newListTheme, setNewListTheme] = useState<string>(CUSTOM_LIST_THEMES[0] || 'teal');

  // New View State
  const [newViewTitle, setNewViewTitle] = useState('');
  const [showAddView, setShowAddView] = useState(false);
  const [newViewTheme, setNewViewTheme] = useState<string>(CUSTOM_LIST_THEMES[1] || 'pink');

  // 3-Dot Dropdown Menu State
  const [activeDropdown, setActiveDropdown] = useState<DropdownTarget | null>(null);

  // Dedicated Rename Modal State
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Dedicated Theme Picker Modal State
  const [themeTarget, setThemeTarget] = useState<ThemeTarget | null>(null);
  const [selectedThemeColor, setSelectedThemeColor] = useState('teal');

  const [searchQuery, setSearchQuery] = useState('');

  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const showConfirmDialog = useUiStore((s) => s.showConfirmDialog);
  const showAlertDialog = useUiStore((s) => s.showAlertDialog);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const listsQuery = useListsQuery(1);
  const taskCountsQuery = useTaskCountsQuery(1);
  const customViewsQuery = useCustomViewsQuery();
  const pinnedViewsQuery = usePinnedViewsQuery();
  const usersQuery = useUsersQuery();

  const lists = listsQuery.data || [];
  const taskCounts = taskCountsQuery.data || {};
  const customViews = customViewsQuery.data || [];
  const pinnedViews = pinnedViewsQuery.data || ['important', 'assigned-to-me'];
  const users = usersQuery.data || [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        listsQuery.refetch(),
        taskCountsQuery.refetch(),
        customViewsQuery.refetch(),
        usersQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [listsQuery, taskCountsQuery, customViewsQuery, usersQuery]);

  const createListMutation = useCreateListMutation();
  const updateListMutation = useUpdateListMutation();
  const deleteListMutation = useDeleteListMutation();
  const createCustomViewMutation = useCreateCustomViewMutation();
  const updateCustomViewMutation = useUpdateCustomViewMutation();
  const deleteCustomViewMutation = useDeleteCustomViewMutation();
  const togglePinViewMutation = useTogglePinViewMutation();
  const addUserMutation = useAddUserMutation();
  const updateUserMutation = useUpdateUserMutation();

  const defaultWhatsAppStyle = useUiStore((s) => s.defaultWhatsAppStyle);
  const defaultWhatsAppIncludeNotes = useUiStore((s) => s.defaultWhatsAppIncludeNotes);
  const defaultWhatsAppIncludeAssignee = useUiStore((s) => s.defaultWhatsAppIncludeAssignee);
  const defaultWhatsAppIncludeImportant = useUiStore((s) => s.defaultWhatsAppIncludeImportant);
  const defaultWhatsAppIncludeSteps = useUiStore((s) => s.defaultWhatsAppIncludeSteps);
  const defaultWhatsAppIncludeDueDate = useUiStore((s) => s.defaultWhatsAppIncludeDueDate);
  const defaultWhatsAppIncludeListName = useUiStore((s) => s.defaultWhatsAppIncludeListName);

  // WhatsApp Contact, Scope & Format Picker Modal States for Lists and Views
  const [dropdownY, setDropdownY] = useState(150);
  const [selectedItemForConfig, setSelectedItemForConfig] = useState<{
    type: 'list' | 'view';
    id: number;
    title: string;
    color_theme?: string;
    default_whatsapp_contact_id?: number | null;
    default_whatsapp_share_scope?: string | null;
    whatsapp_message_style?: string | null;
    whatsapp_include_notes?: number | boolean | null;
    whatsapp_include_assignee?: number | boolean | null;
    whatsapp_include_important?: number | boolean | null;
    whatsapp_include_list_name?: number | boolean | null;
    whatsapp_include_steps?: number | boolean | null;
    whatsapp_include_due_date?: number | boolean | null;
  } | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactPickerSearch, setContactPickerSearch] = useState('');
  const [showScopePickerModal, setShowScopePickerModal] = useState(false);
  const [showFormatPickerModal, setShowFormatPickerModal] = useState(false);

  const liveConfigItem = useMemo(() => {
    if (!selectedItemForConfig) return null;
    if (selectedItemForConfig.type === 'view') {
      const found = customViews.find((v) => v.id === selectedItemForConfig.id);
      return found ? { ...found, type: 'view' as const } : selectedItemForConfig;
    }
    const found = lists.find((l) => l.id === selectedItemForConfig.id);
    return found ? { ...found, type: 'list' as const } : selectedItemForConfig;
  }, [selectedItemForConfig, lists, customViews]);

  const handleSelectDefaultContact = async (contactId: number | null) => {
    if (!selectedItemForConfig) return;
    try {
      if (selectedItemForConfig.type === 'view') {
        await updateCustomViewMutation.mutateAsync({
          id: selectedItemForConfig.id,
          default_whatsapp_contact_id: contactId,
        });
      } else {
        await updateListMutation.mutateAsync({
          id: selectedItemForConfig.id,
          default_whatsapp_contact_id: contactId,
        });
      }
      setShowContactPicker(false);
    } catch (e: any) {
      showAlertDialog('Error', e?.message || 'Failed to update contact');
    }
  };

  const handleChooseTasksToSendScope = async (scope: string | null) => {
    if (!selectedItemForConfig) return;
    try {
      if (selectedItemForConfig.type === 'view') {
        await updateCustomViewMutation.mutateAsync({
          id: selectedItemForConfig.id,
          default_whatsapp_share_scope: scope || undefined,
        });
      } else {
        await updateListMutation.mutateAsync({
          id: selectedItemForConfig.id,
          default_whatsapp_share_scope: scope || undefined,
        });
      }
      setShowScopePickerModal(false);
    } catch (e: any) {
      showAlertDialog('Error', e?.message || 'Failed to update scope');
    }
  };

  const handleSaveWhatsAppFormat = async (style: WhatsAppMessageStyle, options: WhatsAppFormatOptions) => {
    if (!selectedItemForConfig) return;
    try {
      const payload = {
        whatsapp_message_style: style,
        whatsapp_include_notes: options.includeNotes ? 1 : 0,
        whatsapp_include_assignee: options.includeAssignee ? 1 : 0,
        whatsapp_include_important: options.includeImportant ? 1 : 0,
        whatsapp_include_steps: options.includeSteps ? 1 : 0,
        whatsapp_include_due_date: options.includeDueDate ? 1 : 0,
        whatsapp_include_list_name: options.includeListName ? 1 : 0,
      };
      if (selectedItemForConfig.type === 'view') {
        await updateCustomViewMutation.mutateAsync({
          id: selectedItemForConfig.id,
          ...payload,
        });
      } else {
        await updateListMutation.mutateAsync({
          id: selectedItemForConfig.id,
          ...payload,
        });
      }
    } catch (e: any) {
      showAlertDialog('Error', e?.message || 'Failed to update format options');
    }
  };

  const handleStartNewList = useCallback(() => {
    setShowAddView(false);
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

  const handleStartNewView = useCallback(() => {
    setShowAddList(false);
    const chosen = CUSTOM_LIST_THEMES[(customViews.length + 3) % CUSTOM_LIST_THEMES.length] || 'purple';
    setNewViewTheme(chosen);
    setShowAddView(true);
  }, [customViews.length]);

  const handleCreateCustomView = async () => {
    if (!newViewTitle.trim()) return;
    try {
      const created = await createCustomViewMutation.mutateAsync({
        title: newViewTitle.trim(),
        color_theme: newViewTheme,
        filter_config: {},
      });
      setNewViewTitle('');
      setShowAddView(false);
      if (created?.id) {
        onSelectCustomView(created.id);
      }
    } catch (err: any) {
      showAlertDialog('Error', err.message || 'Failed to create view');
    }
  };

  const showViewsInfoDialog = () => {
    showAlertDialog(
      'About Views (Live Filters)',
      'Views are dynamic live searches. You can create custom views with saved filters (like high priority, specific team member, or upcoming deadlines). Any filters you set inside a view are automatically saved!'
    );
  };

  const showListsInfoDialog = () => {
    showAlertDialog(
      'About Lists (Folders)',
      'Lists are manual folders for organizing tasks into projects, departments, or categories (e.g. Warehouse, Logistics, Personal). Tasks stay in the lists you assign them to.'
    );
  };

  const handleSaveRename = () => {
    if (!renameTarget || !renameInput.trim()) return;
    if (renameTarget.type === 'view') {
      updateCustomViewMutation.mutate({
        id: renameTarget.id,
        title: renameInput.trim(),
      });
    } else {
      updateListMutation.mutate({
        id: renameTarget.id,
        title: renameInput.trim(),
      });
    }
    setRenameTarget(null);
  };

  const handleSaveTheme = (theme: string) => {
    if (!themeTarget) return;
    if (themeTarget.type === 'view') {
      updateCustomViewMutation.mutate({
        id: themeTarget.id,
        color_theme: theme,
      });
    } else {
      updateListMutation.mutate({
        id: themeTarget.id,
        color_theme: theme,
      });
    }
    setThemeTarget(null);
  };

  const builtInViews = useMemo(() => [
    { id: 'all-tasks', label: 'All tasks', icon: CheckSquare, color: '#0078d4', count: taskCounts['all-tasks'] || 0 },
    { id: 'important', label: 'Important', icon: Star, color: '#f97316', count: taskCounts['important'] || 0 },
    { id: 'assigned-to-me', label: 'Assigned to me', icon: UserCheck, color: '#a855f7', count: taskCounts['assigned-to-me'] || 0 },
  ], [taskCounts]);

  const filteredBuiltInViews = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return builtInViews;
    return builtInViews
      .filter((v) => fuzzyMatch(v.label, q))
      .sort((a, b) => {
        const scoreA = getSearchMatchScore(a.label, q);
        const scoreB = getSearchMatchScore(b.label, q);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [builtInViews, searchQuery]);

  const filteredCustomViews = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return customViews;
    return customViews
      .filter((v) => fuzzyMatch(v.title, q))
      .sort((a, b) => {
        const scoreA = getSearchMatchScore(a.title, q);
        const scoreB = getSearchMatchScore(b.title, q);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [customViews, searchQuery]);

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

  const dropdownThemeHex = useMemo(() => {
    if (!activeDropdown) return '#0078d4';
    return getThemePrimary(activeDropdown.data.color_theme, isDarkMode);
  }, [activeDropdown, isDarkMode]);

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#09090b' : '#f8fafc', paddingTop: topInset }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
          Lists & Views
        </Text>
        <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
          Organize your tasks across custom lists and saved views
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
            placeholder="Search lists & views..."
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
        {/* ========================================================================= */}
        {/* SECTION 1: VIEWS (Dynamic Live Filters) */}
        {/* ========================================================================= */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Views ({filteredCustomViews.length})
            </Text>
            <TouchableOpacity
              onPress={showViewsInfoDialog}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ padding: 2 }}
            >
              <Info size={14} color={isDarkMode ? '#71717a' : '#94a3b8'} />
            </TouchableOpacity>
          </View>

          {/* New View CTA - Standard App Blue */}
          <TouchableOpacity
            onPress={handleStartNewView}
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
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0078d4' }}>New View</Text>
          </TouchableOpacity>
        </View>

        {/* Inline New View Form */}
        {showAddView && (() => {
          const activeNewViewThemePrimary = getThemePrimary(newViewTheme, isDarkMode);
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
                borderColor: activeNewViewThemePrimary,
                marginBottom: 10,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: activeNewViewThemePrimary,
                  marginLeft: 2,
                }}
              />
              <TextInput
                placeholder="View name (e.g. Overdue Invoices)..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                value={newViewTitle}
                onChangeText={setNewViewTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateCustomView}
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
                  setShowAddView(false);
                  setNewViewTitle('');
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
                onPress={handleCreateCustomView}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: activeNewViewThemePrimary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={18} color="#ffffff" strokeWidth={2.8} />
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Views List (Built-In + Custom) */}
        <View style={{ gap: 8, marginBottom: 28 }}>
          {/* Built-in Views */}
          {filteredBuiltInViews.map((item) => {
            const Icon = item.icon;
            const isPinnable = item.id === 'important' || item.id === 'assigned-to-me';
            const viewPinKey = item.id === 'important' ? 'important' : 'assigned-to-me';
            const isPinned = isPinnable && pinnedViews.includes(viewPinKey);

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
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
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a', flex: 1 }} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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

                  {/* Pin / Unpin Button for Important & Assigned to me */}
                  {isPinnable && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        togglePinViewMutation.mutate(viewPinKey);
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isPinned
                          ? (isDarkMode ? `${item.color}25` : `${item.color}18`)
                          : (isDarkMode ? '#27272a' : '#f1f5f9'),
                      }}
                    >
                      {isPinned ? (
                        <Pin size={16} color={item.color} fill={item.color} />
                      ) : (
                        <PinOff size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* User Custom Saved Views */}
          {filteredCustomViews.map((cView) => {
            const themeHex = getThemePrimary(cView.color_theme, isDarkMode);
            const isCustomPinned = pinnedViews.includes(`custom_view:${cView.id}`);

            return (
              <TouchableOpacity
                key={`custom_view_${cView.id}`}
                onPress={() => onSelectCustomView(cView.id)}
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
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: `${themeHex}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Layers size={18} color={themeHex} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a', flex: 1 }} numberOfLines={1}>
                    {cView.title}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {(cView.matched_count ?? 0) > 0 && (
                    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                        {cView.matched_count}
                      </Text>
                    </View>
                  )}

                  {/* Pin / Unpin Button */}
                  {isCustomPinned && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        togglePinViewMutation.mutate(`custom_view:${cView.id}`);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                      activeOpacity={0.7}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: `${themeHex}18`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Pin size={14} color={themeHex} fill={themeHex} />
                    </TouchableOpacity>
                  )}

                  {/* 3-Dot Dropdown Menu Trigger */}
                  <TouchableOpacity
                    onPress={(e) => {
                      const pageY = (e.nativeEvent as any)?.pageY || 180;
                      setDropdownY(pageY);
                      setActiveDropdown({ type: 'view', data: cView });
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                    }}
                  >
                    <MoreVertical size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ========================================================================= */}
        {/* SECTION 2: LISTS (Manual Task Folders) */}
        {/* ========================================================================= */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Lists ({filteredCustomLists.length})
            </Text>
            <TouchableOpacity
              onPress={showListsInfoDialog}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ padding: 2 }}
            >
              <Info size={14} color={isDarkMode ? '#71717a' : '#94a3b8'} />
            </TouchableOpacity>
          </View>

          {/* New List CTA - Standard App Blue */}
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

        {/* Inline New List Form */}
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
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: `${themeHex}18`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ListTodo size={18} color={themeHex} />
                    </View>
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

                    {/* Pin / Unpin Button */}
                    {pinnedViews.includes(`list:${list.id}`) && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          togglePinViewMutation.mutate(`list:${list.id}`);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                        activeOpacity={0.7}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor: `${themeHex}18`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Pin size={14} color={themeHex} fill={themeHex} />
                      </TouchableOpacity>
                    )}

                    {/* 3-Dot Dropdown Menu Trigger */}
                    <TouchableOpacity
                      onPress={(e) => {
                        const pageY = (e.nativeEvent as any)?.pageY || 240;
                        setDropdownY(pageY);
                        setActiveDropdown({ type: 'list', data: list });
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                      }}
                    >
                      <MoreVertical size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 3-Dot Dropdown Popover Menu (Using Unified Component) */}
      <ListOrViewDropdownModal
        visible={Boolean(activeDropdown)}
        onClose={() => setActiveDropdown(null)}
        targetType={activeDropdown?.type || 'list'}
        item={activeDropdown ? activeDropdown.data : null}
        users={users}
        isPinned={Boolean(
          activeDropdown &&
          pinnedViews.includes(
            activeDropdown.type === 'view'
              ? `custom_view:${activeDropdown.data.id}`
              : `list:${activeDropdown.data.id}`
          )
        )}
        isDarkMode={isDarkMode}
        topOffset={dropdownY}
        onOpenContactPicker={() => {
          if (!activeDropdown) return;
          setSelectedItemForConfig({
            type: activeDropdown.type,
            id: activeDropdown.data.id,
            title: activeDropdown.data.title,
            default_whatsapp_contact_id: activeDropdown.data.default_whatsapp_contact_id,
            default_whatsapp_share_scope: activeDropdown.data.default_whatsapp_share_scope,
          });
          setShowContactPicker(true);
        }}
        onOpenScopePicker={() => {
          if (!activeDropdown) return;
          setSelectedItemForConfig({
            type: activeDropdown.type,
            id: activeDropdown.data.id,
            title: activeDropdown.data.title,
            default_whatsapp_contact_id: activeDropdown.data.default_whatsapp_contact_id,
            default_whatsapp_share_scope: activeDropdown.data.default_whatsapp_share_scope,
          });
          setShowScopePickerModal(true);
        }}
        onOpenFormatPicker={() => {
          if (!activeDropdown) return;
          setSelectedItemForConfig({
            type: activeDropdown.type,
            id: activeDropdown.data.id,
            title: activeDropdown.data.title,
            default_whatsapp_contact_id: activeDropdown.data.default_whatsapp_contact_id,
            default_whatsapp_share_scope: activeDropdown.data.default_whatsapp_share_scope,
          });
          setShowFormatPickerModal(true);
        }}
        onTogglePin={() => {
          if (!activeDropdown) return;
          const pinKey = activeDropdown.type === 'view'
            ? `custom_view:${activeDropdown.data.id}`
            : `list:${activeDropdown.data.id}`;
          togglePinViewMutation.mutate(pinKey);
        }}
        onRename={() => {
          if (!activeDropdown) return;
          setRenameTarget({
            type: activeDropdown.type,
            id: activeDropdown.data.id,
            title: activeDropdown.data.title,
            color_theme: activeDropdown.data.color_theme || 'teal',
          });
          setRenameInput(activeDropdown.data.title);
        }}
        onChangeTheme={() => {
          if (!activeDropdown) return;
          setThemeTarget({
            type: activeDropdown.type,
            id: activeDropdown.data.id,
            title: activeDropdown.data.title,
            currentTheme: activeDropdown.data.color_theme || 'teal',
          });
          setSelectedThemeColor(activeDropdown.data.color_theme || 'teal');
        }}
        onDelete={() => {
          if (!activeDropdown) return;
          if (activeDropdown.type === 'view') {
            showConfirmDialog({
              title: 'Delete View',
              message: `Are you sure you want to delete "${activeDropdown.data.title}"? (Tasks will not be deleted)`,
              type: 'danger',
              confirmLabel: 'Delete View',
              onConfirm: () => deleteCustomViewMutation.mutate(activeDropdown.data.id),
            });
          } else {
            showConfirmDialog({
              title: 'Delete List',
              message: `Are you sure you want to delete "${activeDropdown.data.title}"?`,
              type: 'danger',
              confirmLabel: 'Delete List',
              onConfirm: () => deleteListMutation.mutate(activeDropdown.data.id),
            });
          }
        }}
      />

      {/* Global Contact Picker Modal for Lists and Views */}
      <ContactPickerModal
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        title="Default WhatsApp Contact"
        subtitle={`Choose who receives updates for "${liveConfigItem?.title || 'this item'}"`}
        selectedContactId={liveConfigItem?.default_whatsapp_contact_id}
        users={users}
        onSelectContact={(user) => {
          handleSelectDefaultContact(user ? user.id : null);
        }}
        onClearContact={() => {
          handleSelectDefaultContact(null);
        }}
        isDarkMode={isDarkMode}
      />

      {/* Tasks to Send Scope Picker Modal */}
      <Modal
        visible={showScopePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowScopePickerModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowScopePickerModal(false)}
          />
          <View
            style={{
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: Math.max(insets.bottom, 24),
              borderTopWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  Tasks to Send
                </Text>
                <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                  Choose which tasks to include when sharing "{liveConfigItem?.title}" on WhatsApp
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowScopePickerModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Scope Options */}
            <View style={{ gap: 10, marginTop: 6 }}>
              {liveConfigItem?.type === 'view' ? (
                <>
                  {/* Option 1: Current View (Default for views) */}
                  <TouchableOpacity
                    onPress={() => handleChooseTasksToSendScope('current_view')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: (liveConfigItem?.default_whatsapp_share_scope || 'current_view') === 'current_view'
                        ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                        : (isDarkMode ? '#27272a' : '#f8fafc'),
                      borderWidth: (liveConfigItem?.default_whatsapp_share_scope || 'current_view') === 'current_view' ? 2 : 1,
                      borderColor: (liveConfigItem?.default_whatsapp_share_scope || 'current_view') === 'current_view' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: 'rgba(168, 85, 247, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Layers size={20} color="#a855f7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                          Current View
                        </Text>
                        <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                          Tasks matching active search and filters
                        </Text>
                      </View>
                    </View>
                    {(liveConfigItem?.default_whatsapp_share_scope || 'current_view') === 'current_view' && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0078d4', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Option 2: Pending tasks */}
                  <TouchableOpacity
                    onPress={() => handleChooseTasksToSendScope('pending')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: liveConfigItem?.default_whatsapp_share_scope === 'pending'
                        ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                        : (isDarkMode ? '#27272a' : '#f8fafc'),
                      borderWidth: liveConfigItem?.default_whatsapp_share_scope === 'pending' ? 2 : 1,
                      borderColor: liveConfigItem?.default_whatsapp_share_scope === 'pending' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: 'rgba(0, 120, 212, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ListTodo size={20} color="#0078d4" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                          Pending Tasks
                        </Text>
                        <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                          Only incomplete tasks in this view
                        </Text>
                      </View>
                    </View>
                    {liveConfigItem?.default_whatsapp_share_scope === 'pending' && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0078d4', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Option 3: All Tasks */}
                  <TouchableOpacity
                    onPress={() => handleChooseTasksToSendScope('all')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: liveConfigItem?.default_whatsapp_share_scope === 'all'
                        ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                        : (isDarkMode ? '#27272a' : '#f8fafc'),
                      borderWidth: liveConfigItem?.default_whatsapp_share_scope === 'all' ? 2 : 1,
                      borderColor: liveConfigItem?.default_whatsapp_share_scope === 'all' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: 'rgba(34, 197, 94, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckSquare size={20} color="#22c55e" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                          All Tasks
                        </Text>
                        <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                          Both pending and completed tasks
                        </Text>
                      </View>
                    </View>
                    {liveConfigItem?.default_whatsapp_share_scope === 'all' && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0078d4', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Option 1: Pending tasks (Default for lists) */}
                  <TouchableOpacity
                    onPress={() => handleChooseTasksToSendScope('pending')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: (liveConfigItem?.default_whatsapp_share_scope || 'pending') === 'pending'
                        ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                        : (isDarkMode ? '#27272a' : '#f8fafc'),
                      borderWidth: (liveConfigItem?.default_whatsapp_share_scope || 'pending') === 'pending' ? 2 : 1,
                      borderColor: (liveConfigItem?.default_whatsapp_share_scope || 'pending') === 'pending' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: 'rgba(0, 120, 212, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ListTodo size={20} color="#0078d4" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                          Pending Tasks
                        </Text>
                        <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                          Only incomplete tasks in this list
                        </Text>
                      </View>
                    </View>
                    {(liveConfigItem?.default_whatsapp_share_scope || 'pending') === 'pending' && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0078d4', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Option 2: Current View */}
                  <TouchableOpacity
                    onPress={() => handleChooseTasksToSendScope('current_view')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: liveConfigItem?.default_whatsapp_share_scope === 'current_view'
                        ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                        : (isDarkMode ? '#27272a' : '#f8fafc'),
                      borderWidth: liveConfigItem?.default_whatsapp_share_scope === 'current_view' ? 2 : 1,
                      borderColor: liveConfigItem?.default_whatsapp_share_scope === 'current_view' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: 'rgba(168, 85, 247, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Layers size={20} color="#a855f7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                          Current View
                        </Text>
                        <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                          Tasks matching active search and filters
                        </Text>
                      </View>
                    </View>
                    {liveConfigItem?.default_whatsapp_share_scope === 'current_view' && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0078d4', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Option 3: All Tasks */}
                  <TouchableOpacity
                    onPress={() => handleChooseTasksToSendScope('all')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: liveConfigItem?.default_whatsapp_share_scope === 'all'
                        ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                        : (isDarkMode ? '#27272a' : '#f8fafc'),
                      borderWidth: liveConfigItem?.default_whatsapp_share_scope === 'all' ? 2 : 1,
                      borderColor: liveConfigItem?.default_whatsapp_share_scope === 'all' ? '#0078d4' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: 'rgba(34, 197, 94, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckSquare size={20} color="#22c55e" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                          All Tasks
                        </Text>
                        <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                          Both pending and completed tasks
                        </Text>
                      </View>
                    </View>
                    {liveConfigItem?.default_whatsapp_share_scope === 'all' && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0078d4', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* WhatsApp Message Format Bottom Sheet */}
      <WhatsAppFormatBottomSheet
        visible={showFormatPickerModal}
        onClose={() => setShowFormatPickerModal(false)}
        currentStyle={((liveConfigItem as any)?.whatsapp_message_style as WhatsAppMessageStyle) || defaultWhatsAppStyle || 'executive'}
        includeNotes={(liveConfigItem as any)?.whatsapp_include_notes != null ? (liveConfigItem as any)?.whatsapp_include_notes !== 0 : defaultWhatsAppIncludeNotes}
        includeAssignee={(liveConfigItem as any)?.whatsapp_include_assignee != null ? (liveConfigItem as any)?.whatsapp_include_assignee !== 0 : defaultWhatsAppIncludeAssignee}
        includeImportant={(liveConfigItem as any)?.whatsapp_include_important != null ? (liveConfigItem as any)?.whatsapp_include_important !== 0 : defaultWhatsAppIncludeImportant}
        includeSteps={(liveConfigItem as any)?.whatsapp_include_steps != null ? (liveConfigItem as any)?.whatsapp_include_steps !== 0 : defaultWhatsAppIncludeSteps}
        includeDueDate={(liveConfigItem as any)?.whatsapp_include_due_date != null ? (liveConfigItem as any)?.whatsapp_include_due_date !== 0 : defaultWhatsAppIncludeDueDate}
        includeListName={(liveConfigItem as any)?.whatsapp_include_list_name != null ? (liveConfigItem as any)?.whatsapp_include_list_name !== 0 : defaultWhatsAppIncludeListName}
        onSave={handleSaveWhatsAppFormat}
        title={`Message Format: ${liveConfigItem?.title || ''}`}
        isDarkMode={isDarkMode}
        themePrimary={getThemePrimary(liveConfigItem?.color_theme || 'teal', isDarkMode)}
      />

      {/* Dedicated Rename Modal */}
      {Boolean(renameTarget) && (
        <Modal
          visible={Boolean(renameTarget)}
          transparent
          animationType="fade"
          onRequestClose={() => setRenameTarget(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setRenameTarget(null)}
            />
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                borderRadius: 24,
                padding: 22,
                borderWidth: 1,
                borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  {renameTarget?.type === 'view' ? 'Rename View' : 'Rename List'}
                </Text>
                <TouchableOpacity onPress={() => setRenameTarget(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                </TouchableOpacity>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 14,
                  backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                  paddingHorizontal: 14,
                  marginBottom: 20,
                }}
              >
                <TextInput
                  value={renameInput}
                  onChangeText={setRenameInput}
                  placeholder={renameTarget?.type === 'view' ? 'View name' : 'List name'}
                  placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                  autoFocus
                  selectTextOnFocus
                  maxLength={50}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveRename}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: '600',
                    color: isDarkMode ? '#ffffff' : '#0f172a',
                    paddingVertical: 14,
                  }}
                />
                {renameInput.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setRenameInput('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 4 }}
                  >
                    <X size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setRenameTarget(null)}
                  style={{
                    flex: 1,
                    paddingVertical: 13,
                    borderRadius: 14,
                    backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#d4d4d8' : '#475569' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveRename}
                  disabled={!renameInput.trim()}
                  style={{
                    flex: 1,
                    paddingVertical: 13,
                    borderRadius: 14,
                    backgroundColor: renameInput.trim()
                      ? (renameTarget ? getThemePrimary(renameTarget.color_theme, isDarkMode) : '#0078d4')
                      : (isDarkMode ? '#3f3f46' : '#cbd5e1'),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Dedicated Theme Picker Modal */}
      {Boolean(themeTarget) && (
        <Modal
          visible={Boolean(themeTarget)}
          transparent
          animationType="fade"
          onRequestClose={() => setThemeTarget(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setThemeTarget(null)}
            />
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                borderRadius: 28,
                padding: 22,
                borderWidth: 1,
                borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  {themeTarget?.type === 'view' ? 'View Theme' : 'List Theme'}
                </Text>
                <TouchableOpacity onPress={() => setThemeTarget(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginBottom: 16 }}>
                Choose an accent color for "{themeTarget?.title}":
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
                {CUSTOM_LIST_THEMES.map((theme) => {
                  const themeHex = getThemePrimary(theme, isDarkMode);
                  const isSelected = selectedThemeColor === theme;
                  return (
                    <TouchableOpacity
                      key={theme}
                      onPress={() => {
                        setSelectedThemeColor(theme);
                        handleSaveTheme(theme);
                      }}
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        backgroundColor: themeHex,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isSelected ? 3.5 : 0,
                        borderColor: isDarkMode ? '#ffffff' : '#0f172a',
                      }}
                      activeOpacity={0.8}
                    >
                      {isSelected && <Check size={20} color="#ffffff" strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={() => setThemeTarget(null)}
                style={{
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#d4d4d8' : '#475569' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

export default function ListsScreen() {
  const activeListId = useUiStore((s) => s.activeListId);
  const setActiveListId = useUiStore((s) => s.setActiveListId);
  const activeCustomViewId = useUiStore((s) => s.activeCustomViewId);
  const setActiveCustomViewId = useUiStore((s) => s.setActiveCustomViewId);

  const handleSelectList = (id: number) => {
    setActiveListId(id);
    localTodoDb.updateUserPreferences({
      last_view_type: 'list',
      last_view_id: String(id),
    });
  };

  const handleSelectCustomView = (id: number) => {
    setActiveCustomViewId(id);
    localTodoDb.updateUserPreferences({
      last_view_type: 'custom_view',
      last_view_id: String(id),
    });
  };

  const handleBackToDirectory = () => {
    setActiveListId(null);
    setActiveCustomViewId(null);
    useUiStore.getState().setActiveView('lists');
    localTodoDb.updateUserPreferences({
      last_view_type: 'tab',
      last_view_id: 'lists',
    });
  };

  if (activeListId) {
    return <SingleListView listId={activeListId} onBack={handleBackToDirectory} />;
  }

  if (activeCustomViewId) {
    return <TasksView fixedCustomViewId={activeCustomViewId} onBack={handleBackToDirectory} />;
  }

  return (
    <ListsDirectoryView
      onSelectList={handleSelectList}
      onSelectCustomView={handleSelectCustomView}
    />
  );
}
