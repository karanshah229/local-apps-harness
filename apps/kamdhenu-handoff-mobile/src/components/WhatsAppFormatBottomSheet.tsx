import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
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
import {
  WhatsAppMessageStyle,
  Task,
  formatSingleTaskMessage,
  formatBatchTasksMessage,
  formatWholeListMessage,
} from '@shared/todo';

export interface WhatsAppFormatOptions {
  includeNotes: boolean;
  includeAssignee: boolean;
  includeImportant: boolean;
  includeSteps: boolean;
  includeDueDate: boolean;
  includeListName: boolean;
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
  includeListName?: boolean;
  onSave: (style: WhatsAppMessageStyle, options: WhatsAppFormatOptions) => void;
  title?: string;
  subtitle?: string;
  isDarkMode?: boolean;
  themePrimary?: string;
  sampleTask?: Task | null;
  confirmLabel?: string;
  listNameLabel?: string;
}

export const WhatsAppFormatBottomSheet: React.FC<WhatsAppFormatBottomSheetProps> = ({
  visible,
  onClose,
  currentStyle = 'executive',
  includeNotes = true,
  includeAssignee = true,
  includeImportant = false,
  includeSteps = true,
  includeDueDate = true,
  includeListName = true,
  onSave,
  title = 'WhatsApp Message Format',
  subtitle = 'Choose how your tasks and lists are styled when shared',
  isDarkMode = false,
  themePrimary = '#0078d4',
  sampleTask,
  listNameLabel = 'List Name',
}) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const previewGap = 12;
  const [previewCarouselWidth, setPreviewCarouselWidth] = useState(Math.max(260, windowWidth - 40));
  const previewCardWidth = Math.max(260, previewCarouselWidth);
  const previewSnapInterval = previewCardWidth + previewGap;
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const activePreviewIndexRef = useRef(0);
  const previewDragStartXRef = useRef(0);
  const previewScrollRef = useRef<any>(null);
  const [previewScrollbars, setPreviewScrollbars] = useState<Record<string, {
    contentHeight: number;
    viewportHeight: number;
    scrollY: number;
  }>>({});
  const [selectedStyle, setSelectedStyle] = useState<WhatsAppMessageStyle>(currentStyle || 'executive');
  const [notesEnabled, setNotesEnabled] = useState<boolean>(includeNotes !== false);
  const [assigneeEnabled, setAssigneeEnabled] = useState<boolean>(includeAssignee !== false);
  const [importantEnabled, setImportantEnabled] = useState<boolean>(includeImportant === true);
  const [stepsEnabled, setStepsEnabled] = useState<boolean>(includeSteps !== false);
  const [dueDateEnabled, setDueDateEnabled] = useState<boolean>(includeDueDate !== false);
  const [listNameEnabled, setListNameEnabled] = useState<boolean>(includeListName !== false);

  useEffect(() => {
    if (visible) {
      setActivePreviewIndex(0);
      activePreviewIndexRef.current = 0;
      setSelectedStyle(currentStyle || 'executive');
      setNotesEnabled(includeNotes !== false);
      setAssigneeEnabled(includeAssignee !== false);
      setImportantEnabled(includeImportant === true);
      setStepsEnabled(includeSteps !== false);
      setDueDateEnabled(includeDueDate !== false);
      setListNameEnabled(includeListName !== false);
    }
  }, [visible, currentStyle, includeNotes, includeAssignee, includeImportant, includeSteps, includeDueDate, includeListName]);

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

  const previewConfig = useMemo(() => ({
    style: selectedStyle,
    includeNotes: notesEnabled,
    includeAssignee: assigneeEnabled,
    includeImportant: importantEnabled,
    includeSteps: stepsEnabled,
    includeDueDate: dueDateEnabled,
    includeListName: listNameEnabled,
  }), [
    selectedStyle,
    notesEnabled,
    assigneeEnabled,
    importantEnabled,
    stepsEnabled,
    dueDateEnabled,
    listNameEnabled,
  ]);

  const previewCards = useMemo(() => {
    const secondSample: Task = {
      ...defaultSample,
      id: defaultSample.id + 1,
      title: 'Inspect 20 crates',
      notes: null,
      is_important: 0,
      is_completed: 1,
      reminder_time: null,
    };
    return [
      {
        label: 'Single Task',
        text: formatSingleTaskMessage(
          defaultSample,
          { name: defaultSample.assignee_name || undefined },
          sampleSubtasks,
          previewConfig
        ),
      },
      {
        label: 'Multiple Tasks',
        text: formatBatchTasksMessage([defaultSample, secondSample], previewConfig),
      },
      {
        label: 'List',
        text: formatWholeListMessage(
          { title: defaultSample.list_title || 'Dairy Ops' },
          [defaultSample, secondSample],
          { ...previewConfig, scope: 'all' }
        ),
      },
    ];
  }, [
    defaultSample,
    sampleSubtasks,
    previewConfig,
  ]);

  const triggerSave = (
    style: WhatsAppMessageStyle,
    notes: boolean,
    assignee: boolean,
    important: boolean,
    steps: boolean,
    dueDate: boolean,
    listName: boolean = listNameEnabled
  ) => {
    onSave(style, {
      includeNotes: notes,
      includeAssignee: assignee,
      includeImportant: important,
      includeSteps: steps,
      includeDueDate: dueDate,
      includeListName: listName,
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
      description: 'Sleek bullets (○, ✓) with compact inline metadata',
      icon: Sparkles,
    },
    {
      id: 'executive',
      label: 'Executive',
      badge: 'DEFAULT',
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
      id: 'listName',
      label: listNameLabel,
      description: `Show the ${listNameLabel === 'View Name' ? 'view' : 'list'} name in the shared message`,
      value: listNameEnabled,
      icon: FileText,
      color: '#14b8a6',
      onToggle: (val: boolean) => {
        setListNameEnabled(val);
        triggerSave(selectedStyle, notesEnabled, assigneeEnabled, importantEnabled, stepsEnabled, dueDateEnabled, val);
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
              onLayout={(event) => {
                const carouselWidth = event.nativeEvent.layout.width;
                if (carouselWidth > 0 && carouselWidth !== previewCarouselWidth) {
                  setPreviewCarouselWidth(carouselWidth);
                }
              }}
              style={{
                height: 228,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
            <ScrollView
              ref={previewScrollRef}
              horizontal
              pagingEnabled
              snapToInterval={previewSnapInterval}
              snapToAlignment="start"
              disableIntervalMomentum
              decelerationRate="normal"
              onScrollBeginDrag={(event) => {
                previewDragStartXRef.current = event.nativeEvent.contentOffset?.x ?? 0;
              }}
              onScrollEndDrag={(event) => {
                const endX = event.nativeEvent.contentOffset?.x ?? previewDragStartXRef.current;
                const delta = endX - previewDragStartXRef.current;
                const direction = delta > 4 ? 1 : delta < -4 ? -1 : 0;
                const targetIndex = Math.min(
                  previewCards.length - 1,
                  Math.max(0, activePreviewIndexRef.current + direction)
                );
                activePreviewIndexRef.current = targetIndex;
                setActivePreviewIndex(targetIndex);
                previewScrollRef.current?.scrollTo({
                  x: targetIndex * previewSnapInterval,
                  animated: true,
                });
              }}
              onMomentumScrollEnd={(event) => {
                const targetIndex = activePreviewIndexRef.current;
                if (Math.abs(event.nativeEvent.contentOffset.x - targetIndex * previewSnapInterval) > 1) {
                  previewScrollRef.current?.scrollTo({
                    x: targetIndex * previewSnapInterval,
                    animated: false,
                  });
                }
              }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 0 }}
              style={{
                height: 228,
              }}
            >
              {previewCards.map((card) => (
                <View
                  key={card.label}
                  style={{
                    width: previewCardWidth,
                    height: 228,
                    marginRight: previewGap,
                    backgroundColor: isDarkMode ? '#09090b' : '#f1f5f9',
                    padding: 14,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: themePrimary, textTransform: 'uppercase', marginBottom: 8 }}>
                    {card.label}
                  </Text>
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    persistentScrollbar
                    scrollEventThrottle={16}
                    onLayout={(event) => {
                      const viewportHeight = event.nativeEvent.layout.height;
                      setPreviewScrollbars((current) => ({
                        ...current,
                        [card.label]: {
                          ...(current[card.label] || { contentHeight: 0, scrollY: 0 }),
                          viewportHeight,
                        },
                      }));
                    }}
                    onContentSizeChange={(_, contentHeight) => {
                      setPreviewScrollbars((current) => ({
                        ...current,
                        [card.label]: {
                          ...(current[card.label] || { viewportHeight: 0, scrollY: 0 }),
                          contentHeight,
                        },
                      }));
                    }}
                    onScroll={(event) => {
                      const scrollY = event.nativeEvent.contentOffset?.y ?? 0;
                      setPreviewScrollbars((current) => ({
                        ...current,
                        [card.label]: {
                          ...(current[card.label] || { contentHeight: 0, viewportHeight: 0 }),
                          scrollY,
                        },
                      }));
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
                      {card.text}
                    </Text>
                  </ScrollView>
                  {(() => {
                    const metrics = previewScrollbars[card.label];
                    if (!metrics || metrics.contentHeight <= metrics.viewportHeight) return null;
                    const trackHeight = 178;
                    const thumbHeight = Math.max(30, trackHeight * (metrics.viewportHeight / metrics.contentHeight));
                    const maxThumbTop = trackHeight - thumbHeight;
                    const maxScrollTop = metrics.contentHeight - metrics.viewportHeight;
                    const thumbTop = maxScrollTop > 0
                      ? Math.min(maxThumbTop, Math.max(0, (metrics.scrollY / maxScrollTop) * maxThumbTop))
                      : 0;
                    return (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 40,
                        right: 12,
                        bottom: 10,
                        width: 6,
                        borderRadius: 2,
                        backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1',
                      }}
                      >
                        <View
                          style={{
                            width: 6,
                          height: thumbHeight,
                          transform: [{ translateY: thumbTop }],
                          borderRadius: 2,
                          backgroundColor: themePrimary,
                        }}
                      />
                    </View>
                    );
                  })()}
                </View>
              ))}
            </ScrollView>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, height: 22, marginBottom: 16 }}>
              {previewCards.map((card, index) => (
                <View
                  key={card.label}
                  style={{
                    width: activePreviewIndex === index ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: activePreviewIndex === index ? themePrimary : (isDarkMode ? '#52525b' : '#cbd5e1'),
                  }}
                />
              ))}
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
