import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  Image,
} from 'react-native';
import { X, Search, UserCheck, UserX } from 'lucide-react-native';
import { User, fuzzyMatch, getMultiFieldSearchScore } from '@shared/todo';

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(0, 120, 212, ${alpha})`;
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface BulkAssigneePickerModalProps {
  visible: boolean;
  selectedCount: number;
  users: User[];
  isDarkMode: boolean;
  themePrimary: string;
  onClose: () => void;
  onSelectAssignee: (userId: number | null) => void;
}

export const BulkAssigneePickerModal = ({
  visible,
  selectedCount,
  users,
  isDarkMode,
  themePrimary,
  onClose,
  onSelectAssignee,
}: BulkAssigneePickerModalProps) => {
  const [search, setSearch] = useState('');

  const contactUsers = useMemo(() => users.filter((u) => u.id !== 1 && !u.is_group), [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim();
    if (!q) return contactUsers;
    return contactUsers
      .filter(
        (u) =>
          fuzzyMatch(u.name || '', q) ||
          fuzzyMatch(u.phone || '', q) ||
          fuzzyMatch(u.email || '', q)
      )
      .sort((a, b) => {
        const scoreA = getMultiFieldSearchScore([a.name, a.phone, a.email], q);
        const scoreB = getMultiFieldSearchScore([b.name, b.phone, b.email], q);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [contactUsers, search]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                width: '100%',
                maxWidth: 380,
                maxHeight: '80%',
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                borderRadius: 24,
                padding: 20,
                borderWidth: 1,
                borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                    Assign Assignee
                  </Text>
                  <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                    For {selectedCount} selected {selectedCount === 1 ? 'task' : 'tasks'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} color={isDarkMode ? '#ffffff' : '#0f172a'} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 44,
                  backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  marginBottom: 12,
                }}
              >
                <Search size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search contacts..."
                  placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                  value={search}
                  onChangeText={setSearch}
                  style={{
                    flex: 1,
                    height: '100%',
                    fontSize: 14,
                    fontWeight: '600',
                    color: isDarkMode ? '#ffffff' : '#0f172a',
                  }}
                />
              </View>

              {/* Self Option (First Option with Distinctive Styling) */}
              <TouchableOpacity
                onPress={() => { onSelectAssignee(1); onClose(); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: isDarkMode ? hexToRgba(themePrimary, 0.2) : hexToRgba(themePrimary, 0.08),
                  borderWidth: 1.5,
                  borderColor: themePrimary,
                  marginBottom: 8,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDarkMode ? hexToRgba(themePrimary, 0.3) : hexToRgba(themePrimary, 0.15),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCheck size={18} color={themePrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                      Self (You)
                    </Text>
                    <View
                      style={{
                        backgroundColor: hexToRgba(themePrimary, 0.18),
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: themePrimary }}>
                        You
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 1 }}>
                    Assign selected tasks to yourself
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Unassigned Option */}
              <TouchableOpacity
                onPress={() => { onSelectAssignee(null); onClose(); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                  marginBottom: 8,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserX size={18} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>
                    Unassigned (Remove Assignee)
                  </Text>
                  <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                    Clear assignee on selected tasks
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Contact List */}
              <FlatList
                data={filteredUsers}
                keyExtractor={(u) => String(u.id)}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 280 }}
                renderItem={({ item: u }) => (
                  <TouchableOpacity
                    onPress={() => { onSelectAssignee(u.id); onClose(); }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      gap: 12,
                    }}
                  >
                    {u.avatar ? (
                      <Image
                        source={{ uri: u.avatar }}
                        style={{ width: 36, height: 36, borderRadius: 18 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: themePrimary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>
                          {(u.name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        {u.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                        {u.phone || u.email || 'No phone'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: isDarkMode ? '#71717a' : '#94a3b8', fontSize: 13 }}>
                      No matching contacts found
                    </Text>
                  </View>
                }
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
