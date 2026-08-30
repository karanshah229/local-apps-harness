import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Sparkles,
  Calendar,
  Clock,
  ArrowDownAZ,
  Check,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react-native';
import { ViewSortConfig, SortField, SortDirection, DEFAULT_SORT_CONFIG } from '@shared/todo';

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  currentSort: ViewSortConfig;
  onSelectSort: (config: ViewSortConfig) => void;
  isDarkMode: boolean;
  themePrimary: string;
  viewTitle?: string;
}

export function SortModal({
  visible,
  onClose,
  currentSort = DEFAULT_SORT_CONFIG,
  onSelectSort,
  isDarkMode,
  themePrimary,
  viewTitle,
}: SortModalProps) {
  const isSmart = currentSort.field === 'smart';
  const isDueDate = currentSort.field === 'due_date';
  const isCreatedAt = currentSort.field === 'created_at';
  const isTitle = currentSort.field === 'title';

  const handleSelectField = (field: SortField) => {
    if (field === 'smart') {
      onSelectSort({ field: 'smart', direction: 'asc' });
      onClose();
      return;
    }

    if (currentSort.field === field) {
      // Toggle direction if already selected
      const nextDir: SortDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
      onSelectSort({ field, direction: nextDir });
    } else {
      // Set default direction for field
      const defaultDir: SortDirection = field === 'created_at' ? 'desc' : 'asc';
      onSelectSort({ field, direction: defaultDir });
    }
  };

  const handleToggleDirection = (field: SortField, e: any) => {
    e?.stopPropagation?.();
    const nextDir: SortDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
    onSelectSort({ field, direction: nextDir });
  };

  const options: Array<{
    id: SortField;
    title: string;
    description: string;
    icon: any;
    isActive: boolean;
    hasDirection: boolean;
    ascLabel: string;
    descLabel: string;
  }> = [
    {
      id: 'smart',
      title: 'Smart Sort',
      description: 'Overdue → Due in 3 days → Important → Backlog',
      icon: Sparkles,
      isActive: isSmart,
      hasDirection: false,
      ascLabel: '',
      descLabel: '',
    },
    {
      id: 'due_date',
      title: 'Due Date',
      description: isDueDate
        ? (currentSort.direction === 'asc' ? 'Earliest deadline first' : 'Latest deadline first')
        : 'Sort by target completion date',
      icon: Calendar,
      isActive: isDueDate,
      hasDirection: true,
      ascLabel: 'Earliest first',
      descLabel: 'Latest first',
    },
    {
      id: 'created_at',
      title: 'Creation Date',
      description: isCreatedAt
        ? (currentSort.direction === 'desc' ? 'Newest added first' : 'Oldest added first')
        : 'Sort by date task was created',
      icon: Clock,
      isActive: isCreatedAt,
      hasDirection: true,
      ascLabel: 'Oldest first',
      descLabel: 'Newest first',
    },
    {
      id: 'title',
      title: 'Alphabetical',
      description: isTitle
        ? (currentSort.direction === 'asc' ? 'Alphabetical (A to Z)' : 'Reverse alphabetical (Z to A)')
        : 'Sort alphabetically by task title',
      icon: ArrowDownAZ,
      isActive: isTitle,
      hasDirection: true,
      ascLabel: 'A → Z',
      descLabel: 'Z → A',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
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
                paddingTop: 20,
                paddingBottom: Platform.OS === 'ios' ? 36 : 24,
                maxHeight: '80%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              {/* Header handle indicator */}
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                  alignSelf: 'center',
                  marginBottom: 16,
                }}
              />

              {/* Title & Close */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '800',
                      color: isDarkMode ? '#ffffff' : '#0f172a',
                    }}
                  >
                    Sort Tasks
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: isDarkMode ? '#a1a1aa' : '#64748b',
                      marginTop: 2,
                    }}
                  >
                    {viewTitle ? `Organize tasks in ${viewTitle}` : 'Choose how tasks are organized'}
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
                  <X size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 10 }}>
                  {options.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => handleSelectField(opt.id)}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 16,
                          minHeight: 64,
                          borderRadius: 20,
                          backgroundColor: opt.isActive
                            ? (isDarkMode ? 'rgba(255,255,255,0.06)' : '#f8fafc')
                            : (isDarkMode ? '#27272a' : '#f8fafc'),
                          borderWidth: 1.5,
                          borderColor: opt.isActive
                            ? themePrimary
                            : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 8 }}>
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              backgroundColor: opt.isActive
                                ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)')
                                : (isDarkMode ? '#18181b' : '#ffffff'),
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon size={20} color={opt.isActive ? themePrimary : (isDarkMode ? '#a1a1aa' : '#64748b')} />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: opt.isActive ? '800' : '700',
                                color: opt.isActive
                                  ? (isDarkMode ? '#ffffff' : '#0f172a')
                                  : (isDarkMode ? '#d4d4d8' : '#334155'),
                              }}
                            >
                              {opt.title}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: isDarkMode ? '#a1a1aa' : '#64748b',
                                marginTop: 2,
                              }}
                              numberOfLines={1}
                            >
                              {opt.description}
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {opt.isActive && opt.hasDirection && (
                            <TouchableOpacity
                              onPress={(e) => handleToggleDirection(opt.id, e)}
                              activeOpacity={0.7}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 10,
                                backgroundColor: themePrimary,
                              }}
                            >
                              {currentSort.direction === 'asc' ? (
                                <ArrowUp size={13} color="#ffffff" strokeWidth={3} />
                              ) : (
                                <ArrowDown size={13} color="#ffffff" strokeWidth={3} />
                              )}
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>
                                {currentSort.direction === 'asc' ? opt.ascLabel : opt.descLabel}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {opt.isActive && !opt.hasDirection && (
                            <View
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 13,
                                backgroundColor: themePrimary,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Check size={16} color="#ffffff" strokeWidth={3} />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Done button */}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={{
                  marginTop: 18,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: themePrimary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: themePrimary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default SortModal;
