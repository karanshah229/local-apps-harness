import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert
} from 'react-native';
import {
  Plus,
  Trash2,
  X,
  Search,
  ArrowLeft
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { List, THEME_PALETTES, ThemeColor, fuzzyMatch, getSearchMatchScore } from '@shared/todo';
import { lightColors, darkColors } from '../theme/colors';
import { fontSizes } from '../theme/typography';
import { useUiStore } from '../store/useUiStore';

interface ListsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lists: List[];
  activeListId: number | null;
  setActiveListId: (id: number | null) => void;
  activeView: string | null;
  setActiveView: (view: string | null) => void;
  onCreateList: (title: string) => void;
  onDeleteList: (listId: number) => void;
  taskCounts: Record<string, number>;
  isDarkMode: boolean;
}

export default function ListsSheet({
  isOpen,
  onClose,
  lists,
  activeListId,
  setActiveListId,
  activeView,
  setActiveView,
  onCreateList,
  onDeleteList,
  taskCounts,
  isDarkMode
}: ListsSheetProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  const colors = isDarkMode ? darkColors : lightColors;
  const insets = useSafeAreaInsets();

  const handleCreate = () => {
    if (!newListTitle.trim()) return;
    onCreateList(newListTitle.trim());
    setNewListTitle('');
    setIsCreatingList(false);
  };

  const showConfirmDialog = useUiStore((s) => s.showConfirmDialog);

  const handleDelete = (list: List) => {
    const listTitle = list.title || (list as any).name || 'Untitled list';
    showConfirmDialog({
      title: 'Delete List',
      message: `Are you sure you want to delete "${listTitle}"?`,
      type: 'danger',
      confirmLabel: 'Delete List',
      onConfirm: () => onDeleteList(list.id),
    });
  };

  const q = (searchQuery || '').trim();
  const filteredLists = (lists || [])
    .filter((l) => {
      if (!l) return false;
      const title = l.title || (l as any).name || '';
      return fuzzyMatch(title, q);
    })
    .sort((a, b) => {
      if (!q) return 0;
      const scoreA = getSearchMatchScore(a.title || (a as any).name || '', q);
      const scoreB = getSearchMatchScore(b.title || (b as any).name || '', q);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return 0;
    });

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          {/* Top In-Line Header Row (Back Button + Search Bar) */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.backButton,
                { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: colors.border }
              ]}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>

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
            </View>
          </View>

          {/* Scrollable Lists Area */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
          >
            {/* Lists Section Header */}
            <View style={styles.customSectionHeaderRow}>
              <Text style={styles.sectionHeader}>
                LISTS ({filteredLists.length})
              </Text>
            </View>

            {filteredLists.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }
                ]}
              >
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {searchQuery ? `No lists match "${searchQuery}".` : 'No lists yet.'}
                </Text>
              </View>
            ) : (
              filteredLists.map((l) => {
                const isActive = activeListId === l.id;
                const countKey = `list-${l.id}`;
                const count = taskCounts[countKey] || 0;
                const themeColor = l.color_theme || (l as any).theme_color || '#0078d4';
                const listTitle = l.title || (l as any).name || 'Untitled list';

                return (
                  <TouchableOpacity
                    key={l.id}
                    onPress={() => {
                      onClose();
                      router.push(`/list/${l.id}`);
                    }}
                    style={[
                      styles.listItem,
                      { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: colors.border },
                      isActive && [styles.listItemActive, { borderColor: themeColor }]
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.listItemLeft}>
                      <View style={[styles.colorDot, { backgroundColor: themeColor }]} />
                      <Text style={[styles.listItemText, { color: colors.text }]} numberOfLines={1}>
                        {listTitle}
                      </Text>
                    </View>

                    <View style={styles.listItemRight}>
                      {count > 0 && (
                        <View style={[styles.countBadge, { backgroundColor: themeColor }]}>
                          <Text style={styles.countText}>{count}</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(l);
                        }}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Inline Add List Form */}
            {isCreatingList ? (
              <View
                style={[
                  styles.createForm,
                  { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: colors.border }
                ]}
              >
                <TextInput
                  placeholder="List name..."
                  placeholderTextColor={colors.textMuted}
                  value={newListTitle}
                  onChangeText={setNewListTitle}
                  onSubmitEditing={handleCreate}
                  autoFocus
                  style={[styles.createInput, { color: colors.text }]}
                />
                <View style={styles.createActions}>
                  <TouchableOpacity
                    onPress={() => setIsCreatingList(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={[styles.cancelText, { color: colors.textMuted }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreate}
                    style={styles.saveBtn}
                  >
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsCreatingList(true)}
                style={[
                  styles.addListBtn,
                  { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: colors.border }
                ]}
                activeOpacity={0.7}
              >
                <Plus size={18} color="#0078d4" />
                <Text style={styles.addListBtnText}>Create new list</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 10
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  searchInputInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.small,
    fontWeight: '500'
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  scrollContent: {
    gap: 8,
    paddingBottom: 100
  },
  sectionHeader: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 4
  },
  customSectionHeaderRow: {
    marginTop: 4
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 52
  },
  listItemActive: {
    borderWidth: 1.5,
    borderColor: '#0078d4'
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  listItemText: {
    fontSize: fontSizes.small,
    fontWeight: '700',
    flex: 1
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  countText: {
    color: '#ffffff',
    fontSize: fontSizes.caption,
    fontWeight: '800'
  },
  deleteBtn: {
    padding: 6
  },
  emptyBox: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: fontSizes.small
  },
  addListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4
  },
  addListBtnText: {
    fontSize: fontSizes.small,
    fontWeight: '700',
    color: '#0078d4'
  },
  createForm: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 4
  },
  createInput: {
    fontSize: fontSizes.small,
    paddingVertical: 4
  },
  createActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  cancelText: {
    fontSize: fontSizes.caption,
    fontWeight: '600'
  },
  saveBtn: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10
  },
  saveText: {
    color: '#ffffff',
    fontSize: fontSizes.caption,
    fontWeight: '700'
  }
});
