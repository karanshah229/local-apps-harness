import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ListTodo,
  Pencil,
  Palette,
  Trash2,
  Pin,
  PinOff,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { WhatsAppIcon } from './WhatsAppIcon';
import { getThemePrimary, List, CustomView, User } from '@shared/todo';

export interface ListOrViewDropdownModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'list' | 'view';
  item: {
    id: number;
    title: string;
    color_theme?: string;
    default_whatsapp_contact_id?: number | null;
    default_whatsapp_share_scope?: string | null;
  } | null;
  users: User[];
  isPinned: boolean;
  isDarkMode: boolean;
  topOffset?: number;
  onOpenContactPicker: () => void;
  onOpenScopePicker: () => void;
  onOpenFormatPicker?: () => void;
  onTogglePin: () => void;
  onRename: () => void;
  onChangeTheme: () => void;
  onDelete: () => void;
}

export function ListOrViewDropdownModal({
  visible,
  onClose,
  targetType,
  item,
  users,
  isPinned,
  isDarkMode,
  topOffset,
  onOpenContactPicker,
  onOpenScopePicker,
  onOpenFormatPicker,
  onTogglePin,
  onRename,
  onChangeTheme,
  onDelete,
}: ListOrViewDropdownModalProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  if (!item) return null;

  const themePrimary = getThemePrimary(item.color_theme || 'teal', isDarkMode);

  const defaultContactTitle = item.default_whatsapp_contact_id === -1
    ? 'WhatsApp Group'
    : item.default_whatsapp_contact_id === 1
    ? 'Self (You)'
    : item.default_whatsapp_contact_id
    ? (users.find((u) => u.id === item.default_whatsapp_contact_id)?.name || 'Contact')
    : null;

  const scopeLabel = item.default_whatsapp_share_scope === 'all'
    ? 'All Tasks'
    : item.default_whatsapp_share_scope === 'current_view'
    ? 'Current View'
    : item.default_whatsapp_share_scope === 'pending'
    ? 'Pending Tasks'
    : 'Not set (Ask on send)';

  const styleLabel = (item as any).whatsapp_message_style === 'executive'
    ? 'Executive'
    : (item as any).whatsapp_message_style === 'crisp'
    ? 'Crisp'
    : 'Modern (Default)';

  const calculatedPaddingTop = topOffset !== undefined
    ? Math.max(topInset + 40, Math.min(topOffset - 10, 480))
    : topInset + 56;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          paddingTop: calculatedPaddingTop,
          paddingRight: 16,
          alignItems: 'flex-end',
        }}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={{
            width: 230,
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            borderRadius: 18,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          {/* Option 1: WhatsApp Contact */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              onOpenContactPicker();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
            activeOpacity={0.7}
          >
            <WhatsAppIcon size={18} color="#25D366" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                WhatsApp Contact
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: defaultContactTitle ? '#25D366' : (isDarkMode ? '#71717a' : '#94a3b8'),
                  fontWeight: defaultContactTitle ? '700' : '600',
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {defaultContactTitle || 'Not set'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginVertical: 2 }} />

          {/* Option 2: Tasks to Send */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              onOpenScopePicker();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
            activeOpacity={0.7}
          >
            <ListTodo size={18} color="#0078d4" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                Tasks to Send
              </Text>
              <Text style={{ fontSize: 11, color: '#0078d4', fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
                {scopeLabel}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginVertical: 2 }} />

          {/* Option 2.5: WhatsApp Message Format */}
          {onOpenFormatPicker && (
            <>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onOpenFormatPicker();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
                activeOpacity={0.7}
              >
                <Sparkles size={18} color="#8b5cf6" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                    Message Format
                  </Text>
                  <Text style={{ fontSize: 11, color: '#8b5cf6', fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
                    {styleLabel}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginVertical: 2 }} />
            </>
          )}

          {/* Option 3: Pin / Unpin from Bottom Bar */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              onTogglePin();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
            activeOpacity={0.7}
          >
            {isPinned ? (
              <PinOff size={18} color="#ef4444" />
            ) : (
              <Pin size={18} color={themePrimary} />
            )}
            <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
              {isPinned ? 'Unpin from Bottom Bar' : 'Pin to Bottom Bar'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginVertical: 2 }} />

          {/* Option 4: Rename */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              onRename();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
            activeOpacity={0.7}
          >
            <Pencil size={18} color={themePrimary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
              {targetType === 'view' ? 'Rename View' : 'Rename List'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginVertical: 2 }} />

          {/* Option 5: Change Theme */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              onChangeTheme();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
            activeOpacity={0.7}
          >
            <Palette size={18} color={themePrimary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
              Change Theme
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginVertical: 2 }} />

          {/* Option 6: Delete */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              onDelete();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color="#ef4444" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>
              {targetType === 'view' ? 'Delete View' : 'Delete List'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
