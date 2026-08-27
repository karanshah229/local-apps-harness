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
  ListTodo,
  CheckSquare,
  Star,
  User as UserIcon,
  Plus,
  Trash2,
  X
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { List } from '@saileshbhai/todo-shared';
import { lightColors, darkColors, getThemeGradientColors } from '../theme/colors';

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
  const [newListTitle, setNewListTitle] = useState('');
  const colors = isDarkMode ? darkColors : lightColors;
  const insets = useSafeAreaInsets();

  const handleCreate = () => {
    if (!newListTitle.trim()) return;
    onCreateList(newListTitle.trim());
    setNewListTitle('');
  };

  const confirmDelete = (list: List) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete list "${list.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteList(list.id)
        }
      ]
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          {/* Sheet Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <ListTodo size={22} color="#0078d4" />
              <Text style={[styles.title, { color: colors.text }]}>
                Lists & Views
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Lists Area */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Smart Views Section */}
            <Text style={styles.sectionHeader}>SMART VIEWS</Text>

            {/* All Tasks */}
            <TouchableOpacity
              onPress={() => {
                setActiveListId(null);
                setActiveView('all-tasks');
                onClose();
              }}
              style={[
                styles.listItem,
                { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' },
                activeView === 'all-tasks' && !activeListId && styles.listItemActive
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.listItemLeft}>
                <CheckSquare size={18} color="#0078d4" />
                <Text style={[styles.listItemText, { color: colors.text }]}>
                  Tasks
                </Text>
              </View>
              {Boolean(taskCounts['all-tasks']) && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{taskCounts['all-tasks']}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Important */}
            <TouchableOpacity
              onPress={() => {
                setActiveListId(null);
                setActiveView('important');
                onClose();
              }}
              style={[
                styles.listItem,
                { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' },
                activeView === 'important' && !activeListId && styles.listItemActive
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.listItemLeft}>
                <Star size={18} color="#742774" fill="#742774" />
                <Text style={[styles.listItemText, { color: colors.text }]}>
                  Important
                </Text>
              </View>
              {Boolean(taskCounts['important']) && (
                <View style={[styles.countBadge, { backgroundColor: '#742774' }]}>
                  <Text style={styles.countText}>{taskCounts['important']}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Assigned to me */}
            <TouchableOpacity
              onPress={() => {
                setActiveListId(null);
                setActiveView('assigned-to-me');
                onClose();
              }}
              style={[
                styles.listItem,
                { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' },
                activeView === 'assigned-to-me' && !activeListId && styles.listItemActive
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.listItemLeft}>
                <UserIcon size={18} color="#d83b01" />
                <Text style={[styles.listItemText, { color: colors.text }]}>
                  Assigned to me
                </Text>
              </View>
              {Boolean(taskCounts['assigned-to-me']) && (
                <View style={[styles.countBadge, { backgroundColor: '#d83b01' }]}>
                  <Text style={styles.countText}>
                    {taskCounts['assigned-to-me']}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Custom Lists Section */}
            <View style={styles.customSectionHeaderRow}>
              <Text style={styles.sectionHeader}>
                CUSTOM LISTS ({lists.length})
              </Text>
            </View>

            {lists.map((list) => {
              const isSelected = activeListId === list.id;
              const themeColor = getThemeGradientColors(list.color_theme)[0];

              return (
                <TouchableOpacity
                  key={list.id}
                  onPress={() => {
                    setActiveListId(list.id);
                    setActiveView(null);
                    onClose();
                  }}
                  style={[
                    styles.listItem,
                    { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' },
                    isSelected && styles.listItemActive
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.listItemLeft}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: themeColor }
                      ]}
                    />
                    <Text
                      style={[styles.listItemText, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {list.title}
                    </Text>
                  </View>

                  <View style={styles.listItemRight}>
                    {Boolean(list.pending_task_count && list.pending_task_count > 0) && (
                      <View
                        style={[
                          styles.countBadge,
                          { backgroundColor: themeColor }
                        ]}
                      >
                        <Text style={styles.countText}>
                          {list.pending_task_count}
                        </Text>
                      </View>
                    )}

                    {!list.is_default && (
                      <TouchableOpacity
                        onPress={() => confirmDelete(list)}
                        style={styles.deleteTouch}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Create List Form */}
            <View style={styles.createRow}>
              <TextInput
                placeholder="Create new list..."
                placeholderTextColor={colors.textMuted}
                value={newListTitle}
                onChangeText={setNewListTitle}
                onSubmitEditing={handleCreate}
                returnKeyType="done"
                style={[
                  styles.createInput,
                  { color: colors.text, borderColor: colors.border }
                ]}
              />
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!newListTitle.trim()}
                style={[
                  styles.createBtn,
                  !newListTitle.trim() && { opacity: 0.5 }
                ]}
                activeOpacity={0.8}
              >
                <Plus size={18} color="#ffffff" />
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Bottom Done Action */}
          <View
            style={[
              styles.bottomBar,
              {
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 16)
              }
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={styles.doneBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '800'
  },
  closeBtn: {
    padding: 6
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  scrollContent: {
    gap: 8,
    paddingBottom: 24
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4
  },
  customSectionHeaderRow: {
    marginTop: 12
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16
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
    width: 14,
    height: 14,
    borderRadius: 7
  },
  listItemText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  countBadge: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  countText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  deleteTouch: {
    padding: 4
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 10
  },
  createInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600'
  },
  createBtn: {
    backgroundColor: '#0078d4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1
  },
  doneBtn: {
    backgroundColor: '#0078d4',
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800'
  }
});
