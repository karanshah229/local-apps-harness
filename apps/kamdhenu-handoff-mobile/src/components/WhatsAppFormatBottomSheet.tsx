import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Sparkles,
  Check,
  FileText,
  CheckSquare,
  MessageSquare,
  Eye,
  User as UserIcon,
  Star,
  Calendar,
} from 'lucide-react-native';
import { WhatsAppMessageStyle, Task, formatSingleTaskMessage } from '@shared/todo';

export interface WhatsAppFormatOptions {
  includeNotes: boolean;
  includeAssignee: boolean;
  includeImportant: boolean;
  includeSteps: boolean;
  includeDueDate: boolean;
}

interface WhatsAppFormatBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  currentStyle?: WhatsAppMessageStyle;
  includeNotes?: boolean;
  includeAssignee?: boolean;
  includeImportant?: boolean;
  includeSteps?: boolean;
  includeDueDate?: boolean;
  onSave: (style: WhatsAppMessageStyle, options: WhatsAppFormatOptions) => void;
  title?: string;
  subtitle?: string;
  isDarkMode?: boolean;
  themePrimary?: string;
  sampleTask?: Task | null;
  confirmLabel?: string;
}

export const WhatsAppFormatBottomSheet: React.FC<WhatsAppFormatBottomSheetProps> = ({
  visible,
  onClose,
  currentStyle = 'modern',
  includeNotes = true,
  includeAssignee = true,
  includeImportant = true,
  includeSteps = true,
  includeDueDate = true,
  onSave,
  title = 'WhatsApp Message Format',
  subtitle = 'Choose how your tasks and lists are styled when shared',
  isDarkMode = false,
  themePrimary = '#0078d4',
  sampleTask,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedStyle, setSelectedStyle] = useState<WhatsAppMessageStyle>(currentStyle || 'modern');
  const [notesEnabled, setNotesEnabled] = useState<boolean>(includeNotes !== false);
  const [assigneeEnabled, setAssigneeEnabled] = useState<boolean>(includeAssignee !== false);
  const [importantEnabled, setImportantEnabled] = useState<boolean>(includeImportant !== false);
  const [stepsEnabled, setStepsEnabled] = useState<boolean>(includeSteps !== false);
  const [dueDateEnabled, setDueDateEnabled] = useState<boolean>(includeDueDate !== false);

  useEffect(() => {
    if (visible) {
      setSelectedStyle(currentStyle || 'modern');
      setNotesEnabled(includeNotes !== false);
      setAssigneeEnabled(includeAssignee !== false);
      setImportantEnabled(includeImportant !== false);
      setStepsEnabled(includeSteps !== false);
      setDueDateEnabled(includeDueDate !== false);
    }
  }, [visible, currentStyle, includeNotes, includeAssignee, includeImportant, includeSteps, includeDueDate]);

  const defaultSample: Task = useMemo(() => {
    if (sampleTask) return sampleTask;
    return {
      id: 999,
      title: 'Review milk shipment batch',
      notes: 'Check temperature logs before unloading',
      is_completed: 0,
      is_important: 1,
      due_date: new Date().toISOString().split('T')[0],
      reminder_time: '10:30 AM',
      list_title: 'Dairy Ops',
      assignee_name: 'Ramesh Patel',
      assigned_to_user_id: 2,
      active: 1,
    };
  }, [sampleTask]);

  const sampleSubtasks = useMemo(() => [
    { id: 1, task_id: defaultSample.id, title: 'Verify gate pass', is_completed: 1, active: 1 },
    { id: 2, task_id: defaultSample.id, title: 'Inspect 20 crates', is_completed: 0, active: 1 },
  ], [defaultSample.id]);

  const previewText = useMemo(() => {
    return formatSingleTaskMessage(
      defaultSample,
      { name: defaultSample.assignee_name || undefined },
      sampleSubtasks,
      {
        style: selectedStyle,
        includeNotes: notesEnabled,
        includeAssignee: assigneeEnabled,
        includeImportant: importantEnabled,
        includeSteps: stepsEnabled,
        includeDueDate: dueDateEnabled,
      }
    );
  }, [
    defaultSample,
    sampleSubtasks,
    selectedStyle,
    notesEnabled,
    assigneeEnabled,
    importantEnabled,
    stepsEnabled,
    dueDateEnabled,
  ]);

  const triggerSave = (
    style: WhatsAppMessageStyle,
    notes: boolean,
    assignee: boolean,
    important: boolean,
    steps: boolean,
    dueDate: boolean
  ) => {
    onSave(style, {
      includeNotes: notes,
      includeAssignee: assignee,
      includeImportant: important,
      includeSteps: steps,
      includeDueDate: dueDate,
    });
  };

  const stylesList: Array<{
    id: WhatsAppMessageStyle;
    label: string;
    badge?: string;
    description: string;
    icon: typeof Sparkles;
  }> = [
    {
      id: 'modern',
      label: 'Modern',
      badge: 'DEFAULT',
      description: 'Sleek bullets (○, ✓) with compact inline metadata',
      icon: Sparkles,
    },
    {
      id: 'executive',
      label: 'Executive',
      description: 'Structured layout with header bar and [ ] checkboxes',
      icon: FileText,
    },
    {
      id: 'crisp',
      label: 'Crisp',
      description: 'Emoji checkboxes (◻️, ✅) with clean aligned tags',
      icon: CheckSquare,
    },
  ];

  const fieldInclusions = [
    {
      id: 'assignee',
      label: 'Assignee',
      description: 'Assigned team member (ignored for self or group)',
      value: assigneeEnabled,
      icon: UserIcon,
      color: '#3b82f6',
      onToggle: (val: boolean) => {
        setAssigneeEnabled(val);
        triggerSave(selectedStyle, notesEnabled, val, importantEnabled, stepsEnabled, dueDateEnabled);
      },
    },
    {
      id: 'important',
      label: '(Important) Tag',
      description: 'Add (Important) in brackets after high-priority tasks',
      value: importantEnabled,
      icon: Star,
      color: '#eab308',
      onToggle: (val: boolean) => {
        setImportantEnabled(val);
        triggerSave(selectedStyle, notesEnabled, assigneeEnabled, val, stepsEnabled, dueDateEnabled);
      },
    },
    {
      id: 'steps',
      label: 'Steps & Subtasks',
      description: 'Show subtask checklist items and progress counts',
      value: stepsEnabled,
      icon: CheckSquare,
      color: '#10b981',
      onToggle: (val: boolean) => {
        setStepsEnabled(val);
        triggerSave(selectedStyle, notesEnabled, assigneeEnabled, importantEnabled, val, dueDateEnabled);
      },
    },
    {
      id: 'dueDate',
      label: 'Due Date & Time',
      description: 'Show scheduled due dates and reminder timings',
      value: dueDateEnabled,
      icon: Calendar,
      color: '#f97316',
      onToggle: (val: boolean) => {
        setDueDateEnabled(val);
        triggerSave(selectedStyle, notesEnabled, assigneeEnabled, importantEnabled, stepsEnabled, val);
      },
    },
    {
      id: 'notes',
      label: 'Task Notes',
      description: 'Notes and descriptions in the shared message',
      value: notesEnabled,
      icon: MessageSquare,
      color: '#25D366',
      onToggle: (val: boolean) => {
        setNotesEnabled(val);
        triggerSave(selectedStyle, val, assigneeEnabled, importantEnabled, stepsEnabled, dueDateEnabled);
      },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={{
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '90%',
            paddingBottom: Math.max(insets.bottom, 24),
            borderTopWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? '#27272a' : '#f1f5f9',
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                {title}
              </Text>
              <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                {subtitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ padding: 4 }}
            >
              <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingHorizontal: 20, paddingTop: 14 }} showsVerticalScrollIndicator={false}>
            {/* Section 1: Style Selection */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: isDarkMode ? '#a1a1aa' : '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              Message Style System
            </Text>

            <View style={{ gap: 8, marginBottom: 16 }}>
              {stylesList.map((item) => {
                const isSelected = selectedStyle === item.id;
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      setSelectedStyle(item.id);
                      triggerSave(
                        item.id,
                        notesEnabled,
                        assigneeEnabled,
                        importantEnabled,
                        stepsEnabled,
                        dueDateEnabled
                      );
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: isSelected
                        ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                        : (isDarkMode ? '#27272a' : '#f8fafc'),
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? themePrimary : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: isSelected ? themePrimary : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconComponent size={18} color={isSelected ? '#ffffff' : (isDarkMode ? '#a1a1aa' : '#64748b')} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: '700',
                              color: isSelected ? (isDarkMode ? '#ffffff' : '#0f172a') : (isDarkMode ? '#e4e4e7' : '#334155'),
                            }}
                          >
                            {item.label}
                          </Text>
                          {item.badge && (
                            <View style={{ backgroundColor: 'rgba(0, 120, 212, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: themePrimary }}>{item.badge}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                          {item.description}
                        </Text>
                      </View>
                    </View>

                    {isSelected && (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: themePrimary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={14} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Section 2: Live Preview Card */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Eye size={14} color={themePrimary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: isDarkMode ? '#a1a1aa' : '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Live Preview ({selectedStyle.toUpperCase()})
              </Text>
            </View>

            <View
              style={{
                backgroundColor: isDarkMode ? '#09090b' : '#f1f5f9',
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12.5,
                  lineHeight: 19,
                  color: isDarkMode ? '#22c55e' : '#0f766e',
                }}
              >
                {previewText}
              </Text>
            </View>

            {/* Section 3: Task Fields Toggles */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: isDarkMode ? '#a1a1aa' : '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              Task Fields
            </Text>

            <View style={{ gap: 8, marginBottom: 20 }}>
              {fieldInclusions.map((field) => {
                const IconComp = field.icon;
                return (
                  <View
                    key={field.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 16,
                      backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: field.value
                            ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9')
                            : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconComp size={18} color={field.value ? field.color : (isDarkMode ? '#a1a1aa' : '#64748b')} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                          {field.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                          {field.description}
                        </Text>
                      </View>
                    </View>

                    <Switch
                      value={field.value}
                      onValueChange={field.onToggle}
                      trackColor={{ false: isDarkMode ? '#3f3f46' : '#cbd5e1', true: themePrimary }}
                      thumbColor="#ffffff"
                    />
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
