import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  RotateCcw,
  Check,
  CheckSquare,
  Star,
  Calendar,
  ListTodo,
  User as UserIcon,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react-native';
import { User, List } from '@shared/todo';

export interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  filterStatus: 'all' | 'pending' | 'completed';
  setFilterStatus: (status: 'all' | 'pending' | 'completed') => void;
  filterImportance: 'all' | 'important' | 'normal';
  setFilterImportance: (importance: 'all' | 'important' | 'normal') => void;
  filterDue: 'all' | 'today' | 'tomorrow' | 'overdue' | 'has_due' | 'no_due';
  setFilterDue: (due: 'all' | 'today' | 'tomorrow' | 'overdue' | 'has_due' | 'no_due') => void;
  filterAssigneeId?: number | 'unassigned' | 'all';
  setFilterAssigneeId?: (assigneeId: number | 'unassigned' | 'all') => void;
  filterListId?: number | 'all';
  setFilterListId?: (listId: number | 'all') => void;
  users?: User[];
  lists?: List[];
  isDarkMode: boolean;
  themePrimary?: string;
  activeFiltersCount?: number;
  onResetFilters: () => void;
  totalMatchedTasks?: number;
  hideImportance?: boolean;
  hideAssignee?: boolean;
  hideList?: boolean;
}

export function FilterBottomSheet({
  visible,
  onClose,
  filterStatus,
  setFilterStatus,
  filterImportance,
  setFilterImportance,
  filterDue,
  setFilterDue,
  filterAssigneeId = 'all',
  setFilterAssigneeId,
  filterListId = 'all',
  setFilterListId,
  users = [],
  lists = [],
  isDarkMode,
  themePrimary = '#0078d4',
  activeFiltersCount = 0,
  onResetFilters,
  totalMatchedTasks,
  hideImportance = false,
  hideAssignee = false,
  hideList = false,
}: FilterBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [activeSubPicker, setActiveSubPicker] = useState<'list' | 'assignee' | null>(null);
  const [subPickerSearch, setSubPickerSearch] = useState('');

  const handleClose = () => {
    setActiveSubPicker(null);
    setSubPickerSearch('');
    onClose();
  };

  const selectedListName =
    filterListId === 'all'
      ? 'All Lists'
      : lists.find((l) => l.id === filterListId)?.title || 'Selected List';

  const selectedAssigneeName =
    filterAssigneeId === 'all'
      ? 'All Assignees'
      : filterAssigneeId === 'unassigned'
      ? 'Unassigned Only'
      : users.find((u) => u.id === filterAssigneeId)?.name || 'Selected User';

  const filteredSubLists = lists.filter((l) =>
    l.title.toLowerCase().includes(subPickerSearch.toLowerCase().trim())
  );

  const filteredSubUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(subPickerSearch.toLowerCase().trim()) ||
      (u.phone && u.phone.includes(subPickerSearch.trim()))
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 34 : 20),
                maxHeight: '88%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.18,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              {/* Grab handle indicator */}
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                  alignSelf: 'center',
                  marginBottom: 14,
                }}
              />

              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      style={{
                        fontSize: 19,
                        fontWeight: '800',
                        color: isDarkMode ? '#ffffff' : '#0f172a',
                      }}
                    >
                      {activeSubPicker === 'list'
                        ? 'Select List'
                        : activeSubPicker === 'assignee'
                        ? 'Select Assignee'
                        : 'Filter Tasks'}
                    </Text>
                    {activeFiltersCount > 0 && !activeSubPicker && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 10,
                          backgroundColor: themePrimary,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>
                          {activeFiltersCount} active
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: isDarkMode ? '#a1a1aa' : '#64748b',
                      marginTop: 2,
                    }}
                  >
                    {activeSubPicker === 'list'
                      ? 'Filter tasks by a specific list'
                      : activeSubPicker === 'assignee'
                      ? 'Filter tasks by assigned contact'
                      : 'Narrow down tasks in current view'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {activeFiltersCount > 0 && !activeSubPicker && (
                    <TouchableOpacity
                      onPress={onResetFilters}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                      }}
                    >
                      <RotateCcw size={12} color="#ef4444" strokeWidth={2.5} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>
                        Reset
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={
                      activeSubPicker
                        ? () => {
                            setActiveSubPicker(null);
                            setSubPickerSearch('');
                          }
                        : handleClose
                    }
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sub-Picker View: List Selection */}
              {activeSubPicker === 'list' && (
                <View style={{ flexShrink: 1 }}>
                  {lists.length > 5 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        marginBottom: 12,
                        gap: 8,
                      }}
                    >
                      <Search size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                      <TextInput
                        value={subPickerSearch}
                        onChangeText={setSubPickerSearch}
                        placeholder="Search lists..."
                        placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: isDarkMode ? '#ffffff' : '#0f172a',
                          padding: 0,
                        }}
                      />
                      {subPickerSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setSubPickerSearch('')}>
                          <X size={14} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setFilterListId?.('all');
                          setActiveSubPicker(null);
                          setSubPickerSearch('');
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderRadius: 14,
                          backgroundColor:
                            filterListId === 'all'
                              ? isDarkMode
                                ? 'rgba(0,120,212,0.18)'
                                : '#eff6ff'
                              : isDarkMode
                              ? '#27272a'
                              : '#f8fafc',
                          borderWidth: 1,
                          borderColor:
                            filterListId === 'all'
                              ? themePrimary
                              : isDarkMode
                              ? '#3f3f46'
                              : '#e2e8f0',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: filterListId === 'all' ? '800' : '600',
                            color:
                              filterListId === 'all'
                                ? themePrimary
                                : isDarkMode
                                ? '#ffffff'
                                : '#0f172a',
                          }}
                        >
                          All Lists
                        </Text>
                        {filterListId === 'all' && (
                          <Check size={16} color={themePrimary} strokeWidth={3} />
                        )}
                      </TouchableOpacity>

                      {filteredSubLists.map((l) => {
                        const isSelected = filterListId === l.id;
                        return (
                          <TouchableOpacity
                            key={l.id}
                            onPress={() => {
                              setFilterListId?.(l.id);
                              setActiveSubPicker(null);
                              setSubPickerSearch('');
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingHorizontal: 14,
                              paddingVertical: 12,
                              borderRadius: 14,
                              backgroundColor: isSelected
                                ? isDarkMode
                                  ? 'rgba(0,120,212,0.18)'
                                  : '#eff6ff'
                                : isDarkMode
                                ? '#27272a'
                                : '#f8fafc',
                              borderWidth: 1,
                              borderColor: isSelected
                                ? themePrimary
                                : isDarkMode
                                ? '#3f3f46'
                                : '#e2e8f0',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: isSelected ? '800' : '600',
                                color: isSelected
                                  ? themePrimary
                                  : isDarkMode
                                  ? '#ffffff'
                                  : '#0f172a',
                              }}
                              numberOfLines={1}
                            >
                              {l.title}
                            </Text>
                            {isSelected && (
                              <Check size={16} color={themePrimary} strokeWidth={3} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Sub-Picker View: Assignee Selection */}
              {activeSubPicker === 'assignee' && (
                <View style={{ flexShrink: 1 }}>
                  {users.length > 5 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        marginBottom: 12,
                        gap: 8,
                      }}
                    >
                      <Search size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                      <TextInput
                        value={subPickerSearch}
                        onChangeText={setSubPickerSearch}
                        placeholder="Search contacts..."
                        placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: isDarkMode ? '#ffffff' : '#0f172a',
                          padding: 0,
                        }}
                      />
                      {subPickerSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setSubPickerSearch('')}>
                          <X size={14} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 6 }}>
                      {/* All Assignees */}
                      <TouchableOpacity
                        onPress={() => {
                          setFilterAssigneeId?.('all');
                          setActiveSubPicker(null);
                          setSubPickerSearch('');
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderRadius: 14,
                          backgroundColor:
                            filterAssigneeId === 'all'
                              ? isDarkMode
                                ? 'rgba(0,120,212,0.18)'
                                : '#eff6ff'
                              : isDarkMode
                              ? '#27272a'
                              : '#f8fafc',
                          borderWidth: 1,
                          borderColor:
                            filterAssigneeId === 'all'
                              ? themePrimary
                              : isDarkMode
                              ? '#3f3f46'
                              : '#e2e8f0',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: filterAssigneeId === 'all' ? '800' : '600',
                            color:
                              filterAssigneeId === 'all'
                                ? themePrimary
                                : isDarkMode
                                ? '#ffffff'
                                : '#0f172a',
                          }}
                        >
                          All Assignees
                        </Text>
                        {filterAssigneeId === 'all' && (
                          <Check size={16} color={themePrimary} strokeWidth={3} />
                        )}
                      </TouchableOpacity>

                      {/* Unassigned Only */}
                      <TouchableOpacity
                        onPress={() => {
                          setFilterAssigneeId?.('unassigned');
                          setActiveSubPicker(null);
                          setSubPickerSearch('');
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderRadius: 14,
                          backgroundColor:
                            filterAssigneeId === 'unassigned'
                              ? isDarkMode
                                ? 'rgba(0,120,212,0.18)'
                                : '#eff6ff'
                              : isDarkMode
                              ? '#27272a'
                              : '#f8fafc',
                          borderWidth: 1,
                          borderColor:
                            filterAssigneeId === 'unassigned'
                              ? themePrimary
                              : isDarkMode
                              ? '#3f3f46'
                              : '#e2e8f0',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: filterAssigneeId === 'unassigned' ? '800' : '600',
                            color:
                              filterAssigneeId === 'unassigned'
                                ? themePrimary
                                : isDarkMode
                                ? '#ffffff'
                                : '#0f172a',
                          }}
                        >
                          Unassigned Only
                        </Text>
                        {filterAssigneeId === 'unassigned' && (
                          <Check size={16} color={themePrimary} strokeWidth={3} />
                        )}
                      </TouchableOpacity>

                      {/* Individual Users */}
                      {filteredSubUsers.map((u) => {
                        const isSelected = filterAssigneeId === u.id;
                        return (
                          <TouchableOpacity
                            key={u.id}
                            onPress={() => {
                              setFilterAssigneeId?.(u.id);
                              setActiveSubPicker(null);
                              setSubPickerSearch('');
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingHorizontal: 14,
                              paddingVertical: 12,
                              borderRadius: 14,
                              backgroundColor: isSelected
                                ? isDarkMode
                                  ? 'rgba(0,120,212,0.18)'
                                  : '#eff6ff'
                                : isDarkMode
                                ? '#27272a'
                                : '#f8fafc',
                              borderWidth: 1,
                              borderColor: isSelected
                                ? themePrimary
                                : isDarkMode
                                ? '#3f3f46'
                                : '#e2e8f0',
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor: themePrimary,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                                  {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                                </Text>
                              </View>
                              <View>
                                <Text
                                  style={{
                                    fontSize: 14,
                                    fontWeight: isSelected ? '800' : '600',
                                    color: isSelected
                                      ? themePrimary
                                      : isDarkMode
                                      ? '#ffffff'
                                      : '#0f172a',
                                  }}
                                  numberOfLines={1}
                                >
                                  {u.name}
                                </Text>
                                {u.phone ? (
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      color: isDarkMode ? '#71717a' : '#94a3b8',
                                    }}
                                  >
                                    {u.phone}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                            {isSelected && (
                              <Check size={16} color={themePrimary} strokeWidth={3} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Main Filter Content */}
              {!activeSubPicker && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  <View style={{ gap: 18 }}>
                    {/* Section: Status Filter */}
                    <View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: isDarkMode ? '#a1a1aa' : '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          marginBottom: 8,
                        }}
                      >
                        Status
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'pending', label: 'Pending' },
                          { id: 'completed', label: 'Completed' },
                        ].map((s) => {
                          const isSelected = filterStatus === s.id;
                          return (
                            <TouchableOpacity
                              key={s.id}
                              onPress={() => setFilterStatus(s.id as any)}
                              activeOpacity={0.7}
                              style={{
                                flex: 1,
                                paddingVertical: 12,
                                borderRadius: 14,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isSelected
                                  ? themePrimary
                                  : isDarkMode
                                  ? '#27272a'
                                  : '#f1f5f9',
                                borderWidth: 1,
                                borderColor: isSelected
                                  ? themePrimary
                                  : isDarkMode
                                  ? '#3f3f46'
                                  : '#e2e8f0',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: '700',
                                  color: isSelected
                                    ? '#ffffff'
                                    : isDarkMode
                                    ? '#d4d4d8'
                                    : '#334155',
                                }}
                              >
                                {s.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Section: Importance Filter */}
                    {!hideImportance && (
                      <View>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: isDarkMode ? '#a1a1aa' : '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 8,
                          }}
                        >
                          Importance
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {[
                            { id: 'all', label: 'All' },
                            { id: 'important', label: '★ Starred' },
                            { id: 'normal', label: 'Normal' },
                          ].map((imp) => {
                            const isSelected = filterImportance === imp.id;
                            return (
                              <TouchableOpacity
                                key={imp.id}
                                onPress={() => setFilterImportance(imp.id as any)}
                                activeOpacity={0.7}
                                style={{
                                  flex: 1,
                                  paddingVertical: 12,
                                  borderRadius: 14,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: isSelected
                                    ? '#f59e0b'
                                    : isDarkMode
                                    ? '#27272a'
                                    : '#f1f5f9',
                                  borderWidth: 1,
                                  borderColor: isSelected
                                    ? '#f59e0b'
                                    : isDarkMode
                                    ? '#3f3f46'
                                    : '#e2e8f0',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontWeight: '700',
                                    color: isSelected
                                      ? '#ffffff'
                                      : isDarkMode
                                      ? '#d4d4d8'
                                      : '#334155',
                                  }}
                                >
                                  {imp.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Section: Due Date Filter */}
                    <View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: isDarkMode ? '#a1a1aa' : '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          marginBottom: 8,
                        }}
                      >
                        Due Date
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'today', label: 'Today' },
                          { id: 'tomorrow', label: 'Tomorrow' },
                          { id: 'overdue', label: 'Overdue' },
                          { id: 'has_due', label: 'Has Date' },
                          { id: 'no_due', label: 'No Date' },
                        ].map((d) => {
                          const isSelected = filterDue === d.id;
                          return (
                            <TouchableOpacity
                              key={d.id}
                              onPress={() => setFilterDue(d.id as any)}
                              activeOpacity={0.7}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isSelected
                                  ? '#0284c7'
                                  : isDarkMode
                                  ? '#27272a'
                                  : '#f1f5f9',
                                borderWidth: 1,
                                borderColor: isSelected
                                  ? '#0284c7'
                                  : isDarkMode
                                  ? '#3f3f46'
                                  : '#e2e8f0',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: '700',
                                  color: isSelected
                                    ? '#ffffff'
                                    : isDarkMode
                                    ? '#d4d4d8'
                                    : '#334155',
                                }}
                              >
                                {d.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Section: List Filter (for multi-list / smart views) */}
                    {!hideList && lists.length > 0 && setFilterListId && (
                      <View>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: isDarkMode ? '#a1a1aa' : '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 8,
                          }}
                        >
                          List
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setSubPickerSearch('');
                            setActiveSubPicker('list');
                          }}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            minHeight: 50,
                            borderRadius: 14,
                            backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                            borderWidth: 1,
                            borderColor:
                              filterListId !== 'all'
                                ? '#a855f7'
                                : isDarkMode
                                ? '#3f3f46'
                                : '#e2e8f0',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                            <ListTodo size={18} color="#a855f7" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: '700',
                                color: isDarkMode ? '#ffffff' : '#0f172a',
                              }}
                            >
                              List
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color:
                                  filterListId !== 'all'
                                    ? '#a855f7'
                                    : isDarkMode
                                    ? '#a1a1aa'
                                    : '#64748b',
                              }}
                              numberOfLines={1}
                            >
                              {selectedListName}
                            </Text>
                            <ChevronRight size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Section: Assignee Filter */}
                    {!hideAssignee && users.length > 0 && setFilterAssigneeId && (
                      <View>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: isDarkMode ? '#a1a1aa' : '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 8,
                          }}
                        >
                          Assignee
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setSubPickerSearch('');
                            setActiveSubPicker('assignee');
                          }}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            minHeight: 50,
                            borderRadius: 14,
                            backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                            borderWidth: 1,
                            borderColor:
                              filterAssigneeId !== 'all'
                                ? '#10b981'
                                : isDarkMode
                                ? '#3f3f46'
                                : '#e2e8f0',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                            <UserIcon size={18} color="#10b981" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: '700',
                                color: isDarkMode ? '#ffffff' : '#0f172a',
                              }}
                            >
                              Assignee
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color:
                                  filterAssigneeId !== 'all'
                                    ? '#10b981'
                                    : isDarkMode
                                    ? '#a1a1aa'
                                    : '#64748b',
                              }}
                              numberOfLines={1}
                            >
                              {selectedAssigneeName}
                            </Text>
                            <ChevronRight size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}

              {/* Bottom Action Footer */}
              {!activeSubPicker && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  <TouchableOpacity
                    onPress={onResetFilters}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      height: 52,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: isDarkMode ? '#ffffff' : '#0f172a',
                      }}
                    >
                      Clear All
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleClose}
                    activeOpacity={0.8}
                    style={{
                      flex: 2,
                      height: 52,
                      backgroundColor: themePrimary,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: themePrimary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '800',
                        color: '#ffffff',
                      }}
                    >
                      {typeof totalMatchedTasks === 'number'
                        ? `Apply (${totalMatchedTasks} tasks)`
                        : 'Apply Filters'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default FilterBottomSheet;
