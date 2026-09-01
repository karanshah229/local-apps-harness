import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  Modal,
  PanResponder,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Trash2,
  CheckSquare,
  Square,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Send,
  FileText,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  ListTodo,
  Search,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { Task, Subtask, User, List } from '@shared/todo';
import { lightColors, darkColors } from '../theme/colors';
import { fontSizes } from '../theme/typography';
import { getTaskAutosaveLabel, useThrottledTaskAutosave } from '../hooks/useThrottledTaskAutosave';
import { WhatsAppIcon } from './WhatsAppIcon';
import { useUiStore } from '../store/useUiStore';

interface TaskDetailDrawerProps {
  task: Task | null;
  users: User[];
  lists?: List[];
  onClose: () => void;
  onUpdateTask: (updates: Partial<Task> & { id: number }) => Promise<unknown> | unknown;
  onCreateTask?: (taskData: any) => Promise<any>;
  onDeleteTask: (taskId: number) => void;
  onOpenWhatsAppModal: (config: any) => void;
  subtasks: Subtask[];
  onCreateSubtask: (taskId: number, title: string) => void;
  onToggleSubtask: (subtask: Subtask) => void;
  onUpdateSubtask?: (subtaskId: number, title: string) => void;
  onDeleteSubtask: (subtaskId: number) => void;
  isDarkMode: boolean;
}

export default function TaskDetailDrawer({
  task,
  users,
  lists = [],
  onClose,
  onUpdateTask,
  onCreateTask,
  onDeleteTask,
  onOpenWhatsAppModal,
  subtasks,
  onCreateSubtask,
  onToggleSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  isDarkMode
}: TaskDetailDrawerProps) {
  const isDraft = !task || !task.id || task.id <= 0;

  const [titleValue, setTitleValue] = useState('');
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [newStepTitle, setNewStepTitle] = useState('');

  // Draft-specific states
  const [draftSubtasks, setDraftSubtasks] = useState<Array<{ id: number; title: string; is_completed: number }>>([]);
  const [draftListIds, setDraftListIds] = useState<number[]>([]);
  const [draftAssigneeId, setDraftAssigneeId] = useState<number | null>(null);
  const [draftDueDate, setDraftDueDate] = useState<string | null>(null);
  const [draftReminderTime, setDraftReminderTime] = useState<string | null>(null);
  const [draftIsImportant, setDraftIsImportant] = useState<number>(0);
  const [draftIsCompleted, setDraftIsCompleted] = useState<number>(0);

  // Modals
  const [showListsModal, setShowListsModal] = useState(false);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showReminderPickerModal, setShowReminderPickerModal] = useState(false);

  // Calendar Picker State
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Custom Time State for Reminder
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('AM');

  const colors = isDarkMode ? darkColors : lightColors;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (task) {
      setTitleValue(task.title || '');
      setNotesValue(task.notes || '');
      const rawListIds = Array.isArray(task.list_ids) && task.list_ids.length > 0
        ? task.list_ids
        : (Array.isArray(task.lists) && task.lists.length > 0
            ? task.lists.map((l: any) => l.id)
            : (task.list_id ? [task.list_id] : []));
      setDraftListIds(rawListIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0));
      setDraftAssigneeId(task.assigned_to_user_id ? Number(task.assigned_to_user_id) : null);
      setDraftDueDate(task.due_date || null);
      setDraftReminderTime(task.reminder_time || null);
      setDraftIsImportant(task.is_important ? 1 : 0);
      setDraftIsCompleted(task.is_completed ? 1 : 0);
      setDraftSubtasks([]);
      if (task.due_date) {
        const parsed = new Date(task.due_date);
        if (!isNaN(parsed.getTime())) setCalendarDate(parsed);
      }
    }
  }, [task?.id, JSON.stringify(task?.list_ids || task?.lists || task?.list_id)]);

  const saveExistingTask = useCallback(async (updates: Partial<Task> & { id: number }) => {
    const result = await onUpdateTask(updates);
    if (result === null || result === false) throw new Error('Task update failed');
    return result;
  }, [onUpdateTask]);
  const {
    status: autosaveStatus,
    isSlowSaving,
    feedbackType,
    showFeedback,
    queueSave,
    flush: flushAutosave,
  } = useThrottledTaskAutosave({
    taskId: task?.id || null,
    enabled: !isDraft,
    save: saveExistingTask,
  });

  if (!task) return null;

  const allKnownLists = useMemo(() => {
    const listMap = new Map<number, List>();
    lists.forEach((l) => listMap.set(Number(l.id), l));
    if (task && Array.isArray(task.lists)) {
      task.lists.forEach((l: any) => listMap.set(Number(l.id), l));
    }
    return Array.from(listMap.values());
  }, [lists, task]);

  const effectiveListIds = useMemo(() => {
    if (isDraft) return draftListIds;
    if (!task) return [];
    if (Array.isArray(task.list_ids) && task.list_ids.length > 0) return task.list_ids;
    if (Array.isArray(task.lists) && task.lists.length > 0) return task.lists.map((l: any) => Number(l.id));
    if (task.list_id) return [Number(task.list_id)];
    return [];
  }, [isDraft, draftListIds, task]);

  const effectiveAssigneeId = isDraft ? draftAssigneeId : task?.assigned_to_user_id;
  const effectiveDueDate = isDraft ? draftDueDate : task?.due_date;
  const effectiveReminderTime = isDraft ? draftReminderTime : task?.reminder_time;
  const isDone = Boolean(isDraft ? draftIsCompleted : task?.is_completed);
  const isStarred = Boolean(isDraft ? draftIsImportant : task?.is_important);
  const isOverdue = Boolean(
    effectiveDueDate &&
      !isDone &&
      new Date(effectiveDueDate) < new Date(new Date().setHours(0, 0, 0, 0))
  );
  const effectiveLists = allKnownLists.filter((l) => effectiveListIds.includes(Number(l.id)));
  const effectiveSubtasks = isDraft ? draftSubtasks : subtasks;
  const completedStepsCount = effectiveSubtasks.filter((s) => Boolean(s.is_completed)).length;
  const assignedUser = users.find((u) => u.id === effectiveAssigneeId);

  const handleSaveDraft = async () => {
    if (!titleValue.trim()) {
      onClose();
      return;
    }
    if (onCreateTask) {
      await onCreateTask({
        title: titleValue.trim(),
        notes: notesValue.trim() || null,
        is_important: draftIsImportant,
        is_completed: draftIsCompleted,
        due_date: draftDueDate,
        reminder_time: draftReminderTime,
        assigned_to_user_id: draftAssigneeId,
        list_ids: draftListIds,
        draft_subtasks: draftSubtasks.map((s) => s.title)
      });
    }
    onClose();
  };

  const handleTitleChange = (value: string) => {
    setTitleValue(value);
    if (!isDraft && value.trim()) queueSave({ title: value.trim() });
  };

  const handleNotesChange = (value: string) => {
    setNotesValue(value);
    if (!isDraft) queueSave({ notes: value || null });
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    if (isDraft) {
      setDraftSubtasks((prev) => [...prev, { id: Date.now(), title: newStepTitle.trim(), is_completed: 0 }]);
    } else {
      onCreateSubtask(task!.id, newStepTitle.trim());
    }
    setNewStepTitle('');
  };

  const handleToggleStep = (step: any) => {
    if (isDraft) {
      setDraftSubtasks((prev) =>
        prev.map((s) => (s.id === step.id ? { ...s, is_completed: s.is_completed ? 0 : 1 } : s))
      );
    } else {
      onToggleSubtask(step);
    }
  };

  const handleUpdateStepTitle = (stepId: number, title: string) => {
    if (isDraft) {
      setDraftSubtasks((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, title } : s))
      );
    } else if (onUpdateSubtask) {
      onUpdateSubtask(stepId, title);
    }
  };

  const handleDeleteStep = (stepId: number) => {
    if (isDraft) {
      setDraftSubtasks((prev) => prev.filter((s) => s.id !== stepId));
    } else {
      onDeleteSubtask(stepId);
    }
  };

  const handleToggleComplete = () => {
    const nextValue = draftIsCompleted ? 0 : 1;
    setDraftIsCompleted(nextValue);
    if (!isDraft) queueSave({ is_completed: nextValue });
  };

  const handleToggleImportant = () => {
    const nextValue = draftIsImportant ? 0 : 1;
    setDraftIsImportant(nextValue);
    if (!isDraft) queueSave({ is_important: nextValue });
  };

  const showConfirmDialog = useUiStore((s) => s.showConfirmDialog);

  const confirmDelete = () => {
    if (isDraft) {
      onClose();
      return;
    }
    showConfirmDialog({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"?`,
      type: 'danger',
      confirmLabel: 'Delete Task',
      onConfirm: () => onDeleteTask(task.id),
    });
  };

  // Date helper formatting
  const formatDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDueDate = (dateStr: string | null): string => {
    if (!dateStr) return 'No due date (Tap to set)';
    try {
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(d);
        target.setHours(0, 0, 0, 0);
        const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const formatted = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        if (diffDays === 0) return `Today (${formatted})`;
        if (diffDays === 1) return `Tomorrow (${formatted})`;
        if (diffDays === -1) return `Yesterday (${formatted})`;
        return formatted;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatDisplayReminder = (reminderStr: string | null): string => {
    if (!reminderStr) return 'No reminder set (Tap to set)';
    try {
      const cleaned = reminderStr.replace(' ', 'T');
      const d = new Date(cleaned);
      if (isNaN(d.getTime())) return reminderStr;
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      const timeStr = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const dateStr = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      return isToday ? `Today at ${timeStr}` : `${dateStr} at ${timeStr}`;
    } catch {
      return reminderStr;
    }
  };

  const formatTimeString = (hour24: number, min: number): string => {
    return `${String(hour24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  // Date Presets
  const setQuickDueDate = (type: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
    let dateStr: string | null = null;
    if (type !== 'clear') {
      const d = new Date();
      if (type === 'tomorrow') {
        d.setDate(d.getDate() + 1);
      } else if (type === 'nextWeek') {
        const day = d.getDay();
        const diff = d.getDate() + (day === 0 ? 1 : 8 - day); // Next Monday
        d.setDate(diff);
      }
      dateStr = formatDateString(d);
    }
    if (isDraft) {
      setDraftDueDate(dateStr);
    } else {
      setDraftDueDate(dateStr);
      queueSave({ due_date: dateStr });
    }
    setShowDatePickerModal(false);
  };

  // Reminder Presets
  const setQuickReminder = (preset: 'laterToday' | 'tomorrowMorning' | 'tomorrowEvening' | 'nextWeek' | 'clear') => {
    let dtString: string | null = null;
    if (preset !== 'clear') {
      const d = new Date();
      if (preset === 'laterToday') {
        d.setHours(18, 0, 0, 0);
      } else if (preset === 'tomorrowMorning') {
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
      } else if (preset === 'tomorrowEvening') {
        d.setDate(d.getDate() + 1);
        d.setHours(18, 0, 0, 0);
      } else if (preset === 'nextWeek') {
        const day = d.getDay();
        const diff = d.getDate() + (day === 0 ? 1 : 8 - day);
        d.setDate(diff);
        d.setHours(9, 0, 0, 0);
      }
      dtString = `${formatDateString(d)} ${formatTimeString(d.getHours(), d.getMinutes())}`;
    }

    if (isDraft) {
      setDraftReminderTime(dtString);
    } else {
      setDraftReminderTime(dtString);
      queueSave({ reminder_time: dtString });
    }
    setShowReminderPickerModal(false);
  };

  // Calendar calculation
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Sun
  const monthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  };
  const nextMonth = () => {
    setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));
  };

  const handleSelectCalendarDay = (day: number) => {
    const d = new Date(calendarYear, calendarMonth, day);
    const dateStr = formatDateString(d);
    if (isDraft) {
      setDraftDueDate(dateStr);
    } else {
      setDraftDueDate(dateStr);
      queueSave({ due_date: dateStr });
    }
    setShowDatePickerModal(false);
  };

  const handleSaveCustomReminder = () => {
    let hourNum = parseInt(selectedHour, 10);
    if (selectedAmPm === 'PM' && hourNum < 12) hourNum += 12;
    if (selectedAmPm === 'AM' && hourNum === 12) hourNum = 0;

    const minNum = parseInt(selectedMinute, 10);
    const dateStr = effectiveDueDate || formatDateString(new Date());
    const dtString = `${dateStr} ${formatTimeString(hourNum, minNum)}`;
    if (isDraft) {
      setDraftReminderTime(dtString);
    } else {
      setDraftReminderTime(dtString);
      queueSave({ reminder_time: dtString });
    }
    setShowReminderPickerModal(false);
  };

  const handleToggleList = (listId: number) => {
    const numId = Number(listId);
    const currentIds = (draftListIds || []).map((id) => Number(id));
    const updatedIds = currentIds.includes(numId)
      ? currentIds.filter((id) => id !== numId)
      : [...currentIds, numId];

    setDraftListIds(updatedIds);
    if (!isDraft && task && task.id > 0) {
      queueSave({ list_ids: updatedIds, list_id: updatedIds[0] || null });
    }
  };

  const handleSelectAssignee = (userId: number | null) => {
    setDraftAssigneeId(userId);
    if (!isDraft) queueSave({ assigned_to_user_id: userId });
    setShowAssigneeModal(false);
    setAssigneeSearchQuery('');
  };

// Safe dynamic lookup to prevent Metro bundling crash if unlinked
const getNativeAndroidDateTimePicker = () => {
  try {
    const mod = require('@react-native-community/datetimepicker');
    return mod?.DateTimePickerAndroid || null;
  } catch {
    return null;
  }
};

  // Launch Default Android Material DatePicker Dialog
  const handleOpenDueDate = () => {
    const androidPicker = Platform.OS === 'android' ? getNativeAndroidDateTimePicker() : null;
    if (androidPicker) {
      let currentDate = new Date();
      if (effectiveDueDate) {
        const parsed = new Date(effectiveDueDate);
        if (!isNaN(parsed.getTime())) currentDate = parsed;
      }

      androidPicker.open({
        value: currentDate,
        onChange: (event: any, selectedDate?: Date) => {
          if (event.type === 'set' && selectedDate) {
            const dateStr = formatDateString(selectedDate);
            if (isDraft) {
              setDraftDueDate(dateStr);
            } else {
              setDraftDueDate(dateStr);
              queueSave({ due_date: dateStr });
            }
          }
        },
        mode: 'date',
        display: 'default'
      });
    } else {
      setShowDatePickerModal(true);
    }
  };

  // Launch Default Android Material TimePicker / DateTime Dialog
  const handleOpenReminderTime = () => {
    const androidPicker = Platform.OS === 'android' ? getNativeAndroidDateTimePicker() : null;
    if (androidPicker) {
      let currentDate = new Date();
      if (effectiveReminderTime) {
        const parsed = new Date(effectiveReminderTime.replace(' ', 'T'));
        if (!isNaN(parsed.getTime())) currentDate = parsed;
      }

      androidPicker.open({
        value: currentDate,
        onChange: (event: any, selectedDate?: Date) => {
          if (event.type === 'set' && selectedDate) {
            const dtString = `${formatDateString(selectedDate)} ${formatTimeString(selectedDate.getHours(), selectedDate.getMinutes())}`;
            if (isDraft) {
              setDraftReminderTime(dtString);
            } else {
              setDraftReminderTime(dtString);
              queueSave({ reminder_time: dtString });
            }
          }
        },
        mode: 'time',
        is24Hour: false,
        display: 'default'
      });
    } else {
      setShowReminderPickerModal(true);
    }
  };

  // Swipe right gesture to dismiss drawer
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Detect horizontal swipe from left to right
          return gestureState.dx > 25 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 70 || (gestureState.dx > 25 && gestureState.vx > 0.3)) {
            if (isDraft) {
              handleSaveDraft();
            } else {
              void flushAutosave().finally(onClose);
            }
          }
        }
      }),
    [onClose, isDraft, titleValue, draftIsImportant, draftIsCompleted, draftDueDate, draftReminderTime, draftAssigneeId, draftListIds, draftSubtasks, notesValue, flushAutosave]
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 12)
        }
      ]}
    >
      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: colors.card, borderBottomColor: colors.border }
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (isDraft) {
              handleSaveDraft();
            } else {
              void flushAutosave().finally(onClose);
            }
          }}
          style={[styles.backButton, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: colors.border }]}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <Text pointerEvents="none" style={[styles.headerTitle, { color: colors.textMuted }]}>
          {isDraft ? 'NEW TASK' : 'TASK DETAILS'}
        </Text>

        {isDraft ? (
          <TouchableOpacity
            onPress={handleSaveDraft}
            disabled={!titleValue.trim()}
            style={[
              styles.saveTopBtn,
              { backgroundColor: titleValue.trim() ? '#0078d4' : isDarkMode ? '#3f3f46' : '#cbd5e1' }
            ]}
            activeOpacity={0.8}
            accessibilityLabel="Save Task"
          >
            <Text style={styles.saveTopBtnText}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={confirmDelete}
            style={styles.deleteIconButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Delete task"
          >
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Autosave Status Indicator (shows loader if API takes > 1s, then shows success / failure) */}
      {showFeedback && feedbackType && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 2,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 20,
              backgroundColor:
                feedbackType === 'loading'
                  ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
                  : feedbackType === 'success'
                  ? (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4')
                  : (isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
              borderWidth: 1,
              borderColor:
                feedbackType === 'loading'
                  ? (isDarkMode ? '#1e3a8a' : '#bfdbfe')
                  : feedbackType === 'success'
                  ? (isDarkMode ? '#065f46' : '#bbf7d0')
                  : (isDarkMode ? '#991b1b' : '#fecaca'),
            }}
          >
            {feedbackType === 'loading' && (
              <>
                <ActivityIndicator size="small" color="#0078d4" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0078d4' }}>
                  Saving changes…
                </Text>
              </>
            )}
            {feedbackType === 'success' && (
              <>
                <Check size={14} color="#10b981" strokeWidth={3} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#10b981' }}>
                  Saved
                </Text>
              </>
            )}
            {feedbackType === 'error' && (
              <>
                <AlertCircle size={14} color="#ef4444" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>
                  Save failed
                </Text>
              </>
            )}
          </View>
        </View>
      )}

      {/* Scrollable Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 120 }
          ]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
        {/* Task title card */}
        <View
          style={[
            styles.card,
            styles.titleCardRow,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          {!isDraft && (
            <TouchableOpacity
              onPress={handleToggleComplete}
              style={styles.checkTouch}
              activeOpacity={0.7}
            >
              {isDone ? (
                <View style={[styles.checkboxBox, styles.checkboxBoxDone]}>
                  <Check size={14} color="#ffffff" strokeWidth={3} />
                </View>
              ) : (
                <View style={[styles.checkboxBox, { borderColor: isDarkMode ? '#64748b' : '#94a3b8' }]} />
              )}
            </TouchableOpacity>
          )}
          <TextInput
            value={titleValue}
            onChangeText={handleTitleChange}
            placeholder={isDraft ? "What needs to be done?" : "Task title..."}
            placeholderTextColor={colors.textMuted}
            autoFocus={isDraft}
            onFocus={() => setIsTitleFocused(true)}
            onBlur={() => {
              setIsTitleFocused(false);
              void flushAutosave();
            }}
            style={[
              styles.titleInput,
              { color: colors.text },
              isTitleFocused && [
                styles.titleInputFocused,
                {
                  borderColor: '#0078d4',
                  backgroundColor: isDarkMode
                    ? 'rgba(0, 120, 212, 0.12)'
                    : 'rgba(0, 120, 212, 0.05)'
                }
              ],
              isDone && [styles.titleInputDone, { color: colors.textMuted }]
            ]}
          />
        </View>

        {/* Lists Membership Card (Many-to-Many) */}
        <TouchableOpacity
          onPress={() => setShowListsModal(true)}
          style={[
            styles.card,
            styles.cardRow,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.pickerIconWrap,
              { backgroundColor: isDarkMode ? 'rgba(0, 120, 212, 0.18)' : 'rgba(0, 120, 212, 0.1)' }
            ]}
          >
            <ListTodo size={20} color="#0078d4" />
          </View>

          <View style={styles.pickerTextWrap}>
            <Text style={styles.cardSectionLabel}>LISTS</Text>
            <View style={styles.listChipsWrap}>
              {effectiveLists.length > 0 ? (
                effectiveLists.map((l) => (
                  <View
                    key={l.id}
                    style={[
                      styles.listChip,
                      { backgroundColor: isDarkMode ? 'rgba(0, 120, 212, 0.2)' : 'rgba(0, 120, 212, 0.1)', borderColor: 'rgba(0, 120, 212, 0.3)' }
                    ]}
                  >
                    <View style={[styles.listChipDot, { backgroundColor: l.color_theme || '#0078d4' }]} />
                    <Text style={[styles.listChipText, { color: '#0078d4' }]} numberOfLines={1}>
                      {l.title}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.pickerValueText, { color: colors.textMuted }]}>
                  No lists selected (Tap to assign)
                </Text>
              )}
            </View>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Assignee Card */}
        <TouchableOpacity
          onPress={() => setShowAssigneeModal(true)}
          style={[
            styles.card,
            styles.cardRow,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
          activeOpacity={0.7}
        >
          {assignedUser ? (
            <Image
              source={{
                uri:
                  assignedUser.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(assignedUser.name)}`
              }}
              style={styles.assigneeAvatar}
            />
          ) : (
            <View
              style={[
                styles.assigneePlaceholder,
                { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }
              ]}
            >
              <UserIcon size={18} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.assigneeInfo}>
            <Text style={styles.cardSectionLabel}>ASSIGNEE</Text>
            <Text
              style={[
                styles.assigneeNameText,
                { color: assignedUser ? colors.text : colors.textMuted }
              ]}
              numberOfLines={1}
            >
              {assignedUser
                ? `${assignedUser.name} (${assignedUser.phone})`
                : 'Unassigned (Tap to assign contact...)'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Steps Checklist Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          <View style={styles.stepsHeaderRow}>
            <Text style={styles.cardSectionLabel}>
              STEPS CHECKLIST ({completedStepsCount}/{effectiveSubtasks.length})
            </Text>
            {effectiveSubtasks.length > 0 && (
              <View style={styles.percentBadge}>
                <Text style={styles.percentText}>
                  {Math.round((completedStepsCount / effectiveSubtasks.length) * 100)}% Done
                </Text>
              </View>
            )}
          </View>

          {/* Subtasks List */}
          <View style={styles.stepsList}>
            {effectiveSubtasks.map((step) => {
              const stepDone = Boolean(step.is_completed);
              return (
                <View
                  key={step.id}
                  style={[
                    styles.stepRow,
                    { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleToggleStep(step)}
                    style={styles.stepCheckTouch}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Toggle step"
                  >
                    {stepDone ? (
                      <CheckSquare size={20} color="#0078d4" />
                    ) : (
                      <Square size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  <TextInput
                    value={step.title}
                    onChangeText={(text) => handleUpdateStepTitle(step.id, text)}
                    placeholder="Step name..."
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.stepTitle,
                      { color: colors.text },
                      stepDone && [styles.stepTitleDone, { color: colors.textMuted }]
                    ]}
                  />

                  <TouchableOpacity
                    onPress={() => handleDeleteStep(step.id)}
                    style={styles.stepDeleteTouch}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Delete step"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Add Step Input */}
          <View
            style={[
              styles.addStepRow,
              {
                backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0'
              }
            ]}
          >
            <View
              style={[
                styles.addStepIconWrap,
                { backgroundColor: isDarkMode ? 'rgba(0, 120, 212, 0.2)' : 'rgba(0, 120, 212, 0.12)' }
              ]}
            >
              <Plus size={15} color="#0078d4" />
            </View>
            <TextInput
              placeholder="Add next step..."
              placeholderTextColor={colors.textMuted}
              value={newStepTitle}
              onChangeText={setNewStepTitle}
              onSubmitEditing={handleAddStep}
              returnKeyType="done"
              style={[styles.addStepInput, { color: colors.text }]}
            />
            {newStepTitle.trim().length > 0 && (
              <TouchableOpacity onPress={handleAddStep} style={styles.addStepBtn} activeOpacity={0.8}>
                <Text style={styles.addStepBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Due Date & Reminder Pickers */}
        <View style={styles.pickersContainer}>
          {/* Due Date Card */}
          <TouchableOpacity
            onPress={handleOpenDueDate}
            style={[
              styles.card,
              styles.pickerRow,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View
              style={[
                styles.pickerIconWrap,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(0, 120, 212, 0.18)'
                    : 'rgba(0, 120, 212, 0.1)'
                }
              ]}
            >
              <CalendarIcon size={22} color="#0078d4" />
            </View>
            <View style={styles.pickerTextWrap}>
              <Text style={styles.cardSectionLabel}>DUE DATE</Text>
              <Text
                style={[
                  styles.pickerValueText,
                  { color: effectiveDueDate ? colors.text : colors.textMuted }
                ]}
              >
                {formatDisplayDueDate(effectiveDueDate || null)}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Reminder Time Card */}
          <TouchableOpacity
            onPress={handleOpenReminderTime}
            style={[
              styles.card,
              styles.pickerRow,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View
              style={[
                styles.pickerIconWrap,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(0, 120, 212, 0.18)'
                    : 'rgba(0, 120, 212, 0.1)'
                }
              ]}
            >
              <Clock size={22} color="#0078d4" />
            </View>
            <View style={styles.pickerTextWrap}>
              <Text style={styles.cardSectionLabel}>REMINDER TIME</Text>
              <Text
                style={[
                  styles.pickerValueText,
                  { color: effectiveReminderTime ? colors.text : colors.textMuted }
                ]}
              >
                {formatDisplayReminder(effectiveReminderTime || null)}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* WhatsApp Direct Action Button (Only for existing saved tasks) */}
        {!isDraft && (
          <TouchableOpacity
            onPress={() =>
              onOpenWhatsAppModal({
                type: 'single',
                taskId: task.id,
                recipientUserId: task.assigned_to_user_id
              })
            }
            style={styles.whatsappActionBtn}
            activeOpacity={0.8}
          >
            <WhatsAppIcon size={20} color="#ffffff" />
            <Text style={styles.whatsappActionText}>Send WhatsApp Reminder</Text>
          </TouchableOpacity>
        )}

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <View style={styles.notesSectionHeader}>
            <Text style={[styles.notesSectionTitle, { color: colors.textMuted }]}>NOTES</Text>
          </View>
          <TextInput
            placeholder="Add detailed notes for this task..."
            placeholderTextColor={colors.textMuted}
            value={notesValue}
            onChangeText={handleNotesChange}
            onBlur={() => void flushAutosave()}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              styles.notesInputCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text
              }
            ]}
          />
        </View>

        {/* Bottom Save Action for Draft Task */}
        {isDraft && (
          <TouchableOpacity
            onPress={handleSaveDraft}
            disabled={!titleValue.trim()}
            style={[
              styles.createTaskBottomBtn,
              { backgroundColor: titleValue.trim() ? '#0078d4' : isDarkMode ? '#3f3f46' : '#cbd5e1' }
            ]}
            activeOpacity={0.85}
          >
            <Text style={styles.createTaskBottomBtnText}>Create Task</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>

      {/* Lists Multi-Select Selection Modal */}
      <Modal
        visible={showListsModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowListsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowListsModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.modalCardLarge,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ListTodo size={20} color="#0078d4" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Manage Lists
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowListsModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {lists.length === 0 ? (
                <View style={styles.emptySearchWrap}>
                  <Text style={[styles.emptySearchText, { color: colors.textMuted }]}>
                    No lists available. Create a list from the lists page.
                  </Text>
                </View>
              ) : (
                lists.map((l) => {
                  const isSelected = effectiveListIds.includes(Number(l.id));
                  const themeColor = l.color_theme || '#0078d4';

                  return (
                    <TouchableOpacity
                      key={l.id}
                      onPress={() => handleToggleList(l.id)}
                      style={[
                        styles.modalListItemRow,
                        {
                          backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                          borderColor: isSelected ? '#0078d4' : colors.border
                        },
                        isSelected && {
                          borderWidth: 1.5,
                          backgroundColor: isDarkMode ? 'rgba(0, 120, 212, 0.15)' : 'rgba(0, 120, 212, 0.08)'
                        }
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View
                          style={[
                            styles.checkboxBox,
                            isSelected
                              ? styles.checkboxBoxDone
                              : { borderColor: isDarkMode ? '#64748b' : '#94a3b8' }
                          ]}
                        >
                          {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                        </View>
                        <View style={[styles.listColorIndicator, { backgroundColor: themeColor }]} />
                        <Text style={[styles.modalListItemText, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                          {l.title}
                        </Text>
                      </View>
                      {Boolean(l.pending_task_count) && (
                        <Text style={{ fontSize: fontSizes.caption, color: colors.textMuted, fontWeight: '600' }}>
                          {l.pending_task_count} tasks
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowListsModal(false)}
              style={styles.doneModalBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.doneModalBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Assignee Selection Modal with Custom Search Box */}
      <Modal
        visible={showAssigneeModal}
        transparent
        animationType="none"
        onRequestClose={() => {
          setShowAssigneeModal(false);
          setAssigneeSearchQuery('');
        }}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => {
            setShowAssigneeModal(false);
            setAssigneeSearchQuery('');
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.modalCardLarge,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Assign Contact
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAssigneeModal(false);
                  setAssigneeSearchQuery('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Custom Search Box */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                paddingHorizontal: 10,
                height: 44,
                marginBottom: 12,
                gap: 8,
                backgroundColor: isDarkMode ? '#18181b' : '#f8fafc'
              }}
            >
              <Search size={16} color={colors.textMuted} />
              <TextInput
                placeholder="Search by name, phone, or email..."
                placeholderTextColor={colors.textMuted}
                value={assigneeSearchQuery}
                onChangeText={setAssigneeSearchQuery}
                style={{ flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' }}
              />
            </View>

            <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                onPress={() => handleSelectAssignee(null)}
                style={[
                  styles.assigneeOption,
                  !effectiveAssigneeId && styles.assigneeOptionActive
                ]}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>
                  🚫 Unassign Task
                </Text>
              </TouchableOpacity>

              {(users || [])
                .filter((u) => {
                  const q = (assigneeSearchQuery || '').toLowerCase().trim();
                  if (!q) return true;
                  return Boolean(
                    u && (
                      (u.name && typeof u.name === 'string' && u.name.toLowerCase().includes(q)) ||
                      (u.phone && typeof u.phone === 'string' && u.phone.toLowerCase().includes(q)) ||
                      (u.email && typeof u.email === 'string' && u.email.toLowerCase().includes(q))
                    )
                  );
                })
                .map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    onPress={() => handleSelectAssignee(u.id)}
                    style={[
                      styles.assigneeOption,
                      effectiveAssigneeId === u.id && styles.assigneeOptionActive
                    ]}
                  >
                    <Image
                      source={{
                        uri:
                          u.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(u.name)}`
                      }}
                      style={styles.assigneeOptionAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.assigneeOptionName, { color: colors.text }]}>
                        {u.name}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: fontSizes.caption }}>
                        {u.phone} • {u.email}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modern Visual Due Date Picker Modal */}
      <Modal
        visible={showDatePickerModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDatePickerModal(false)}
        >
          <View
            style={[
              styles.modalCardLarge,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Set Due Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePickerModal(false)}
                style={{ padding: 4 }}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetButtonsRow}>
              <TouchableOpacity
                onPress={() => setQuickDueDate('today')}
                style={[styles.presetBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
              >
                <Text style={[styles.presetBtnText, { color: colors.text }]}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setQuickDueDate('tomorrow')}
                style={[styles.presetBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
              >
                <Text style={[styles.presetBtnText, { color: colors.text }]}>Tomorrow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setQuickDueDate('nextWeek')}
                style={[styles.presetBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
              >
                <Text style={[styles.presetBtnText, { color: colors.text }]}>Next Week</Text>
              </TouchableOpacity>
            </View>

            {/* Interactive Calendar Month Navigation */}
            <View style={styles.calendarMonthHeader}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                <ChevronLeft size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.calMonthTitle, { color: colors.text }]}>
                {monthName}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                <ChevronRight size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Day of Week Headers */}
            <View style={styles.weekDaysRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd) => (
                <Text key={wd} style={styles.weekDayText}>
                  {wd}
                </Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.daysGrid}>
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.dayCellEmpty} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const formatted = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = task.due_date === formatted;

                return (
                  <TouchableOpacity
                    key={`day-${dayNum}`}
                    onPress={() => handleSelectCalendarDay(dayNum)}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        { color: isSelected ? '#ffffff' : colors.text },
                        isSelected && { fontWeight: '800' }
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Clear Button */}
            {Boolean(task.due_date) && (
              <TouchableOpacity
                onPress={() => setQuickDueDate('clear')}
                style={styles.clearDateBtn}
              >
                <Text style={styles.clearDateBtnText}>Clear Due Date</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reminder Time Picker Modal */}
      <Modal
        visible={showReminderPickerModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowReminderPickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowReminderPickerModal(false)}
        >
          <View
            style={[
              styles.modalCardLarge,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Set Reminder Time
              </Text>
              <TouchableOpacity
                onPress={() => setShowReminderPickerModal(false)}
                style={{ padding: 4 }}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Reminder Presets */}
            <View style={styles.reminderPresetsList}>
              <TouchableOpacity
                onPress={() => setQuickReminder('laterToday')}
                style={[styles.reminderPresetRow, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }]}
              >
                <Clock size={16} color="#0078d4" />
                <Text style={[styles.reminderPresetText, { color: colors.text }]}>
                  Later Today (18:00)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setQuickReminder('tomorrowMorning')}
                style={[styles.reminderPresetRow, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }]}
              >
                <Clock size={16} color="#0078d4" />
                <Text style={[styles.reminderPresetText, { color: colors.text }]}>
                  Tomorrow Morning (09:00)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setQuickReminder('tomorrowEvening')}
                style={[styles.reminderPresetRow, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }]}
              >
                <Clock size={16} color="#0078d4" />
                <Text style={[styles.reminderPresetText, { color: colors.text }]}>
                  Tomorrow Evening (18:00)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setQuickReminder('nextWeek')}
                style={[styles.reminderPresetRow, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }]}
              >
                <Clock size={16} color="#0078d4" />
                <Text style={[styles.reminderPresetText, { color: colors.text }]}>
                  Next Week (Monday 09:00)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Time Selector */}
            <Text style={[styles.customTimeSectionTitle, { color: colors.textMuted }]}>
              OR SET SPECIFIC TIME
            </Text>
            <View style={styles.timeSelectorRow}>
              {/* Hours */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
                {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((hr) => (
                  <TouchableOpacity
                    key={hr}
                    onPress={() => setSelectedHour(hr)}
                    style={[
                      styles.timeChip,
                      selectedHour === hr && styles.timeChipActive
                    ]}
                  >
                    <Text style={[styles.timeChipText, selectedHour === hr && styles.timeChipTextActive]}>
                      {hr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.timeSelectorRow}>
              {/* Minutes */}
              {['00', '15', '30', '45'].map((min) => (
                <TouchableOpacity
                  key={min}
                  onPress={() => setSelectedMinute(min)}
                  style={[
                    styles.timeChip,
                    selectedMinute === min && styles.timeChipActive
                  ]}
                >
                  <Text style={[styles.timeChipText, selectedMinute === min && styles.timeChipTextActive]}>
                    :{min}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* AM / PM */}
              <View style={styles.amPmWrap}>
                <TouchableOpacity
                  onPress={() => setSelectedAmPm('AM')}
                  style={[styles.amPmBtn, selectedAmPm === 'AM' && styles.amPmBtnActive]}
                >
                  <Text style={[styles.amPmText, selectedAmPm === 'AM' && styles.amPmTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedAmPm('PM')}
                  style={[styles.amPmBtn, selectedAmPm === 'PM' && styles.amPmBtnActive]}
                >
                  <Text style={[styles.amPmText, selectedAmPm === 'PM' && styles.amPmTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.reminderActionsRow}>
              {Boolean(task.reminder_time) && (
                <TouchableOpacity
                  onPress={() => setQuickReminder('clear')}
                  style={styles.clearReminderBtn}
                >
                  <Text style={{ color: '#ef4444', fontWeight: '700' }}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSaveCustomReminder}
                style={styles.saveReminderBtn}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                  Set ({selectedHour}:{selectedMinute} {selectedAmPm})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    position: 'relative'
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 1
  },
  backText: {
    fontSize: fontSizes.small,
    fontWeight: '700',
    color: '#0078d4'
  },
  headerTitle: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    letterSpacing: 1,
    lineHeight: 16,
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0
  },
  deleteIconButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 40
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  titleCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 56
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  checkTouch: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  checkboxBoxDone: {
    backgroundColor: '#0078d4',
    borderColor: '#0078d4'
  },
  titleInput: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '700',
    paddingVertical: 5,
    paddingHorizontal: 8,
    margin: 0,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    includeFontPadding: false
  },
  titleInputFocused: {
    borderColor: '#0078d4'
  },
  titleInputDone: {
    textDecorationLine: 'line-through'
  },
  cardSectionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  assigneeAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19
  },
  assigneePlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  assigneeInfo: {
    flex: 1
  },
  assigneeNameText: {
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  stepsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  percentBadge: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  percentText: {
    color: '#ffffff',
    fontSize: fontSizes.caption,
    fontWeight: '800'
  },
  stepsList: {
    gap: 6
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14
  },
  stepCheckTouch: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepTitle: {
    flex: 1,
    fontSize: fontSizes.small,
    fontWeight: '600',
    paddingRight: 6
  },
  stepTitleDone: {
    textDecorationLine: 'line-through'
  },
  stepDeleteTouch: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1
  },
  addStepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addStepInput: {
    flex: 1,
    fontSize: fontSizes.small,
    fontWeight: '600',
    paddingVertical: 4
  },
  addStepBtn: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  addStepBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.caption,
    fontWeight: '700'
  },
  pickersContainer: {
    gap: 12
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    padding: 14,
    borderRadius: 20
  },
  pickerIconWrap: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pickerTextWrap: {
    flex: 1
  },
  pickerValueText: {
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  whatsappActionBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 16,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  whatsappActionText: {
    color: '#ffffff',
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  notesSection: {
    gap: 8
  },
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4
  },
  notesSectionTitle: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  autosaveStatus: {
    fontSize: fontSizes.caption,
    fontWeight: '700'
  },
  notesInputCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    fontSize: fontSizes.small,
    lineHeight: 22,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1
  },
  modalCardLarge: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  modalTitle: {
    fontSize: fontSizes.body,
    fontWeight: '800'
  },
  modalListItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10
  },
  modalListItemText: {
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  listColorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  assigneeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    marginBottom: 4
  },
  assigneeOptionActive: {
    backgroundColor: 'rgba(0, 120, 212, 0.12)'
  },
  assigneeOptionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  assigneeOptionName: {
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  presetBtnText: {
    fontSize: fontSizes.caption,
    fontWeight: '700'
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  calNavBtn: {
    padding: 6
  },
  calMonthTitle: {
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6
  },
  weekDayText: {
    width: 34,
    textAlign: 'center',
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: '#94a3b8'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 34
  },
  dayCell: {
    width: '14.28%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17
  },
  dayCellSelected: {
    backgroundColor: '#0078d4'
  },
  dayCellText: {
    fontSize: fontSizes.small,
    fontWeight: '600'
  },
  clearDateBtn: {
    marginTop: 14,
    paddingVertical: 8,
    alignItems: 'center'
  },
  clearDateBtnText: {
    color: '#ef4444',
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  reminderPresetsList: {
    gap: 8,
    marginBottom: 14
  },
  reminderPresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12
  },
  reminderPresetText: {
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  customTimeSectionTitle: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4
  },
  timeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 4
  },
  timeChipActive: {
    backgroundColor: '#0078d4'
  },
  timeChipText: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: '#64748b'
  },
  timeChipTextActive: {
    color: '#ffffff'
  },
  amPmWrap: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto'
  },
  amPmBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  amPmBtnActive: {
    backgroundColor: '#0078d4'
  },
  amPmText: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    color: '#64748b'
  },
  amPmTextActive: {
    color: '#ffffff'
  },
  reminderActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 14
  },
  clearReminderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  saveReminderBtn: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12
  },
  listChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4
  },
  listChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1
  },
  listChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  listChipText: {
    fontSize: fontSizes.caption,
    fontWeight: '700'
  },
  doneModalBtn: {
    backgroundColor: '#0078d4',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  doneModalBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.body,
    fontWeight: '700'
  },
  saveTopBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveTopBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  createTaskBottomBtn: {
    backgroundColor: '#0078d4',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#0078d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  createTaskBottomBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.body,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  emptySearchWrap: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptySearchText: {
    fontSize: fontSizes.small,
    textAlign: 'center',
    lineHeight: 20
  }
});
