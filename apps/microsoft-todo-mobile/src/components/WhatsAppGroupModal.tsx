import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
} from 'react-native';
import { X, Users, Check, Info } from 'lucide-react-native';
import { User } from '@shared/todo';

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(37, 211, 102, ${alpha})`;
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface WhatsAppGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectGroup: (group: User) => void;
  onCreateGroup: (groupName: string) => Promise<User | null> | User | null;
  existingGroups: User[];
  isDarkMode: boolean;
  themePrimary?: string;
}

export const WhatsAppGroupModal = ({
  visible,
  onClose,
  onSelectGroup,
  onCreateGroup,
  existingGroups,
  isDarkMode,
  themePrimary = '#25D366',
}: WhatsAppGroupModalProps) => {
  const [groupName, setGroupName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = groupName.trim();
    const finalName = trimmed || 'WhatsApp Group';
    setSaving(true);
    try {
      const existing = existingGroups.find(
        (g) => g.name.toLowerCase() === finalName.toLowerCase()
      );
      if (existing) {
        onSelectGroup(existing);
        setGroupName('');
        onClose();
        return;
      }

      const created = await onCreateGroup(finalName);
      if (created) {
        onSelectGroup(created);
      }
      setGroupName('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

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
            backgroundColor: 'rgba(0,0,0,0.65)',
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
                maxHeight: '85%',
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                borderRadius: 24,
                padding: 20,
                borderWidth: 1,
                borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                gap: 14,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: hexToRgba(themePrimary, 0.15),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users size={20} color={themePrimary} />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '800',
                        color: isDarkMode ? '#ffffff' : '#0f172a',
                      }}
                    >
                      WhatsApp Group
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: isDarkMode ? '#a1a1aa' : '#64748b',
                      }}
                    >
                      Assign or share to a team group
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
              </View>

              {/* Group Name Input */}
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isDarkMode ? '#d4d4d8' : '#334155',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Group Name
                </Text>
                <View
                  style={{
                    height: 48,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#3f3f46' : '#cbd5e1',
                  }}
                >
                  <TextInput
                    placeholder="e.g. Operations Team 🚀"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                    value={groupName}
                    onChangeText={setGroupName}
                    autoFocus={true}
                    style={{
                      flex: 1,
                      height: '100%',
                      fontSize: 15,
                      fontWeight: '600',
                      color: isDarkMode ? '#ffffff' : '#0f172a',
                    }}
                  />
                </View>

                {/* 1-Line Explanation */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 6,
                    marginTop: 8,
                    paddingHorizontal: 2,
                  }}
                >
                  <Info size={13} color={isDarkMode ? '#a1a1aa' : '#64748b'} style={{ marginTop: 2 }} />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12,
                      lineHeight: 16,
                      color: isDarkMode ? '#a1a1aa' : '#64748b',
                    }}
                  >
                    The group's name must match the WhatsApp group name exactly (including emojis). If you don't type a group name, you can still select any group from the list in WhatsApp.
                  </Text>
                </View>
              </View>

              {/* Existing Groups (if any) */}
              {existingGroups.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: isDarkMode ? '#71717a' : '#94a3b8',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                      letterSpacing: 0.5,
                    }}
                  >
                    Saved Groups ({existingGroups.length})
                  </Text>
                  <FlatList
                    data={existingGroups}
                    keyExtractor={(g) => String(g.id)}
                    style={{ maxHeight: 120 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item: g }) => (
                      <TouchableOpacity
                        onPress={() => {
                          onSelectGroup(g);
                          onClose();
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                          marginBottom: 6,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Users size={16} color={themePrimary} />
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: isDarkMode ? '#ffffff' : '#0f172a',
                            }}
                          >
                            {g.name}
                          </Text>
                        </View>
                        <Check size={14} color={themePrimary} />
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: isDarkMode ? '#d4d4d8' : '#475569',
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1.5,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: themePrimary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: themePrimary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: '#ffffff',
                    }}
                  >
                    {groupName.trim() ? 'Save & Select' : 'Use WhatsApp Group'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
