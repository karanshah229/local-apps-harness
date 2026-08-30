import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ListTodo,
  Plus,
  Trash2,
  Search,
  Share2,
  X
} from 'lucide-react-native';
import { List, THEME_PALETTES, ThemeColor, SMART_VIEWS } from '@shared/todo';
import { lightColors, darkColors } from '../theme/colors';
import { fontSizes } from '../theme/typography';

interface ListsPageProps {
  lists: List[];
  activeListId: number | null;
  setActiveListId: (id: number | null) => void;
  activeView: string | null;
  setActiveView: (view: string | null) => void;
  onCreateList: (name: string) => Promise<boolean>;
  onDeleteList: (id: number) => Promise<boolean>;
  onOpenShareModal?: (list: List) => void;
  taskCounts: Record<string, number>;
  isDarkMode: boolean;
}

export default function ListsPage({
  lists,
  activeListId,
  setActiveListId,
  activeView,
  setActiveView,
  onCreateList,
  onDeleteList,
  onOpenShareModal,
  taskCounts,
  isDarkMode
}: ListsPageProps) {
  const [newListTitle, setNewListTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const colors = isDarkMode ? darkColors : lightColors;
  const insets = useSafeAreaInsets();

  const handleCreate = async () => {
    if (!newListTitle.trim()) return;
    const ok = await onCreateList(newListTitle.trim());
    if (ok) {
      setNewListTitle('');
      setIsCreateModalOpen(false);
    } else {
      Alert.alert('Error', 'Failed to create list.');
    }
  };

  const handleDelete = (list: List) => {
    const listTitle = list.title || (list as any).name || 'Untitled list';
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${listTitle}"? All tasks in this list will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await onDeleteList(list.id);
            if (activeListId === list.id) {
              setActiveListId(null);
              setActiveView('all-tasks');
            }
          }
        }
      ]
    );
  };

  const filteredLists = (lists || []).filter((l) => {
    if (!l) return false;
    const title = l.title || (l as any).name || '';
    return title.toLowerCase().includes((searchQuery || '').toLowerCase().trim());
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}
    >
      {/* Search Bar Row */}
      <View
        style={[
          styles.searchBarContainer,
          { borderBottomColor: colors.border, backgroundColor: colors.card }
        ]}
      >
        <View
          style={[
            styles.searchInputInner,
            { backgroundColor: isDarkMode ? '#18181b' : '#f8fafc', borderColor: colors.border }
          ]}
        >
          <Search size={16} color={colors.textMuted} />
          <TextInput
            placeholder="Search lists..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Scrollable Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 90 }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >


          {/* Lists Section */}
          <View style={styles.customSectionHeaderRow}>
            <Text style={styles.sectionHeader}>LISTS ({filteredLists.length})</Text>
          </View>

          {filteredLists.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: colors.card, borderColor: colors.border }
              ]}
            >
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {searchQuery ? `No lists match "${searchQuery}".` : 'No lists yet. Tap the + button below to create one.'}
              </Text>
            </View>
          ) : (
            filteredLists.map((l) => {
              const isActive = activeListId === l.id;
              const countKey = `list-${l.id}`;
              const count = taskCounts[countKey] || 0;
              const themeColor = l.color_theme || (l as any).theme_color || '#0078d4';
              const listTitle = l.title || (l as any).name || 'Untitled list';
              const members = l.members || [];

              return (
                <View
                  key={l.id}
                  style={[
                    styles.customListItem,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && [styles.customListItemActive, { borderColor: themeColor }]
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setActiveListId(l.id);
                      setActiveView(null);
                    }}
                    style={styles.customListClickArea}
                    activeOpacity={0.7}
                  >
                    <View style={styles.listItemLeft}>
                      <View style={[styles.colorDot, { backgroundColor: themeColor }]} />
                      <Text style={[styles.listItemText, { color: colors.text }]} numberOfLines={1}>
                        {listTitle}
                      </Text>
                    </View>

                    {members.length > 0 && (
                      <View style={styles.membersRow}>
                        {members.slice(0, 3).map((m, idx) => (
                          <Image
                            key={m.id || idx}
                            source={{
                              uri:
                                m.avatar ||
                                `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(m.name)}`
                            }}
                            style={styles.memberMiniAvatar}
                          />
                        ))}
                        <Text style={[styles.membersText, { color: colors.textMuted }]}>
                          {members.length} member{members.length === 1 ? '' : 's'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.customListActions}>
                    {count > 0 && (
                      <View style={[styles.countBadge, { backgroundColor: themeColor }]}>
                        <Text style={styles.countText}>{count}</Text>
                      </View>
                    )}

                    {onOpenShareModal && (
                      <TouchableOpacity
                        onPress={() => onOpenShareModal(l)}
                        style={styles.actionIconButton}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Share2 size={16} color="#0078d4" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => handleDelete(l)}
                      style={styles.actionIconButton}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Action Button (FAB) for Creating New List */}
      <TouchableOpacity
        onPress={() => setIsCreateModalOpen(true)}
        style={[
          styles.fabBtn,
          { bottom: 16 }
        ]}
        activeOpacity={0.85}
        accessibilityLabel="Create new list"
      >
        <Plus size={26} color="#ffffff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Create List Modal */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="none"
        onRequestClose={() => {
          setIsCreateModalOpen(false);
          setNewListTitle('');
        }}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => {
            setIsCreateModalOpen(false);
            setNewListTitle('');
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Create New List
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsCreateModalOpen(false);
                  setNewListTitle('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="List title (e.g. Groceries, Work, Travel)..."
              placeholderTextColor={colors.textMuted}
              value={newListTitle}
              onChangeText={setNewListTitle}
              onSubmitEditing={handleCreate}
              autoFocus
              returnKeyType="done"
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#18181b' : '#f8fafc' }
              ]}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                onPress={() => {
                  setIsCreateModalOpen(false);
                  setNewListTitle('');
                }}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={!newListTitle.trim()}
                style={[
                  styles.modalCreateBtn,
                  { backgroundColor: newListTitle.trim() ? '#0078d4' : isDarkMode ? '#3f3f46' : '#cbd5e1' }
                ]}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Create List</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  searchInputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.small,
    fontWeight: '500'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    gap: 12
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1
  },
  listItemActive: {
    borderColor: '#0078d4',
    borderWidth: 1.5
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listItemText: {
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  countBadge: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  countText: {
    color: '#ffffff',
    fontSize: fontSizes.caption,
    fontWeight: '800'
  },
  customSectionHeaderRow: {
    marginTop: 6,
    marginBottom: 2
  },
  sectionHeader: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8
  },
  emptyBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: fontSizes.small,
    textAlign: 'center'
  },
  customListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1
  },
  customListItemActive: {
    borderWidth: 1.5
  },
  customListClickArea: {
    flex: 1,
    paddingRight: 8
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  memberMiniAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8
  },
  membersText: {
    fontSize: fontSizes.caption,
    fontWeight: '500',
    marginLeft: 2
  },
  customListActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  actionIconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fabBtn: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0078d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0078d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 50
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalTitle: {
    fontSize: fontSizes.medium,
    fontWeight: '800'
  },
  modalInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: fontSizes.small,
    fontWeight: '500'
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1
  },
  modalCancelText: {
    fontSize: fontSizes.small,
    fontWeight: '600'
  },
  modalCreateBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
