import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  Alert,
  Linking,
  StatusBar,
  KeyboardAvoidingView,
  Modal,
  TouchableWithoutFeedback,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Trash2,
  Plus,
  Check,
  ListTodo,
  User as UserIcon,
  X,
  Search,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  UserCheck,
  UserX,
  Star,
  Users,
} from 'lucide-react-native';
import { WhatsAppIcon } from '../../src/components/WhatsAppIcon';
import { WhatsAppGroupModal } from '../../src/components/WhatsAppGroupModal';
import { useUiStore } from '../../src/store/useUiStore';
import {
  useTasksQuery,
  useTaskQuery,
  useListsQuery,
  useUsersQuery,
  useSubtasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAddSubtaskMutation,
  useUpdateSubtaskMutation,
  useDeleteSubtaskMutation,
  useAddUserMutation,
} from '../../src/hooks/useTodoQueries';
import { getTaskAutosaveLabel, useThrottledTaskAutosave } from '../../src/hooks/useThrottledTaskAutosave';
import {
  Task,
  User,
  List,
  formatSingleTaskMessage,
  generateWhatsAppDeepLink,
  generateWhatsAppWebLink,
  fuzzyMatch,
  getSearchMatchScore,
  getMultiFieldSearchScore,
  formatDueDateDisplay,
  formatDueDateDDMMYY,
  isTaskOverdue,
  getThemePrimary,
} from '@shared/todo';

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(0, 120, 212, ${alpha})`;
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface LocalStep {
  id: number;
  title: string;
  is_completed: number;
}

const AssigneePickerItem = React.memo(({
  user,
  isSelected,
  isDarkMode,
  themePrimary = '#0078d4',
  onSelect,
}: {
  user: User;
  isSelected: boolean;
  isDarkMode: boolean;
  themePrimary?: string;
  onSelect: (userId: number) => void;
}) => {
  return (
    <TouchableOpacity
      onPress={() => onSelect(user.id)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 54,
        borderRadius: 16,
        backgroundColor: isSelected
          ? (isDarkMode ? hexToRgba(themePrimary, 0.2) : hexToRgba(themePrimary, 0.08))
          : (isDarkMode ? '#27272a' : '#f8fafc'),
        borderWidth: 1,
        borderColor: isSelected
          ? themePrimary
          : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        {user.is_group ? (
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.2)' : '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} color="#25D366" />
          </View>
        ) : user.avatar ? (
          <Image source={{ uri: user.avatar }} style={{ width: 34, height: 34, borderRadius: 17 }} />
        ) : (
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: hexToRgba(themePrimary, 0.12), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: themePrimary, fontWeight: '800', fontSize: 13 }}>
              {user.name ? user.name.slice(0, 2).toUpperCase() : '??'}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }} numberOfLines={1}>
              {user.name}
            </Text>
            {Boolean(user.is_group) && (
              <View style={{ backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.2)' : '#dcfce7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#25D366' }}>Group</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 1 }}>
            {user.is_group ? 'WhatsApp Group' : (user.phone || 'No phone')}
          </Text>
        </View>
      </View>

      {isSelected && <Check size={18} color={themePrimary} />}
    </TouchableOpacity>
  );
});

const ListPickerItem = React.memo(({
  list,
  isSelected,
  isDarkMode,
  onToggle,
}: {
  list: List;
  isSelected: boolean;
  isDarkMode: boolean;
  onToggle: (listId: number) => void;
}) => {
  const listColor = list.color_theme || '#0078d4';
  return (
    <TouchableOpacity
      onPress={() => onToggle(list.id)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 54,
        borderRadius: 16,
        backgroundColor: isSelected
          ? (isDarkMode ? 'rgba(0, 120, 212, 0.15)' : '#eff6ff')
          : (isDarkMode ? '#27272a' : '#f8fafc'),
        borderWidth: 1,
        borderColor: isSelected
          ? '#0078d4'
          : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: listColor,
          }}
        />
        <Text
          style={{
            fontSize: 15,
            fontWeight: isSelected ? '700' : '600',
            color: isSelected
              ? (isDarkMode ? '#ffffff' : '#0078d4')
              : (isDarkMode ? '#ffffff' : '#0f172a'),
            flex: 1,
          }}
          numberOfLines={1}
        >
          {list.title}
        </Text>
      </View>

      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: isSelected ? '#0078d4' : (isDarkMode ? '#52525b' : '#94a3b8'),
          backgroundColor: isSelected ? '#0078d4' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
      </View>
    </TouchableOpacity>
  );
});

export default function TaskDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    listId?: string;
    isImportant?: string;
    view?: string;
    themeColor?: string;
    assignedToUserId?: string;
  }>();
  const isNewTask = params.id === 'new';
  const taskId = isNewTask ? 0 : Number(params.id);

  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const showConfirmDialog = useUiStore((s) => s.showConfirmDialog);
  const showAlertDialog = useUiStore((s) => s.showAlertDialog);

  const { data: directTask, isLoading: isDirectTaskLoading } = useTaskQuery(isNewTask ? null : taskId);
  const { data: tasks = [], isLoading: isTasksLoading } = useTasksQuery({});
  const { data: lists = [] } = useListsQuery();
  const { data: users = [] } = useUsersQuery();
  const { data: serverSubtasks = [] } = useSubtasksQuery(taskId);

  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const addSubtaskMutation = useAddSubtaskMutation();
  const updateSubtaskMutation = useUpdateSubtaskMutation();
  const deleteSubtaskMutation = useDeleteSubtaskMutation();

  const task = isNewTask ? null : (directTask || tasks.find((t) => t.id === taskId));

  const saveExistingTask = useCallback((updates: Partial<Task> & { id: number }) => (
    updateTaskMutation.mutateAsync(updates)
  ), [updateTaskMutation]);
  const {
    status: autosaveStatus,
    isSlowSaving,
    feedbackType,
    showFeedback,
    queueSave,
    flush: flushAutosave,
  } = useThrottledTaskAutosave({
    taskId: task?.id || null,
    enabled: !isNewTask && Boolean(task),
    save: saveExistingTask,
  });

  const shouldBeImportant = params.isImportant === '1' || params.view === 'important';
  const shouldBeAssignedToMe = params.view === 'assigned-to-me' || params.assignedToUserId === '1';

  // Form State
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [newStep, setNewStep] = useState('');
  const [localSteps, setLocalSteps] = useState<LocalStep[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<number[]>(params.listId ? [Number(params.listId)] : []);
  const [assignedUserId, setAssignedUserId] = useState<number | null>(shouldBeAssignedToMe ? 1 : (params.assignedToUserId ? Number(params.assignedToUserId) : null));
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isImportant, setIsImportant] = useState<boolean>(shouldBeImportant);

  // Modals & Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showListsModal, setShowListsModal] = useState(false);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [showWhatsAppGroupModal, setShowWhatsAppGroupModal] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');

  const addUserMutation = useAddUserMutation();
  const initializedTaskIdRef = useRef<number | string | null>(null);

  // Initialize state once per task identity
  useEffect(() => {
    if (isNewTask) {
      if (initializedTaskIdRef.current !== 'new') {
        initializedTaskIdRef.current = 'new';
        setTitle('');
        setNotes('');
        setLocalSteps([]);
        setIsCompleted(false);
        setIsImportant(shouldBeImportant);
        setAssignedUserId(shouldBeAssignedToMe ? 1 : (params.assignedToUserId ? Number(params.assignedToUserId) : null));
        setSelectedListIds(params.listId ? [Number(params.listId)] : []);
      }
    } else if (task && initializedTaskIdRef.current !== task.id) {
      initializedTaskIdRef.current = task.id;
      setTitle(task.title || '');
      setNotes(task.notes || '');
      setDueDate(task.due_date || null);
      setAssignedUserId(task.assigned_to_user_id || null);
      setIsCompleted(Boolean(task.is_completed));
      setIsImportant(Boolean(task.is_important));

      const initialListIds: number[] = Array.isArray(task.list_ids) && task.list_ids.length > 0
        ? task.list_ids
        : (Array.isArray(task.lists) && task.lists.length > 0
          ? task.lists.map((l: any) => l.id)
          : (task.list_id ? [task.list_id] : []));
      setSelectedListIds(initialListIds);
    }
  }, [isNewTask, task?.id, params.listId, shouldBeImportant, shouldBeAssignedToMe, params.assignedToUserId]);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isNewTask && value.trim()) queueSave({ title: value.trim() });
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (!isNewTask) queueSave({ notes: value || null });
  };

  const handleToggleComplete = () => {
    const nextValue = !isCompleted;
    setIsCompleted(nextValue);
    if (!isNewTask) queueSave({ is_completed: nextValue ? 1 : 0 });
  };

  const handleToggleImportant = () => {
    const nextValue = !isImportant;
    setIsImportant(nextValue);
    if (!isNewTask) queueSave({ is_important: nextValue ? 1 : 0 });
  };

  const handleToggleList = (targetListId: number) => {
    let nextListIds: number[];
    if (selectedListIds.includes(targetListId)) {
      nextListIds = selectedListIds.filter((id) => id !== targetListId);
    } else {
      nextListIds = [...selectedListIds, targetListId];
    }
    setSelectedListIds(nextListIds);

    if (!isNewTask && task) {
      queueSave({
        list_ids: nextListIds,
        list_id: nextListIds[0] || null,
      });
    }
  };

  const handleAddStep = async () => {
    if (!newStep.trim()) return;
    const stepTitle = newStep.trim();
    setNewStep('');

    if (isNewTask) {
      setLocalSteps((prev) => [
        ...prev,
        { id: Date.now(), title: stepTitle, is_completed: 0 },
      ]);
    } else if (task) {
      await addSubtaskMutation.mutateAsync({ taskId: task.id, title: stepTitle });
    }
  };

  const handleToggleStep = (stepId: number, currentCompleted: number | boolean) => {
    const nextCompleted = currentCompleted ? 0 : 1;
    if (isNewTask) {
      setLocalSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, is_completed: s.is_completed ? 0 : 1 } : s))
      );
    } else if (task) {
      updateSubtaskMutation.mutate({ id: stepId, taskId: task.id, is_completed: nextCompleted });
    }
  };

  const handleDeleteStep = (stepId: number) => {
    if (isNewTask) {
      setLocalSteps((prev) => prev.filter((s) => s.id !== stepId));
    } else if (task) {
      deleteSubtaskMutation.mutate({ id: stepId, taskId: task.id });
    }
  };

  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  const monthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  };
  const nextMonth = () => {
    setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));
  };

  const formatDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const setQuickDueDate = (type: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
    let dateStr: string | null = null;
    if (type !== 'clear') {
      const d = new Date();
      if (type === 'tomorrow') {
        d.setDate(d.getDate() + 1);
      } else if (type === 'nextWeek') {
        const day = d.getDay();
        const diff = d.getDate() + (day === 0 ? 1 : 8 - day);
        d.setDate(diff);
      }
      dateStr = formatDateString(d);
    }
    setDueDate(dateStr);
    if (!isNewTask && task) {
      queueSave({ due_date: dateStr });
    }
    setShowDatePicker(false);
  };

  const handleSelectCalendarDay = (day: number) => {
    const d = new Date(calendarYear, calendarMonth, day);
    const dateStr = formatDateString(d);
    setDueDate(dateStr);
    if (!isNewTask && task) {
      queueSave({ due_date: dateStr });
    }
    setShowDatePicker(false);
  };

  const handleSelectAssignee = (userId: number | null) => {
    setAssignedUserId(userId);
    setShowAssigneeModal(false);
    if (!isNewTask && task) {
      queueSave({ assigned_to_user_id: userId });
    }
  };

  const handleCreateWhatsAppGroup = async (groupName: string) => {
    try {
      const created = await addUserMutation.mutateAsync({
        name: groupName,
        phone: '',
        is_group: 1,
      });
      return created;
    } catch {
      return null;
    }
  };

  const handleSaveNewTask = async () => {
    if (!title.trim()) {
      showAlertDialog('Required', 'Please enter a task title.');
      return;
    }

    try {
      const created = await createTaskMutation.mutateAsync({
        title: title.trim(),
        notes: notes.trim() || undefined,
        due_date: dueDate || undefined,
        assigned_to_user_id: assignedUserId || undefined,
        list_id: selectedListIds[0] || null,
        list_ids: selectedListIds,
        is_important: isImportant ? 1 : 0,
        created_by: 1,
      });

      if (created?.id && localSteps.length > 0) {
        for (const step of localSteps) {
          await addSubtaskMutation.mutateAsync({
            taskId: created.id,
            title: step.title,
          });
        }
      }

      router.back();
    } catch {
      showAlertDialog('Error', 'Failed to create task.');
    }
  };

  const handleWhatsAppDirect = () => {
    if (!task) return;
    const assignee = users.find((u) => u.id === task.assigned_to_user_id);
    const targetPhone = assignee?.phone;
    if (!targetPhone) {
      const message = formatSingleTaskMessage(
        task,
        { name: assignee?.name || 'Contact', phone: '' },
        serverSubtasks
      );
      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`);
        }
      });
      return;
    }
    const message = formatSingleTaskMessage(
      task,
      { name: assignee?.name || 'Contact', phone: targetPhone },
      serverSubtasks
    );
    const deepLink = generateWhatsAppDeepLink(targetPhone, message);
    Linking.canOpenURL(deepLink).then((supported) => {
      if (supported) {
        Linking.openURL(deepLink);
      } else {
        Linking.openURL(generateWhatsAppWebLink(targetPhone, message));
      }
    });
  };

  const effectiveSteps = isNewTask ? localSteps : serverSubtasks;
  const completedSteps = effectiveSteps.filter((s) => s.is_completed).length;

  const selectedLists = lists.filter((l) => selectedListIds.includes(l.id));
  const primaryList = selectedLists[0] || (params.listId ? lists.find((l) => l.id === Number(params.listId)) : null);

  const activeThemeColor = useMemo(() => {
    if (params.themeColor) return params.themeColor;
    if (params.view === 'important' || params.isImportant === '1' || isImportant) return 'orange';
    if (params.view === 'assigned-to-me') return 'purple';
    if (primaryList?.color_theme) return primaryList.color_theme;
    if (task?.is_important) return 'orange';
    return 'blue';
  }, [params.themeColor, params.view, params.isImportant, isImportant, primaryList?.color_theme, task?.is_important]);

  const themePrimary = useMemo(() => {
    return getThemePrimary(activeThemeColor, isDarkMode);
  }, [activeThemeColor, isDarkMode]);

  const selectedListsSummary = selectedLists.length > 0
    ? selectedLists.map((l) => l.title).join(', ')
    : 'None (Tasks)';

  const filteredLists = useMemo(() => {
    const q = listSearchQuery.trim();
    if (!q) return lists;
    return lists
      .filter((l) => fuzzyMatch(l.title, q))
      .sort((a, b) => {
        const scoreA = getSearchMatchScore(a.title, q);
        const scoreB = getSearchMatchScore(b.title, q);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [lists, listSearchQuery]);

  const assignedUser = useMemo(() => users.find((u) => u.id === assignedUserId), [users, assignedUserId]);
  const assignedLabel = useMemo(() => {
    if (!assignedUserId) return 'Unassigned';
    if (assignedUserId === 1) return 'Self (You)';
    if (assignedUser?.is_group) return `${assignedUser.name} (Group)`;
    return assignedUser ? assignedUser.name : 'Assigned';
  }, [assignedUserId, assignedUser]);

  const existingGroups = useMemo(() => users.filter((u) => Boolean(u.is_group)), [users]);
  const contactUsers = useMemo(() => users.filter((u) => u.id !== 1), [users]);

  const filteredUsers = useMemo(() => {
    const q = assigneeSearchQuery.trim();
    if (!q) return contactUsers;
    return contactUsers
      .filter((u) => fuzzyMatch(u.name, q) || fuzzyMatch(u.phone, q))
      .sort((a, b) => {
        const scoreA = getMultiFieldSearchScore([a.name, a.phone], q);
        const scoreB = getMultiFieldSearchScore([b.name, b.phone], q);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [contactUsers, assigneeSearchQuery]);

  const isTaskLoading = !isNewTask && !task && (isDirectTaskLoading || isTasksLoading);

  if (isTaskLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#09090b' : '#f8fafc', alignItems: 'center', justifyContent: 'center', paddingTop: topInset }}>
        <ActivityIndicator size="large" color={themePrimary} />
      </View>
    );
  }

  if (!isNewTask && !task) {
    return (
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#09090b' : '#f8fafc', alignItems: 'center', justifyContent: 'center', paddingTop: topInset }}>
        <Text style={{ color: isDarkMode ? '#ffffff' : '#0f172a', fontWeight: '700' }}>Task not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12, padding: 8 }}>
          <Text style={{ color: themePrimary, fontWeight: '800' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#09090b' : '#f8fafc', paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 12) }}>
        {/* Header Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#27272a' : '#f1f5f9',
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (isNewTask) {
                router.back();
              } else {
                void flushAutosave().finally(() => router.back());
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            <ArrowLeft size={20} color={isDarkMode ? '#ffffff' : '#0f172a'} />
          </TouchableOpacity>

          <Text style={{ fontSize: 17, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
            {isNewTask ? 'New Task' : 'Task Details'}
          </Text>

          {isNewTask ? (
            <TouchableOpacity
              onPress={handleSaveNewTask}
              disabled={!title.trim()}
              activeOpacity={0.8}
              style={{
                backgroundColor: themePrimary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                minHeight: 40,
                borderRadius: 14,
                opacity: title.trim() ? 1 : 0.5,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Create</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                if (!task) return;
                showConfirmDialog({
                  title: 'Delete Task',
                  message: `Are you sure you want to delete "${task.title}"?`,
                  type: 'danger',
                  confirmLabel: 'Delete Task',
                  onConfirm: () => {
                    deleteTaskMutation.mutate(task.id);
                    router.back();
                  },
                });
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
              }}
            >
              <Trash2 size={18} color="#ef4444" />
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
                    ? (isDarkMode ? hexToRgba(themePrimary, 0.2) : hexToRgba(themePrimary, 0.08))
                    : feedbackType === 'success'
                    ? (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4')
                    : (isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
                borderWidth: 1,
                borderColor:
                  feedbackType === 'loading'
                    ? themePrimary
                    : feedbackType === 'success'
                    ? (isDarkMode ? '#065f46' : '#bbf7d0')
                    : (isDarkMode ? '#991b1b' : '#fecaca'),
              }}
            >
              {feedbackType === 'loading' && (
                <>
                  <ActivityIndicator size="small" color={themePrimary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: themePrimary }}>
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

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Task title card */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 16,
              minHeight: 60,
              borderRadius: 20,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            {!isNewTask && (
              <TouchableOpacity
                onPress={handleToggleComplete}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  borderWidth: 2,
                  borderColor: isCompleted ? themePrimary : (isDarkMode ? '#52525b' : '#94a3b8'),
                  backgroundColor: isCompleted ? themePrimary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isCompleted && <Check size={14} color="#ffffff" strokeWidth={3} />}
              </TouchableOpacity>
            )}

            <TextInput
              value={title}
              onChangeText={handleTitleChange}
              onBlur={() => void flushAutosave()}
              autoFocus={isNewTask}
              multiline
              placeholder="What would you like to do?"
              placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: '700',
                color: isDarkMode ? '#ffffff' : '#0f172a',
                textDecorationLine: isCompleted ? 'line-through' : 'none',
              }}
            />

            <TouchableOpacity
              onPress={handleToggleImportant}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isImportant
                  ? (isDarkMode ? 'rgba(249, 115, 22, 0.2)' : '#fff7ed')
                  : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Star
                size={22}
                color={isImportant ? '#f97316' : (isDarkMode ? '#71717a' : '#94a3b8')}
                fill={isImportant ? '#f97316' : 'transparent'}
              />
            </TouchableOpacity>
          </View>

          {/* Steps Checklist */}
          <View
            style={{
              padding: 16,
              borderRadius: 20,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Steps ({completedSteps}/{effectiveSteps.length})
              </Text>
            </View>

            {effectiveSteps.map((step) => (
              <View
                key={step.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 40,
                  paddingVertical: 4,
                }}
              >
                <TouchableOpacity
                  onPress={() => handleToggleStep(step.id, step.is_completed)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: step.is_completed ? themePrimary : (isDarkMode ? '#52525b' : '#94a3b8'),
                      backgroundColor: step.is_completed ? themePrimary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {Boolean(step.is_completed) && <Check size={12} color="#ffffff" strokeWidth={3} />}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: isDarkMode ? '#ffffff' : '#0f172a',
                      textDecorationLine: step.is_completed ? 'line-through' : 'none',
                    }}
                  >
                    {step.title}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteStep(step.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ padding: 6 }}
                >
                  <Trash2 size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42, marginTop: 4 }}>
              <Plus size={18} color={themePrimary} />
              <TextInput
                placeholder="Add next step..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                value={newStep}
                onChangeText={setNewStep}
                onSubmitEditing={handleAddStep}
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: isDarkMode ? '#ffffff' : '#0f172a',
                }}
              />
            </View>
          </View>

          {/* Lists Trigger Card - 60px Min Height */}
          <TouchableOpacity
            onPress={() => {
              setListSearchQuery('');
              setShowListsModal(true);
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              minHeight: 60,
              borderRadius: 20,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 8 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: hexToRgba(themePrimary, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                <ListTodo size={20} color={themePrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Lists
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: selectedListIds.length > 0
                      ? (isDarkMode ? '#ffffff' : '#0f172a')
                      : (isDarkMode ? '#a1a1aa' : '#64748b'),
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {selectedListsSummary}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  backgroundColor: selectedListIds.length > 0
                    ? (isDarkMode ? hexToRgba(themePrimary, 0.2) : hexToRgba(themePrimary, 0.08))
                    : (isDarkMode ? '#27272a' : '#f1f5f9'),
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: selectedListIds.length > 0 ? themePrimary : (isDarkMode ? '#71717a' : '#94a3b8') }}>
                  {selectedListIds.length}
                </Text>
              </View>
              <ChevronRight size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} />
            </View>
          </TouchableOpacity>

          {/* Assign To Contact Card - 60px Min Height */}
          <TouchableOpacity
            onPress={() => {
              setAssigneeSearchQuery('');
              setShowAssigneeModal(true);
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              minHeight: 60,
              borderRadius: 20,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: hexToRgba(themePrimary, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                <UserIcon size={20} color={themePrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase' }}>
                  Assign To
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: assignedUserId ? themePrimary : (isDarkMode ? '#71717a' : '#94a3b8'), marginTop: 2 }}>
                  {assignedLabel}
                </Text>
              </View>
            </View>

            {assignedUserId ? (
              <TouchableOpacity
                onPress={() => handleSelectAssignee(null)}
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
            ) : (
              <ChevronRight size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} />
            )}
          </TouchableOpacity>

          {/* Due Date - 60px Min Height */}
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              minHeight: 60,
              borderRadius: 20,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            {(() => {
              const dueInfo = formatDueDateDisplay(dueDate, task?.is_completed);
              const isOverdue = dueInfo?.isOverdue;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.15)' : hexToRgba(themePrimary, 0.12),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Calendar size={20} color={isOverdue ? '#ef4444' : themePrimary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isOverdue ? '#ef4444' : (isDarkMode ? '#a1a1aa' : '#64748b'), textTransform: 'uppercase' }}>
                      {isOverdue ? 'Due Date (Overdue)' : 'Due Date'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isOverdue ? '#ef4444' : (dueDate ? themePrimary : (isDarkMode ? '#71717a' : '#94a3b8')), marginTop: 2 }}>
                      {dueInfo?.label || 'Set due date'}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {dueDate ? (
              <TouchableOpacity
                onPress={() => {
                  setDueDate(null);
                  if (!isNewTask) queueSave({ due_date: null });
                }}
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
            ) : (
              <ChevronRight size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} />
            )}
          </TouchableOpacity>

          {/* Notes */}
          <View
            style={{
              padding: 16,
              borderRadius: 20,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#a1a1aa' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Notes
            </Text>
            <TextInput
              placeholder="Add detailed notes..."
              placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
              value={notes}
              onChangeText={handleNotesChange}
              onBlur={() => void flushAutosave()}
              multiline
              numberOfLines={4}
              style={{
                fontSize: 14,
                color: isDarkMode ? '#ffffff' : '#0f172a',
                minHeight: 80,
                textAlignVertical: 'top',
              }}
            />
          </View>
        </ScrollView>

        {/* Lists Selection Modal Dialog */}
        <Modal
          visible={showListsModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowListsModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowListsModal(false)}>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
              }}
            >
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  style={{
                    width: '100%',
                    maxHeight: '80%',
                    backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                    borderRadius: 24,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View>
                      <Text style={{ fontSize: 19, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        Select Lists
                      </Text>
                      <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                        Choose which lists this task belongs to
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowListsModal(false)}
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

                  <View
                    style={{
                      height: 50,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      marginBottom: 12,
                    }}
                  >
                    <Search size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Search lists..."
                      placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                      value={listSearchQuery}
                      onChangeText={setListSearchQuery}
                      style={{
                        flex: 1,
                        height: '100%',
                        fontSize: 15,
                        fontWeight: '600',
                        color: isDarkMode ? '#ffffff' : '#0f172a',
                      }}
                    />
                  </View>

                  <FlatList
                    data={filteredLists}
                    keyExtractor={(l) => String(l.id)}
                    initialNumToRender={15}
                    maxToRenderPerBatch={15}
                    windowSize={7}
                    removeClippedSubviews={Platform.OS === 'android'}
                    style={{ maxHeight: 280 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <ListPickerItem
                        list={item}
                        isSelected={selectedListIds.includes(item.id)}
                        isDarkMode={isDarkMode}
                        onToggle={handleToggleList}
                      />
                    )}
                  />

                  <TouchableOpacity
                    onPress={() => setShowListsModal(false)}
                    activeOpacity={0.8}
                    style={{
                      marginTop: 18,
                      backgroundColor: themePrimary,
                      height: 52,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>Done</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Assignee Selection Modal */}
        <Modal
          visible={showAssigneeModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowAssigneeModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowAssigneeModal(false)}>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
              }}
            >
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  style={{
                    width: '100%',
                    maxHeight: '80%',
                    backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                    borderRadius: 24,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View>
                      <Text style={{ fontSize: 19, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        Assign Contact
                      </Text>
                      <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                        Assign this task to a teammate or contact
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowAssigneeModal(false)}
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

                  <View
                    style={{
                      height: 50,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      marginBottom: 12,
                    }}
                  >
                    <Search size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Search contacts..."
                      placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
                      value={assigneeSearchQuery}
                      onChangeText={setAssigneeSearchQuery}
                      style={{
                        flex: 1,
                        height: '100%',
                        fontSize: 15,
                        fontWeight: '600',
                        color: isDarkMode ? '#ffffff' : '#0f172a',
                      }}
                    />
                  </View>

                  <FlatList
                    data={filteredUsers}
                    keyExtractor={(u) => String(u.id)}
                    initialNumToRender={15}
                    maxToRenderPerBatch={15}
                    windowSize={7}
                    removeClippedSubviews={Platform.OS === 'android'}
                    style={{ maxHeight: 280 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={
                      <View style={{ gap: 8, marginBottom: 8 }}>
                        {/* Self Option (First Option with Distinctive Styling) */}
                        <TouchableOpacity
                          onPress={() => handleSelectAssignee(1)}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            minHeight: 56,
                            borderRadius: 16,
                            backgroundColor: assignedUserId === 1
                              ? (isDarkMode ? hexToRgba(themePrimary, 0.25) : hexToRgba(themePrimary, 0.12))
                              : (isDarkMode ? '#27272a' : '#f1f5f9'),
                            borderWidth: 1.5,
                            borderColor: assignedUserId === 1
                              ? themePrimary
                              : (isDarkMode ? '#3f3f46' : '#cbd5e1'),
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
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
                              <UserCheck size={20} color={themePrimary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 15, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                                  Self
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
                                Assign task to yourself
                              </Text>
                            </View>
                          </View>

                          {assignedUserId === 1 && <Check size={18} color={themePrimary} strokeWidth={3} />}
                        </TouchableOpacity>

                        {/* WhatsApp Group Option */}
                        <TouchableOpacity
                          onPress={() => {
                            setShowAssigneeModal(false);
                            setShowWhatsAppGroupModal(true);
                          }}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            minHeight: 56,
                            borderRadius: 16,
                            backgroundColor: assignedUser?.is_group
                              ? (isDarkMode ? 'rgba(37, 211, 102, 0.22)' : '#ecfdf5')
                              : (isDarkMode ? '#27272a' : '#f1f5f9'),
                            borderWidth: 1.5,
                            borderColor: assignedUser?.is_group ? '#25D366' : (isDarkMode ? '#3f3f46' : '#cbd5e1'),
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.25)' : '#dcfce7',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Users size={20} color="#25D366" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 15, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                                  WhatsApp Group
                                </Text>
                                <View
                                  style={{
                                    backgroundColor: 'rgba(37, 211, 102, 0.2)',
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#25D366' }}>
                                    Group
                                  </Text>
                                </View>
                              </View>
                              <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 1 }}>
                                {assignedUser?.is_group ? `Selected: ${assignedUser.name}` : 'Assign to a team or group'}
                              </Text>
                            </View>
                          </View>

                          {Boolean(assignedUser?.is_group) && <Check size={18} color="#25D366" strokeWidth={3} />}
                        </TouchableOpacity>

                        {/* Unassigned Option */}
                        <TouchableOpacity
                          onPress={() => handleSelectAssignee(null)}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            minHeight: 48,
                            borderRadius: 16,
                            backgroundColor: assignedUserId === null
                              ? (isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2')
                              : (isDarkMode ? '#27272a' : '#f8fafc'),
                            borderWidth: 1,
                            borderColor: assignedUserId === null
                              ? '#ef4444'
                              : (isDarkMode ? '#3f3f46' : '#e2e8f0'),
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <UserX size={16} color={assignedUserId === null ? '#ef4444' : (isDarkMode ? '#a1a1aa' : '#64748b')} />
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: assignedUserId === null ? '#ef4444' : (isDarkMode ? '#ffffff' : '#0f172a') }}>
                              Unassigned
                            </Text>
                          </View>
                          {assignedUserId === null && <Check size={18} color="#ef4444" />}
                        </TouchableOpacity>
                      </View>
                    }
                    renderItem={({ item }) => (
                      <AssigneePickerItem
                        user={item}
                        isSelected={assignedUserId === item.id}
                        isDarkMode={isDarkMode}
                        themePrimary={themePrimary}
                        onSelect={handleSelectAssignee}
                      />
                    )}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Custom Theme-Aware Due Date Selection Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
              }}
            >
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  style={{
                    width: '100%',
                    backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                    borderRadius: 24,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View>
                      <Text style={{ fontSize: 19, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                        Set Due Date
                      </Text>
                      <Text style={{ fontSize: 13, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 2 }}>
                        Pick a deadline for this task
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
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

                  {/* Quick Presets */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    {[
                      { label: 'Today', type: 'today' as const },
                      { label: 'Tomorrow', type: 'tomorrow' as const },
                      { label: 'Next Week', type: 'nextWeek' as const },
                    ].map((preset) => (
                      <TouchableOpacity
                        key={preset.type}
                        onPress={() => setQuickDueDate(preset.type)}
                        activeOpacity={0.7}
                        style={{
                          flex: 1,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Month Navigation Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 }}>
                    <TouchableOpacity
                      onPress={prevMonth}
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
                      <ChevronLeft size={20} color={isDarkMode ? '#ffffff' : '#0f172a'} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                      {monthName}
                    </Text>
                    <TouchableOpacity
                      onPress={nextMonth}
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
                      <ChevronRight size={20} color={isDarkMode ? '#ffffff' : '#0f172a'} />
                    </TouchableOpacity>
                  </View>

                  {/* Day of Week Headers */}
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd) => (
                      <View key={wd} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#71717a' : '#94a3b8' }}>
                          {wd}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Calendar Days Grid */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {Array.from({ length: firstDayIndex }).map((_, idx) => (
                      <View key={`empty-${idx}`} style={{ width: `${100 / 7}%`, height: 40 }} />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const formatted = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const isSelected = dueDate === formatted;

                      return (
                        <TouchableOpacity
                          key={`day-${dayNum}`}
                          onPress={() => handleSelectCalendarDay(dayNum)}
                          activeOpacity={0.7}
                          style={{
                            width: `${100 / 7}%`,
                            height: 40,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                backgroundColor: isSelected ? themePrimary : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: isSelected ? '800' : '600',
                                color: isSelected ? '#ffffff' : (isDarkMode ? '#ffffff' : '#0f172a'),
                              }}
                            >
                              {dayNum}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Clear Date Option (if set) */}
                  {Boolean(dueDate) && (
                    <TouchableOpacity
                      onPress={() => setQuickDueDate('clear')}
                      activeOpacity={0.7}
                      style={{
                        marginTop: 16,
                        height: 46,
                        borderRadius: 14,
                        backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#ef4444' }}>
                        Clear Due Date
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* WhatsApp Group Selection & Creation Modal */}
        <WhatsAppGroupModal
          visible={showWhatsAppGroupModal}
          onClose={() => setShowWhatsAppGroupModal(false)}
          onSelectGroup={(group) => {
            handleSelectAssignee(group.id);
          }}
          onCreateGroup={handleCreateWhatsAppGroup}
          existingGroups={existingGroups}
          isDarkMode={isDarkMode}
          themePrimary={themePrimary}
        />

        {/* WhatsApp Floating Action Button (Only for existing tasks) */}
        {!isNewTask && task && (
          <TouchableOpacity
            onPress={handleWhatsAppDirect}
            activeOpacity={0.85}
            style={{
              position: 'absolute',
              bottom: Math.max(insets.bottom + 20, 32),
              right: 20,
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: '#25D366',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#25D366',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.45,
              shadowRadius: 10,
              elevation: 6,
              zIndex: 50,
            }}
          >
            <WhatsAppIcon size={30} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
