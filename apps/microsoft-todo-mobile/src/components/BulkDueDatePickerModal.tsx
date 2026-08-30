import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import { Calendar, X, Sun, Sunrise, CalendarDays, Ban } from 'lucide-react-native';

interface BulkDueDatePickerModalProps {
  visible: boolean;
  selectedCount: number;
  isDarkMode: boolean;
  themePrimary: string;
  onClose: () => void;
  onSelectDueDate: (dateStr: string | null) => void;
}

export const BulkDueDatePickerModal = ({
  visible,
  selectedCount,
  isDarkMode,
  themePrimary,
  onClose,
  onSelectDueDate,
}: BulkDueDatePickerModalProps) => {
  const [customDate, setCustomDate] = useState('');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Next Monday
  const nextMonday = new Date();
  const day = nextMonday.getDay();
  const diff = nextMonday.getDate() + (day === 0 ? 1 : 8 - day);
  nextMonday.setDate(diff);
  const nextMondayStr = nextMonday.toISOString().split('T')[0];

  const handleCustomApply = () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(customDate.trim())) {
      onSelectDueDate(customDate.trim());
      setCustomDate('');
      onClose();
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
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                borderRadius: 24,
                padding: 20,
                borderWidth: 1,
                borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                    Assign Due Date
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

              {/* Quick Presets */}
              <View style={{ gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => { onSelectDueDate(todayStr); onClose(); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Sun size={18} color="#0284c7" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#f4f4f5' : '#0f172a' }}>
                      Today
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                    {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { onSelectDueDate(tomorrowStr); onClose(); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Sunrise size={18} color="#ea580c" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#f4f4f5' : '#0f172a' }}>
                      Tomorrow
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                    {tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { onSelectDueDate(nextMondayStr); onClose(); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <CalendarDays size={18} color="#7c3aed" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#f4f4f5' : '#0f172a' }}>
                      Next Week
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b' }}>
                    {nextMonday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { onSelectDueDate(null); onClose(); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ban size={18} color="#ef4444" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#ef4444' }}>
                      No Due Date (Clear)
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Custom Date Input */}
              <View style={{ borderTopWidth: 1, borderTopColor: isDarkMode ? '#27272a' : '#e2e8f0', paddingTop: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#a1a1aa' : '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Or Custom Date (YYYY-MM-DD)
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    placeholder="2026-09-15"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                    value={customDate}
                    onChangeText={setCustomDate}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: 12,
                      backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                      paddingHorizontal: 12,
                      fontSize: 14,
                      fontWeight: '600',
                      color: isDarkMode ? '#ffffff' : '#0f172a',
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleCustomApply}
                    disabled={!/^\d{4}-\d{2}-\d{2}$/.test(customDate.trim())}
                    style={{
                      height: 46,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: /^\d{4}-\d{2}-\d{2}$/.test(customDate.trim()) ? themePrimary : (isDarkMode ? '#3f3f46' : '#cbd5e1'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                      Set
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
