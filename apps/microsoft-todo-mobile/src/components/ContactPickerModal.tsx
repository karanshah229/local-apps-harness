import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Users, Phone, Check, User as UserIcon } from 'lucide-react-native';
import { User, fuzzyMatch, getMultiFieldSearchScore } from '@shared/todo';

export const WHATSAPP_GROUP_USER: User = {
  id: -1,
  name: 'WhatsApp Group',
  email: 'group@local.todo',
  phone: '',
  is_group: 1,
  active: 1,
};

export const SELF_USER: User = {
  id: 1,
  name: 'Self (You)',
  email: 'self@local.todo',
  phone: '',
  active: 1,
};

export interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  selectedContactId?: number | null;
  users: User[];
  onSelectContact: (user: User) => void;
  onClearContact?: () => void;
  isDarkMode: boolean;
  themePrimary?: string;
}

export function ContactPickerModal({
  visible,
  onClose,
  title = 'Default WhatsApp Contact',
  subtitle = 'Choose who receives updates on WhatsApp',
  selectedContactId,
  users,
  onSelectContact,
  onClearContact,
  isDarkMode,
  themePrimary = '#25D366',
}: ContactPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const isGroupSelected = selectedContactId === -1;
  const isSelfSelected = selectedContactId === 1;

  const individualContacts = useMemo(
    () => users.filter((u) => !u.is_group && u.id !== 1),
    [users]
  );

  const filteredIndividuals = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return individualContacts;
    return individualContacts
      .filter((u) => fuzzyMatch(u.name || '', q) || fuzzyMatch(u.phone || '', q) || fuzzyMatch(u.email || '', q))
      .sort((a, b) => {
        const scoreA = getMultiFieldSearchScore([a.name, a.phone], q);
        const scoreB = getMultiFieldSearchScore([b.name, b.phone], q);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [individualContacts, searchQuery]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 20,
            paddingBottom: Math.max(insets.bottom, 24),
            maxHeight: '85%',
            borderTopWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                {title}
              </Text>
              <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
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
          </View>

          {/* Search Box */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              height: 44,
              backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
              borderRadius: 14,
              paddingHorizontal: 12,
              marginBottom: 12,
            }}
          >
            <Search size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search contacts..."
              placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                height: '100%',
                fontSize: 14,
                fontWeight: '600',
                color: isDarkMode ? '#ffffff' : '#0f172a',
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={14} color={isDarkMode ? '#71717a' : '#94a3b8'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Scrollable Options List */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
            {/* Option to clear default */}
            {Boolean(selectedContactId && onClearContact) && (
              <TouchableOpacity
                onPress={() => {
                  onClearContact?.();
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 11,
                  borderRadius: 14,
                  marginBottom: 10,
                  backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                  borderWidth: 1,
                  borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>
                  ✕ Clear Default Contact
                </Text>
              </TouchableOpacity>
            )}

            {/* Item 1: WhatsApp Group */}
            {(!searchQuery.trim() || fuzzyMatch('WhatsApp Group', searchQuery)) && (
              <TouchableOpacity
                onPress={() => {
                  onSelectContact(WHATSAPP_GROUP_USER);
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  marginBottom: 8,
                  backgroundColor: isGroupSelected
                    ? (isDarkMode ? 'rgba(37, 211, 102, 0.18)' : '#ecfdf5')
                    : (isDarkMode ? '#27272a' : '#f8fafc'),
                  borderWidth: isGroupSelected ? 1.5 : 1,
                  borderColor: isGroupSelected ? '#25D366' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: isGroupSelected ? '#25D366' : 'rgba(37, 211, 102, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users size={18} color={isGroupSelected ? '#ffffff' : '#25D366'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        WhatsApp Group
                      </Text>
                      <View
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.2)' : '#dcfce7',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#25D366' }}>Group</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 1 }}>
                      Opens WhatsApp group selector
                    </Text>
                  </View>
                </View>

                {isGroupSelected && (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#25D366',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={14} color="#ffffff" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Item 2: Self (You) */}
            {(!searchQuery.trim() || fuzzyMatch('Self (You)', searchQuery) || fuzzyMatch('Self', searchQuery)) && (
              <TouchableOpacity
                onPress={() => {
                  onSelectContact(SELF_USER);
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  marginBottom: 8,
                  backgroundColor: isSelfSelected
                    ? (isDarkMode ? 'rgba(37, 211, 102, 0.15)' : '#f0fdf4')
                    : (isDarkMode ? '#27272a' : '#f8fafc'),
                  borderWidth: isSelfSelected ? 1.5 : 1,
                  borderColor: isSelfSelected ? '#25D366' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: isSelfSelected ? '#25D366' : '#0078d4',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UserIcon size={18} color="#ffffff" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: isDarkMode ? '#ffffff' : '#0f172a',
                        }}
                        numberOfLines={1}
                      >
                        Self (You)
                      </Text>
                      <View
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(0, 120, 212, 0.2)' : '#eff6ff',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#0078d4' }}>
                          You
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 1 }}>
                      Opens WhatsApp chat selector
                    </Text>
                  </View>
                </View>

                {isSelfSelected && (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#25D366',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={14} color="#ffffff" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Individual Contacts from Library */}
            {filteredIndividuals.map((u) => {
              const isSelected = selectedContactId === u.id;

              return (
                <TouchableOpacity
                  key={u.id}
                  onPress={() => {
                    onSelectContact(u);
                    onClose();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    marginBottom: 8,
                    backgroundColor: isSelected
                      ? (isDarkMode ? 'rgba(37, 211, 102, 0.15)' : '#f0fdf4')
                      : (isDarkMode ? '#27272a' : '#f8fafc'),
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? '#25D366' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: isSelected ? '#25D366' : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Phone size={18} color={isSelected ? '#ffffff' : '#0078d4'} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: isDarkMode ? '#ffffff' : '#0f172a',
                        }}
                        numberOfLines={1}
                      >
                        {u.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 1 }}>
                        {u.phone || u.email || 'No phone'}
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: '#25D366',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={14} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
